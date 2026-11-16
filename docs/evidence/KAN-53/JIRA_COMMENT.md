**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test accounts -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - accounts: 20 tests; 15 passed; 6 failures; 0 errors; see captured failure output.
- Tests proving this ticket: `accounts.tests.AccountManagementTests.test_guest_cannot_view_profile`; `accounts.tests.AccountManagementTests.test_password_change_wrong_current_rejected (FAIL)`
- Artifact: `docs/evidence/_runs/20261116T012828Z-accounts.log; docs/evidence/KAN-53/DEFECT_KAN-53.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: No explicit password-policy or full role-matrix test was found in the executed account test file.
