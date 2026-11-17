**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test accounts -v 2`
- Result: PASS - 1 ticket test passed / 0 failed; 0 skipped across accounts.
- Tests proving this ticket: `accounts.tests.RegistrationAndJWTTests.test_registration_assigns_role_and_issues_user_bound_jwt`
- Artifact: docs/evidence/_runs/20261117T101912Z-accounts.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Added registration coverage for shopper/seller assignment, user-bound tokens, and login; the audit middleware logs a request-body-read warning during login tests.
