**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test accounts -v 2`; `python manage.py test commerce -v 2`; `python manage.py test ratings -v 2`
- Result: PASS - 4 ticket tests passed / 0 failed; 0 skipped across accounts, commerce, ratings.
- Tests proving this ticket: `accounts.tests.AccountManagementTests.test_guest_cannot_view_profile`; `accounts.tests_fitting_studio_survey.FittingStudioSurveyTests.test_guest_rejected_and_no_row_written`; `ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted`; `commerce.tests.CommerceAPITests.test_guest_rejected_from_cart_and_checkout`
- Artifact: docs/evidence/_runs/20261117T101912Z-accounts.log ; docs/evidence/_runs/20261117T100000Z-commerce.log ; docs/evidence/_runs/20261117T100832Z-ratings.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Backend suite evidence does not verify browser behavior, production traffic, or manual usability checks.
