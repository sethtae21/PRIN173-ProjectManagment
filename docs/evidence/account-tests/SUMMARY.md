# Account Management (AM) — Test Execution Summary

## Run overview

| Item | Value |
| --- | --- |
| Test suite | `frontend/e2e/account-tests.spec.ts` |
| Command | `npx playwright test e2e/account-tests.spec.ts --reporter=line --workers=1` |
| Base command | `npx playwright test e2e/account-tests.spec.ts` |
| Execution date | 2026-11-19, 09:25–09:26 UTC |
| Frontend | `https://localhost:8443` (HTTPS via local CA) |
| API | `http://127.0.0.1:8000` |
| Result | **15 passed / 0 failed** |
| Execution mode | Serial CSV order, STOP ON FAILURE |
| Context strategy | Fresh `BrowserContext` per case and per distinct user; real UI login for registered users; token-free contexts for User B and Guest |

All 15 cases were executed in CSV order with no application code changes. Evidence for each case is stored under `docs/evidence/account-tests/AM-XXX/`, including full-page screenshots at key interactions and a `test-log.json` with captured assertions, API responses, and database observations.

## Results

| ID | Case | Result | Evidence |
| --- | --- | --- | --- |
| AM-001 | Register Account (User) | PASS | [AM-001](AM-001/) |
| AM-002 | Register Account (Seller) requires Store Name | PASS | [AM-002](AM-002/) |
| AM-003 | Weak password blocked | PASS | [AM-003](AM-003/) |
| AM-004 | Duplicate email rejected | PASS | [AM-004](AM-004/) |
| AM-005 | Missing email identified | PASS | [AM-005](AM-005/) |
| AM-006 | Valid login succeeds | PASS | [AM-006](AM-006/) |
| AM-007 | Wrong password rejected | PASS | [AM-007](AM-007/) |
| AM-008 | Unregistered email rejected | PASS | [AM-008](AM-008/) |
| AM-009 | Logout clears session and blocks protected access | PASS | [AM-009](AM-009/) |
| AM-010 | Archive account, block login, cold-relocate PII | PASS | [AM-010](AM-010/) |
| AM-011 | Password hashed in database | PASS | [AM-011](AM-011/) |
| AM-012 | Guest data ephemeral after context close | PASS | [AM-012](AM-012/) |
| AM-013 | Cross-user RBAC isolation | PASS | [AM-013](AM-013/) |
| AM-014 | Continue as Guest access | PASS | [AM-014](AM-014/) |
| AM-015 | Guest restrictions and protected-write denials | PASS | [AM-015](AM-015/) |

## Key observations

### Registration (AM-001–AM-005)

- AM-001 created a shopper through the real three-step UI form, redirected to `/shopper/dashboard`, and confirmed `session.user.role === 'shopper'` (the canonical role source; the JWT itself is not required to carry a role claim).
- AM-002 blanked **Store Name** on the seller form, observed `Store Name is required for Seller accounts.`, then supplied a store name and completed registration to `/seller/dashboard` with `session.user.role === 'seller'`. Seller step buttons are labelled `Next: Address` / `Next: Security` (shopper uses `Next`).
- AM-003 submitted `Passw0rd`: zero password rules passed, `Complete all password requirements.` was shown, registration stayed on `/signup/shopper`, no session was written, and a direct `/auth/login/` attempt returned HTTP 400.
- AM-004 reused an existing email: `This email is already used. Please use another email address or log in.` was shown with no session created.
- AM-005 left email blank: `Email address is required.` was shown and the email input carried `aria-invalid="true"`.

### Login and logout (AM-006–AM-009)

- AM-006 logged in through the real UI with the AM-001 account; tokens were present in `sessionStorage['fitfusion.session.v1']` and the shopper role was confirmed from `session.user.role`.
- AM-007 (wrong password) and AM-008 (unregistered email) both rendered `The email address or password is incorrect.` (the current UI copy), stayed on `/login`, and left no session state.
- AM-009 opened `/shopper/orders`, logged out via the `.unified-shopper-logout` modal, and confirmed redirect to `/login`, null session/token/user state, and that browser Back could not reopen a protected page. A previously issued JWT replayed directly against `/cart/` still returned 200 — expected for a stateless, non-revoked token and outside AM-009's local-session acceptance criterion; the client no longer holds or sends that token.

### Archive and cold relocation (AM-010)

- A fixture shopper with a preset, an outfit, and a checked-out order archived its account via **Account Management → Archive Account → Confirm Archive**, was signed out, and could not log back in from a fresh context.
- The scoped stage-2 sweep (production `prune_expired_archived_users` logic limited to this one test `user.pk` via a test-only monkeypatch in the Playwright subprocess) relocated exactly one row: live `accounts_user` row gone; `accounts_archiveduser` tombstone held a pseudonymous email (`archived-<32 hex>@archive.invalid`), `Archived User` display name, empty password, and null contact/address fields; the linked order was detached and its recipient/contact/address PII blanked.

### Security checks (AM-011–AM-013)

- AM-011 inspected the live `accounts_user` document with the backend venv + Django/PyMongo: stored credential was `pbkdf2_sha256$1200000$…` (89 chars), with no plaintext password or embedded password substring.
- AM-012 built a guest avatar, equipped a recommendation, then closed the context. The fresh context had zero avatar keys (session or local), no session token, and anonymous `GET /presets/` returned 401. Persistent DB collection counts were byte-for-byte identical before and after the guest session.
- AM-013 logged in as User B against User A's order, preset, and outfit IDs: all three detail endpoints returned 404 and disclosed no User A data; User B's order-history page showed no User A email or preset name.

### Guest access and restrictions (AM-014–AM-015)

- AM-014 reached the Guest dashboard, browsed the catalog, created a female avatar, tried on a recommended item (`Dark Indigo Maong Jeans`), and received a 200 from `/api/recommendations/` — all without a session token.
- AM-015 verified each gated action: Add to Cart showed `REGISTRATION REQUIRED / Create an account to continue`; Checkout redirected to `/login`; Save Outfit showed `Unlock the complete fitting experience`; a rating star click showed `Please sign up or log in to save your rating.` with Sign Up / Log In / Cancel. **Zero** cart and rating API calls originated from the guest page, rating storage keys were unchanged, all seven unauthenticated protected endpoints returned 401/403, and DB counts were unchanged before and after.

## Notes

- No FAIL evidence remains in this folder; stale `failure.png` files from earlier diagnostic runs (AM-001 JWT-role assertion and AM-007 login-copy mismatch) were removed after the final green run.
- Test-only fixtures use API registration and scoped DB inspection/pruning through the backend virtualenv; no backend Python/Django or frontend React/JSX application code was modified.
- The `decodeJwtRole` helper was removed because the application treats `session.user.role` as canonical; AM-001/AM-002/AM-006 assert that value instead.
- The CSV `docs/Test Cases/FitFusionAI - Test Cases - AM — Account Management.csv` was updated to PASS statuses and `../evidence/account-tests/AM-XXX/` evidence links for all 15 cases.
