"""
KAN-93 connectivity helpers shared by `manage.py db_ping` and the /health/ view.

Design notes (read before editing):
* We resolve the target from Django's configured DATABASES['default'] so the
  ping is literally "from the Backend settings" (the KAN-93 done-when wording),
  not a separately-hardcoded URI that could drift from what the app uses.
* The localhost default in settings.py is a TRAP: if MONGODB_URI is unset, the
  app silently talks to localhost and a naive ping would still print "ok".
  resolve_target() therefore flags local hosts, and callers refuse to report
  success against local unless allow_local=True is passed on purpose.
* Extra pymongo options (timeouts/retries/idle-recycle) are injected by
  REWRITING the URI query string rather than passing client kwargs. Reason:
  the precedence between URI options and kwargs, and the backend's option key,
  are not stable across django_mongodb_backend versions; a single rewritten URI
  removes the gamble. kwargs-vs-URI precedence never applies because we pass
  no conflicting kwargs.
* Credentials are never returned by any function here. sanitize() strips the
  userinfo so logs/JSON can show the cluster host without leaking the password.
"""
from __future__ import annotations

import time
from urllib.parse import parse_qsl, urlencode

from django.conf import settings

# Safety params we force into the URI. Values chosen so a hung/paused Atlas M0
# fails FAST in /health (must not block a health probe) but db_ping can wait a
# little longer for an M0 wake-up before we classify it.
HEALTH_TIMEOUTS = {
    "serverSelectionTimeoutMS": "2000",
    "connectTimeoutMS": "2000",
    "socketTimeoutMS": "3000",
    "retryWrites": "true",
    "retryReads": "true",
    "maxIdleTimeMS": "30000",   # recycle idle sockets -> kills the "first hit
                                # after idle gets WinError 10054" pattern
}
PING_TIMEOUTS = dict(HEALTH_TIMEOUTS, serverSelectionTimeoutMS="15000")

_LOCAL_TOKENS = ("localhost", "127.", "::1")


def _configured_uri() -> str:
    cfg = settings.DATABASES["default"]
    # Their settings.py stores the full URI in HOST (NAME is the db). Tolerate a
    # couple of alternative placements, but never invent a host.
    uri = cfg.get("HOST") or cfg.get("URI") or ""
    if isinstance(uri, str) and (uri.lower().startswith("mongodb://") or uri.lower().startswith("mongodb+srv://")):
        return uri
    # Fall back to env the same way settings does, so a mis-set settings dict
    # still surfaces the real target instead of silently becoming localhost.
    import os
    env = os.environ.get("MONGODB_URI", "")
    if env.lower().startswith("mongodb"):
        return env
    raise RuntimeError(
        "Could not resolve a mongodb URI from settings.DATABASES['default'] "
        "or $MONGODB_URI. Refusing to guess (guessing = the localhost trap)."
    )


def _split_uri(uri: str):
    """Return (is_srv, userinfo, hostlist, dbname, query_str).

    Splits authority on the LAST '@' so a password containing '@' is handled
    correctly (naive split('@')[1] would truncate at the password's '@')."""
    low = uri.lower()
    if not (low.startswith("mongodb://") or low.startswith("mongodb+srv://")):
        raise ValueError("not a mongodb URI")
    is_srv = low.startswith("mongodb+srv://")
    rest = uri.split("://", 1)[1]
    cut = len(rest)
    for ch in ("/", "?"):
        i = rest.find(ch)
        if i != -1 and i < cut:
            cut = i
    authority, after = rest[:cut], rest[cut:]
    q = after.find("?")
    path_part = after[:q] if q != -1 else after
    query = after[q + 1:] if q != -1 else ""
    dbname = path_part[1:] if path_part.startswith("/") else path_part
    if "@" in authority:
        userinfo, hostlist = authority.rsplit("@", 1)
    else:
        userinfo, hostlist = "", authority
    return is_srv, userinfo, hostlist, dbname, query


def _is_local(hostlist: str) -> bool:
    h = hostlist.lower()
    return any(tok in h for tok in _LOCAL_TOKENS)


def _rewrite_query(query: str, overrides: dict) -> str:
    pairs = dict(parse_qsl(query, keep_blank_values=True))
    pairs.update(overrides)  # our safety params win
    return urlencode(pairs)


def _rebuild(is_srv, userinfo, hostlist, dbname, query) -> str:
    scheme = "mongodb+srv" if is_srv else "mongodb"
    auth = (userinfo + "@") if userinfo else ""
    path = ("/" + dbname) if dbname else ""
    qs = ("?" + query) if query else ""
    return f"{scheme}://{auth}{hostlist}{path}{qs}"


def resolve_target(allow_local: bool = False) -> dict:
    """Resolve + sanitize the configured target; raise on the localhost trap."""
    uri = _configured_uri()
    is_srv, userinfo, hostlist, dbname, query = _split_uri(uri)
    local = _is_local(hostlist)
    if local and not allow_local:
        raise RuntimeError(
            "Resolved target is LOCALHOST (%s). This is the settings.py default "
            "fallback, NOT the live cluster. Set MONGODB_URI in .env to the live "
            "+srv URI (copy .env.example). Pass --allow-local only if you really "
            "mean to test a local mongod." % hostlist
        )
    tls_disabled = "tls=false" in uri.lower()
    cfg = settings.DATABASES["default"]
    return {
        "uri": uri,                      # internal use only; never returned to clients
        "is_srv": is_srv,
        "cluster": hostlist,             # cred-stripped
        "database": dbname or cfg.get("NAME", ""),
        "atlas": bool(is_srv) and not local,
        "local": local,
        "tls": "implied-by-srv" if is_srv else ("DISABLED(!)" if tls_disabled else "explicit/unset"),
        "tls_disabled_warning": tls_disabled,
    }


def _hardened_uri(target: dict, timeouts: dict) -> str:
    is_srv, userinfo, hostlist, dbname, query = _split_uri(target["uri"])
    return _rebuild(is_srv, userinfo, hostlist, dbname, _rewrite_query(query, timeouts))


def ping(allow_local: bool = False, timeouts: dict | None = None) -> dict:
    """Ping the configured cluster. Returns a structured result; never raises
    for connection problems (callers format human vs json themselves)."""
    from pymongo import MongoClient
    from pymongo.errors import PyMongoError

    timeouts = timeouts or HEALTH_TIMEOUTS
    try:
        target = resolve_target(allow_local=allow_local)
    except RuntimeError as e:
        return {"ok": False, "stage": "resolve", "error": str(e), "hint": classify(e)}

    uri = _hardened_uri(target, timeouts)
    t0 = time.perf_counter()
    client = None
    try:
        client = MongoClient(uri)  # single source of truth: the rewritten URI
        client.admin.command("ping")
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)
        try:
            info = client.server_info()
            version = info.get("version", "?")
        except Exception:
            version = "?"
        return {"ok": True, "latency_ms": latency_ms, "server_version": version, **target}
    except PyMongoError as e:
        return {"ok": False, "stage": "connect", "error": f"{type(e).__name__}: {e}",
                "hint": classify(e), **{k: target[k] for k in ("cluster", "database", "atlas", "tls")}}
    except Exception as e:  # noqa: BLE001 - surface anything else as a failure, not a crash
        return {"ok": False, "stage": "unknown", "error": f"{type(e).__name__}: {e}",
                "hint": classify(e)}
    finally:
        if client is not None:
            try:
                client.close()
            except Exception:
                pass


def classify(exc: BaseException) -> str:
    """Map the recurring failure modes to a one-line remediation. This is the
    diagnostic that ends the WinError-10054 guessing game for the team."""
    name = type(exc).__name__
    msg = str(exc).lower()
    if "localhost" in msg or "fallback" in msg:
        return "You're on the localhost fallback -> set MONGODB_URI to the live +srv URI (.env)."
    if "tls=false" in msg:
        return "tls=false detected in the URI -> remove it; +srv implies TLS, and a non-srv URI must keep tls=true."
    if name in ("ServerSelectionTimeoutError",) or "no servers" in msg or "serverselection" in msg:
        return ("Cluster unreachable: (a) your public IP is not in Atlas Network Access "
                "allowlist, or (b) the M0 cluster is PAUSED (free tier sleeps after "
                "inactivity) -> wake it in the Atlas UI and re-run, or (c) wrong host in URI.")
    if "10054" in msg or "forcibly closed" in msg or name in ("AutoReconnect", "ConnectionResetError"):
        return ("Transient reset: retry once. If persistent -> IP not whitelisted, or a "
                "firewall/VPN/proxy is killing outbound 27017 (TLS). See docs/ATLAS_CONNECTIVITY.md.")
    if "auth" in msg or "authentication" in msg or "code: 13" in msg or "operationfailure" in name.lower():
        return "Bad credentials in the URI -> re-copy the password from Atlas -> Database Access (URL-encode special chars)."
    if "getaddrinfo" in msg or "name or service not known" in msg or "nodename" in msg:
        return "DNS failure -> typo in the cluster host, or you're offline / DNS blocked."
    return f"Unclassified ({name}); paste the full error to your lead. Remediation guide: docs/ATLAS_CONNECTIVITY.md."