**Verification evidence**
- Requirement: SRS FR-1.1 to FR-1.9; acceptance per WBS Dictionary 1.3.1.
- Method: `python manage.py test accounts -v 2`
- Result: PASS - 6 ticket tests passed / 0 failed; 0 skipped across accounts.
- Tests proving this ticket: `accounts.tests.AccountManagementTests.test_guest_cannot_view_profile`; `accounts.tests.AccountManagementTests.test_view_profile`; `accounts.tests.AccountManagementTests.test_password_change_wrong_current_rejected`; `accounts.tests.AccountManagementTests.test_password_change_success_and_login`; `accounts.tests.PasswordChangePersistenceTests.test_shopper_password_change_is_persisted`; `accounts.tests.PasswordChangePersistenceTests.test_seller_password_change_is_persisted`
- Artifact: docs/evidence/_runs/20261117T101912Z-accounts.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Changed password-change verification to use the route declared in accounts/urls.py.
