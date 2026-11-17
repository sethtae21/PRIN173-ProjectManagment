**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test accounts -v 2`
- Result: PASS - 5 ticket tests passed / 0 failed; 0 skipped across accounts.
- Tests proving this ticket: `accounts.tests.AccountManagementTests.test_guest_cannot_view_profile`; `accounts.tests.AvatarPresetCRUDTests.test_guest_rejected`; `accounts.tests.AvatarPresetCRUDTests.test_other_user_cannot_update_or_delete`; `accounts.tests_fitting_studio_survey.FittingStudioSurveyTests.test_guest_rejected_and_no_row_written`; `accounts.tests_fitting_studio_survey.FittingStudioSurveyTests.test_seller_rejected_and_no_row_written`
- Artifact: docs/evidence/_runs/20261117T101912Z-accounts.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Backend suite evidence does not verify browser behavior, production traffic, or manual usability checks.
