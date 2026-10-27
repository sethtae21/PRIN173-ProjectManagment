#!/usr/bin/env python
"""
FitFusion AI - session identity diagnostic (terminal test logs).

WHY THIS FILE EXISTS
--------------------
Reported symptom: logging in as the SELLER (dein@gmail.com) renders the
SHOPPER's (karosu@gmail.com) name/email/role on the Seller Dashboard and Store
Profile pages (and vice-versa), and GET /catalog/my_listings/ answers 403 on a
seller URL - i.e. every authenticated call after login carries the PREVIOUS
session's JWT instead of the fresh one.

This script proves, from the VS Code terminal, WHO THE BACKEND THINKS YOU ARE
for each token, so the bug can be assigned to the right half of the stack:

  1  login A returns user A?                     (login contract, FR-1.6)
  2  /profile/ with A's access == A?             (identity-faithful per token)
  3  /catalog/my_listings/ per A's role?         (server-side RBAC, FR-1.7)
  4  login B returns user B?
  5  /profile/ with B's access == B?
  6  /catalog/my_listings/ per B's role?
  7  A and B tokens carry different user_id?
  8  after B logged in, A's token STILL returns A?  (server is stateless per
     token -> whoever's token the browser sends is who the UI will show)
  9  refreshing A's refresh re-issues A's identity? (rotation crosses nobody)

If all checks PASS, the backend is identity-correct and the swap is 100% a
FRONTEND credential-lifecycle bug (stale access/refresh token kept in memory
or localStorage across login/logout). The VERDICT block lists the exact
client-side patterns to fix.

USAGE (VS Code terminal; backend running on 127.0.0.1:8000)
-----------------------------------------------------------
  cd Backend
  .\.venv\Scripts\Activate.ps1
  python diagnostics\verify_session_identity.py                            # prompts passwords
  python diagnostics\verify_session_identity.py --pass-a "PwdA!" --pass-b "PwdB!"
  python diagnostics\verify_session_identity.py --base http://127.0.0.1:8000 \
      --email-a dein@gmail.com --email-b karosu@gmail.com

Read-only + throwaway logins/refresh only; creates and mutates no data.
Stdlib only (urllib) so it runs in a clean venv. Path-independent: no Django
imports, so it can be executed from any directory.
Exit codes: 0 = all checks passed, 1 = at least one FAIL, 2 = server unreachable.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import json
import sys
import urllib.error
import urllib.request

RESULTS: list[tuple[str, str, bool]] = []


def check(num: str, name: str, ok: bool, detail: str = "") -> bool:
    RESULTS.append((num, name, ok))
    print(f"{'PASS' if ok else 'FAIL'} | {num} | {name} | {detail}")
    return ok


def info(msg: str) -> None:
    print(f"     |     | {msg}")


def _safe_json(raw: str):
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"detail": raw[:300]}


def http_json(base: str, method: str, path: str,
              token: str | None = None, payload: dict | None = None):
    """Return (status_code, parsed_body). Non-2xx is a NORMAL test outcome."""
    url = base.rstrip("/") + path
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, _safe_json(resp.read().decode("utf-8") or "{}")
    except urllib.error.HTTPError as err:
        return err.code, _safe_json(err.read().decode("utf-8") or "{}")
    except urllib.error.URLError as err:
        print(f"FATAL | cannot reach {url} -> {err.reason}")
        print("        Start the Django backend first: python manage.py runserver 127.0.0.1:8000")
        sys.exit(2)


def jwt_claims(token: str) -> dict:
    """Decode the JWT payload WITHOUT verification - logging only."""
    if not token or "." not in token:
        return {}
    segment = token.split(".")[1]
    segment += "=" * (-len(segment) % 4)
    try:
        return json.loads(base64.urlsafe_b64decode(segment))
    except Exception:
        return {}


def login(base: str, email: str, password: str):
    return http_json(base, "POST", "/auth/login/",
                     payload={"email": email, "password": password})


def tokens_of(body: dict) -> tuple[str, str]:
    tokens = body.get("tokens") or {}
    return (tokens.get("access") or body.get("access") or "",
            tokens.get("refresh") or body.get("refresh") or "")


def _summary() -> int:
    passed = sum(1 for r in RESULTS if r[2])
    print("-" * 78)
    print(f"SUMMARY: {passed}/{len(RESULTS)} checks passed")
    for num, name, ok in RESULTS:
        if not ok:
            print(f"  NEEDS ATTENTION: {num} {name}")
    if passed == len(RESULTS):
        print()
        print("VERDICT: backend is identity-faithful per token (login, /profile/, RBAC and")
        print("refresh all return the token's own owner). The dein<->karosu swap is therefore")
        print("a FRONTEND credential-lifecycle bug: the page keeps using the PREVIOUS session's")
        print("access/refresh token (or a cached user object) after login. Fix in the client:")
        print("  1. On login: write access+refresh+user to storage BEFORE navigate() and before")
        print("     any page mounts/fetches; never keep the token in a module-level variable")
        print("     captured at import time - read it per request (or bump a context version).")
        print("  2. On logout: clear storage AND the in-memory cache, then force a full reload")
        print("     (window.location.assign('/login')) so no stale closure survives.")
        print("  3. Kill any 401 auto-refresh interceptor that reads a CACHED refresh token:")
        print("     after re-login it silently re-mints the OLD user's access token.")
        print("  4. Account/Store pages must render from the fetched /profile/ payload, never")
        print("     from a localStorage 'user' blob written by an earlier session.")
    return 0 if passed == len(RESULTS) else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="FitFusion session-identity diagnostic.")
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("--email-a", default="dein@gmail.com", help="seller account email")
    parser.add_argument("--email-b", default="karosu@gmail.com", help="shopper account email")
    parser.add_argument("--pass-a", default=None, help="password for --email-a (prompted if omitted)")
    parser.add_argument("--pass-b", default=None, help="password for --email-b (prompted if omitted)")
    args = parser.parse_args()

    pass_a = args.pass_a or getpass.getpass(f"Password for {args.email_a}: ")
    pass_b = args.pass_b or getpass.getpass(f"Password for {args.email_b}: ")

    print("=" * 78)
    print("FitFusion AI - session identity diagnostic (who does the backend think you are?)")
    print(f"target: {args.base}   A={args.email_a}   B={args.email_b}")
    print("=" * 78)

    # 0 - backend reachable?
    status, body = http_json(args.base, "GET", "/health/")
    if not check("0", "backend reachable via /health/", status in (200, 503),
                 f"HTTP {status}, db ok={body.get('db', {}).get('ok')}"):
        return 2
    if status == 503:
        info("WARNING: /health/ degraded (Atlas paused?) - identity checks only need the HTTP layer; continuing.")

    # 1 - login A
    status, body = login(args.base, args.email_a, pass_a)
    user_a = body.get("user") or {}
    if not check("1", "login A returns A's own user object",
                 status == 200 and user_a.get("email", "").lower() == args.email_a.lower(),
                 f"HTTP {status}, user={user_a.get('email')}, role={user_a.get('role')}"):
        info(f"login A body: {json.dumps(body)[:300]}")
        return _summary()
    access_a, refresh_a = tokens_of(body)
    claims_a = jwt_claims(access_a)
    info(f"A access token user_id={claims_a.get('user_id')}")

    # 2 - /profile/ with A's token
    status, body = http_json(args.base, "GET", "/profile/", token=access_a)
    prof_a = body.get("user") or {}
    check("2", "GET /profile/ with A's access == A",
          status == 200 and prof_a.get("email", "").lower() == args.email_a.lower()
          and str(prof_a.get("id")) == str(claims_a.get("user_id")),
          f"HTTP {status}, email={prof_a.get('email')}, id={prof_a.get('id')}")

    # 3 - RBAC probe A (seller -> 200, shopper -> 403)
    expect_a = 200 if user_a.get("role") == "seller" else 403
    status, _ = http_json(args.base, "GET", "/catalog/my_listings/", token=access_a)
    check("3", f"GET /catalog/my_listings/ as A (role={user_a.get('role')}) expects HTTP {expect_a}",
          status == expect_a, f"HTTP {status}")

    # 4 - login B
    status, body = login(args.base, args.email_b, pass_b)
    user_b = body.get("user") or {}
    if not check("4", "login B returns B's own user object",
                 status == 200 and user_b.get("email", "").lower() == args.email_b.lower(),
                 f"HTTP {status}, user={user_b.get('email')}, role={user_b.get('role')}"):
        info(f"login B body: {json.dumps(body)[:300]}")
        return _summary()
    access_b, refresh_b = tokens_of(body)
    claims_b = jwt_claims(access_b)
    info(f"B access token user_id={claims_b.get('user_id')}")

    # 5 - /profile/ with B's token
    status, body = http_json(args.base, "GET", "/profile/", token=access_b)
    prof_b = body.get("user") or {}
    check("5", "GET /profile/ with B's access == B",
          status == 200 and prof_b.get("email", "").lower() == args.email_b.lower(),
          f"HTTP {status}, email={prof_b.get('email')}")

    # 6 - RBAC probe B
    expect_b = 200 if user_b.get("role") == "seller" else 403
    status, _ = http_json(args.base, "GET", "/catalog/my_listings/", token=access_b)
    check("6", f"GET /catalog/my_listings/ as B (role={user_b.get('role')}) expects HTTP {expect_b}",
          status == expect_b, f"HTTP {status}")

    # 7 - distinct identities
    check("7", "A and B access tokens carry different user_id",
          claims_a.get("user_id") != claims_b.get("user_id"),
          f"{claims_a.get('user_id')} != {claims_b.get('user_id')}")

    # 8 - THE KEY PROOF: server is stateless per token
    status, body = http_json(args.base, "GET", "/profile/", token=access_a)
    check("8", "after B logged in, A's token STILL returns A (stateless per token)",
          status == 200 and (body.get("user") or {}).get("email", "").lower() == args.email_a.lower(),
          f"HTTP {status}, email={(body.get('user') or {}).get('email')}")
    info("^^ Whoever's token the browser sends is who the UI shows. There is no")
    info("   server-side 'current session' to mix up - a swapped page means the")
    info("   client sent the previous session's token.")

    # 9 - refresh does not cross identities
    status, body = http_json(args.base, "POST", "/auth/token/refresh/",
                             payload={"refresh": refresh_a})
    new_access = body.get("access") or ""
    check("9", "refresh of A's refresh token re-issues A's identity",
          status == 200 and bool(new_access)
          and jwt_claims(new_access).get("user_id") == claims_a.get("user_id"),
          f"HTTP {status}, user_id={jwt_claims(new_access).get('user_id') if new_access else None}")

    info("Browser cross-check: DevTools -> Network -> click the /profile/ request ->")
    info("Headers -> Authorization: Bearer <token> -> paste it into jwt.io. If its")
    info("user_id equals the OTHER account, the frontend sent a stale token. Guilty.")
    return _summary()


if __name__ == "__main__":
    sys.exit(main())