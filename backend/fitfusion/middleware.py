"""
fitfusion/middleware.py
Identity audit trail - dev instrument for the dein<->karosu "swapped profile" bug.

WHY THIS EXISTS
---------------
The reported bug (login as dein shows karosu, and vice-versa) is a FRONTEND
stale-token problem, but it is easiest to observe from the BACKEND TERMINAL
while clicking through the site. This middleware prints, for every
authenticated API call, WHICH IDENTITY THE PRESENTED JWT CARRIES, and raises
loud banners when:
  * LOGIN          : submitted email vs issued token identity (must match);
  * SWAP SUSPECT   : an authenticated request carries a token whose owner
                     differs from the last successful login in this server
                     process (= the client kept sending the previous
                     session's token after a new login);
  * RBAC DENY      : a seller-only endpoint answers 401/403 for the token's
                     role (server-side RBAC, FR-1.7, refusing correctly).

The backend is stateless per JWT: it always answers with the token's owner.
So "the page shows the previous user" can only mean "the browser sent the
previous user's token" - these logs make that visible at the source.

CHANGED (false-positive fixes — the instrument, not the app, was wrong)
----------------------------------------------------------------------
1. REJECTED LOGIN is no longer called a "backend bug".
   A 400/401 from /auth/login/ means NO token was issued (wrong password,
   archived account, invalid credentials). There is no identity to compare,
   so the old code's "MISMATCH -> backend bug!" verdict was simply wrong.
   Only a 200 that issues a DIFFERENT identity than submitted is a mismatch.
2. TEST TRAFFIC no longer raises SWAP SUSPECT.
   `manage.py test` uses APIClient.force_authenticate(), which never calls
   /auth/login/. The per-process "last login" hint therefore stays frozen on
   whichever fixture logged in last, and every other fixture user tripped the
   banner. Under the test runner (or SERVER_NAME=testserver) the banner is
   suppressed and a single explanatory note is printed instead. The compact
   [IDENTITY] line is kept so per-token evidence is still visible.

SAFETY / SCOPE
--------------
Logging only: no request, response, permission, or data is modified.
Single-developer dev-server assumption (one browser session at a time); the
"last login" memory is a per-process diagnostic hint, never enforcement.
Disable entirely with FITFUSION_IDENTITY_AUDIT=0, or remove the one
MIDDLEWARE line in settings.py.
Traceability: RT-01 / FR-1.6 / FR-1.7 verification aid (WBS 1.4.1).
"""
import json
import os
import sys
import threading

_STATE_LOCK = threading.Lock()
_STATE = {
    'last_login': None,          # {'email', 'role', 'id'} of last successful login
    'test_notice_shown': False,  # one-time note when banners are suppressed
}

# Kill switch: FITFUSION_IDENTITY_AUDIT=0 silences the whole instrument.
_AUDIT_ENABLED = os.environ.get('FITFUSION_IDENTITY_AUDIT', '1').strip().lower() \
    not in ('0', 'false', 'no', 'off')

# `manage.py test` -> sys.argv == ['manage.py', 'test', ...]. Evaluated once at
# import so every request in the test process is classified consistently.
_TEST_RUN = 'test' in sys.argv

_SKIP_PREFIXES = ('/static/', '/media/', '/health/', '/favicon',
                  '/api/schema/', '/api/docs/')
_SELLER_PREFIXES = ('/catalog/my_listings', '/catalog/my-listings',
                    '/catalog/upload', '/catalog/batch-report', '/seller')


def _banner(title, lines):
    bar = '=' * 78
    print(f"\n{bar}\n{title}")
    for line in lines:
        print(f"  {line}")
    print(f"{bar}\n", flush=True)


def _is_test_traffic(request):
    """True for Django test-client requests (no real browser / login flow)."""
    return _TEST_RUN or request.META.get('SERVER_NAME') == 'testserver'


def _note_test_suppression():
    """Print the 'why is it quiet' note exactly once per process."""
    with _STATE_LOCK:
        if _STATE['test_notice_shown']:
            return
        _STATE['test_notice_shown'] = True
    print("[IDENTITY-AUDIT] Test traffic detected (force_authenticate, no "
          "/auth/login/): SWAP SUSPECT banners suppressed — they would be "
          "false positives. Per-token [IDENTITY] lines remain.", flush=True)


class IdentityAuditMiddleware:
    """Prints token-identity evidence into the runserver terminal."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not _AUDIT_ENABLED:
            return response
        try:
            self._audit(request, response)
        except Exception as exc:  # logging must never break the app
            print(f"[IDENTITY-AUDIT] logging error: {exc}", flush=True)
        return response

    # ------------------------------------------------------------------ core
    def _audit(self, request, response):
        path = request.path
        if path.startswith(_SKIP_PREFIXES):
            return

        test_traffic = _is_test_traffic(request)

        # 1) LOGIN: submitted email vs the identity the backend issued.
        if request.method == 'POST' and path.rstrip('/').endswith('/auth/login'):
            self._audit_login(request, response, test_traffic)
            return

        user = getattr(request, 'user', None)
        if user is None or not getattr(user, 'is_authenticated', False):
            return

        email = (getattr(user, 'email', '') or '').lower()
        role = getattr(user, 'role', '-')
        uid = getattr(user, 'id', '-')

        # 2) Compact identity line for every authenticated call.
        print(f"[IDENTITY] {request.method} {path} -> "
              f"token owner={email} role={role} id={uid} "
              f"| HTTP {response.status_code}", flush=True)

        # 3) SWAP SUSPECT: token owner != last successful login here.
        with _STATE_LOCK:
            last = _STATE['last_login']
        if last and email and email != last['email']:
            if test_traffic:
                _note_test_suppression()
            else:
                _banner(
                    '🔴 SWAP SUSPECT - frontend sent a STALE token',
                    [
                        f"last successful login in this server  : {last['email']} (role={last['role']})",
                        f"identity carried by this request's JWT: {email} (role={role})",
                        f"request: {request.method} {path} -> HTTP {response.status_code}",
                        "The backend is stateless per token: it answered with the token's owner.",
                        "So the UI shows the PREVIOUS user -> fix the frontend token lifecycle:",
                        "write tokens to storage BEFORE navigate(), read the token per request,",
                        "clear storage + in-memory cache on logout, no cached-refresh auto-mint.",
                    ],
                )

        # 4) RBAC DENY on seller endpoints (FR-1.7 server-side enforcement).
        if response.status_code in (401, 403) and path.startswith(_SELLER_PREFIXES):
            if test_traffic:
                # Expected, asserted by the suite (seller-only RBAC tests).
                return
            _banner(
                f'⚠️ RBAC DENY {response.status_code} on seller endpoint {path}',
                [
                    f"token owner: {email} (role={role})",
                    "IsSeller correctly refused a non-seller token (FR-1.7).",
                    "If the UI expected seller data here, the client is logged in",
                    "as the WRONG user (stale token), not a backend permission bug.",
                ],
            )

    # ----------------------------------------------------------------- login
    def _audit_login(self, request, response, test_traffic=False):
        submitted = self._json_field(request.body, 'email')
        issued = None
        if response.status_code == 200:
            payload = self._json(response.content)
            if isinstance(payload, dict):
                issued = payload.get('user') or None

        with _STATE_LOCK:
            if issued:
                _STATE['last_login'] = {
                    'email': (issued.get('email') or '').lower(),
                    'role': issued.get('role'),
                    'id': issued.get('id'),
                }
            last_email = (_STATE['last_login'] or {}).get('email')

        match = bool(issued) and bool(submitted) \
            and str(submitted).lower() == last_email

        # CHANGED: a non-200 login issued NO token, so there is nothing to
        # compare. Calling that a "backend bug" was a false alarm that fired on
        # every wrong password and on the archived-account login test.
        if response.status_code != 200:
            verdict = (
                f"LOGIN REJECTED (HTTP {response.status_code}) — expected for a wrong "
                "password, an archived account, or invalid credentials. No token was "
                "issued, so there is no identity to compare."
            )
            real_mismatch = False
        elif match:
            verdict = "MATCH: backend issued exactly the submitted identity (login contract OK)."
            real_mismatch = False
        else:
            verdict = "MISMATCH: backend issued a DIFFERENT identity than submitted -> backend bug!"
            real_mismatch = True

        # In the test runner only a genuine mismatch deserves a banner.
        if test_traffic and not real_mismatch:
            print(f"[IDENTITY] LOGIN {request.path} -> HTTP {response.status_code} "
                  f"submitted={submitted or '<none>'} "
                  f"issued={(issued or {}).get('email') or '<no token>'}", flush=True)
            return

        _banner(
            f'LOGIN HTTP {response.status_code} {request.path}',
            [
                f"submitted email : {submitted or '<none/unparseable>'}",
                f"issued token for: {(issued or {}).get('email') or '<login failed>'} "
                f"(role={(issued or {}).get('role') or '-'}, id={(issued or {}).get('id') or '-'})",
                verdict,
            ],
        )

    # --------------------------------------------------------------- helpers
    @staticmethod
    def _json(raw):
        try:
            return json.loads(raw.decode('utf-8'))
        except Exception:
            return None

    @classmethod
    def _json_field(cls, raw, field):
        payload = cls._json(raw)
        if isinstance(payload, dict):
            return payload.get(field)
        return None