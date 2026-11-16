**Verification evidence**
- Requirement: SRS FR-1.1 to FR-1.9; acceptance per WBS Dictionary 1.3.1.
- Method: `python manage.py test accounts -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - accounts: 20 tests; 15 passed; 6 failures; 0 errors; see captured failure output.
- Tests proving this ticket: `accounts.tests.AccountManagementTests.test_guest_cannot_view_profile`; `accounts.tests.AccountManagementTests.test_password_change_success_and_login (FAIL)`; `accounts.tests.AccountManagementTests.test_password_change_wrong_current_rejected (FAIL)`
- Artifact: `docs/evidence/_runs/20261116T012828Z-accounts.log; docs/evidence/KAN-45/DEFECT_KAN-45.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: No registration or role-assignment test was found; the password-change/login tests returned 404.
