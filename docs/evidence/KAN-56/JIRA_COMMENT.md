**Verification evidence**
- Requirement: SRS FR-1.1, FR-1.6, FR-1.8, §5.1, §4.4 · WBS 1.3.1 / 1.2.3 · RT-01 · Scope Criteria 6, 7
- Method: `python manage.py test accounts -v 2`; `python manage.py test outfits -v 2`
- Result: PASS - 6 ticket tests passed / 0 failed; 0 skipped across accounts, outfits.
- Tests proving this ticket: `accounts.tests.AccountManagementTests.test_view_profile`; `accounts.tests.AccountManagementTests.test_profile_payload_excludes_body_fields`; `accounts.tests.AccountManagementTests.test_update_profile`; `accounts.tests.AccountManagementTests.test_update_profile_ignores_legacy_body_fields`; `accounts.tests.AccountManagementTests.test_delete_account_archives_and_blocks_login`; `outfits.tests.OutfitAPITests.test_account_deletion_cascades_outfits`
- Artifact: docs/evidence/_runs/20261117T101912Z-accounts.log; docs/evidence/_runs/20261117T100108Z-outfits.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Account archive DELETE now returns 204 with no body; the API test asserts that contract.
