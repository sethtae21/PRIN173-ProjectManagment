**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test accounts -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - accounts: 20 tests; 15 passed; 6 failures; 0 errors; see captured failure output.
- Tests proving this ticket: `No registration/JWT assignment test found in backend/accounts/tests.py`; `accounts.tests.AccountManagementTests.test_password_change_success_and_login (FAIL)`
- Artifact: `docs/evidence/_runs/20261116T012828Z-accounts.log; docs/evidence/KAN-52/DEFECT_KAN-52.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: No registration or role-assignment test was present; login after password change returned 404.
