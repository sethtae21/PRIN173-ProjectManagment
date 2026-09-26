"""
KAN-93 / KAN-94 readiness: GET /health/ -> 200 (ok) or 503 (degraded).

Plain JsonResponse (no DRF) on purpose: a health probe must work even if the
DRF auth stack hiccups, and it keeps the endpoint dependency-free. AllowAny so
94's external/LAN probe and a browser can hit it without a token.

Fast-fail contract: the db ping uses HEALTH_TIMEOUTS (2s server selection) so a
paused/unreachable Atlas returns 503 in ~2s instead of hanging the probe. A
health endpoint that itself hangs is worse than one that returns 503.

Never leaks credentials: only cred-stripped cluster/database are returned.
"""
import time

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from accounts.health_utils import ping, resolve_target  # KAN-93 (FIXED: dropped bogus RuntimeError alias)

_APP = {"name": "FitFusion AI", "framework": "django"}


def _app_meta() -> dict:
    import django
    _APP["django"] = django.get_version()
    return dict(_APP)


@csrf_exempt  # GET only, but harmless; keeps the route usable by odd probes
def health_check(request):
    started = time.perf_counter()
    # Resolve first so even a resolve-failure reports the (sanitized) target.
    try:
        target = resolve_target(allow_local=False)
    except Exception as e:  # localhost trap / unresolvable URI
        return JsonResponse(
            {"status": "degraded", "reason": str(e), "db": {"ok": False},
             "app": _app_meta(), "elapsed_ms": round((time.perf_counter() - started) * 1000, 1)},
            status=503,
        )

    res = ping(allow_local=False)  # inherits HEALTH_TIMEOUTS via default
    db_block = {
        "ok": bool(res.get("ok")),
        "cluster": res.get("cluster", target["cluster"]),
        "database": res.get("database", target["database"]),
        "atlas": res.get("atlas", target["atlas"]),
        "tls": res.get("tls", target["tls"]),
        "server_version": res.get("server_version"),
        "latency_ms": res.get("latency_ms"),
    }
    if not res.get("ok"):
        db_block["error"] = res.get("error")
        db_block["hint"] = res.get("hint")

    payload = {
        "status": "ok" if res.get("ok") else "degraded",
        "db": db_block,
        "app": _app_meta(),
        "elapsed_ms": round((time.perf_counter() - started) * 1000, 1),
        # extension point KAN-94 can grow (e.g. catalog_items, queue_depth)
        "checks": {"database": db_block["ok"]},
    }
    return JsonResponse(payload, status=200 if res.get("ok") else 503)