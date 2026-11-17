**Verification evidence**
- Requirement: SRS FR-2.1 to FR-2.10; acceptance per WBS Dictionary 1.3.2.
- Method: `python manage.py test accounts -v 2`
- Result: PASS - 5 ticket tests passed / 0 failed; 0 skipped across accounts.
- Tests proving this ticket: `accounts.tests.AvatarPresetCRUDTests.test_create_preset`; `accounts.tests.AvatarPresetCRUDTests.test_guest_rejected`; `accounts.tests.AvatarPresetCRUDTests.test_list_returns_only_own_presets`; `accounts.tests.AvatarPresetCRUDTests.test_other_user_cannot_update_or_delete`; `accounts.tests.AvatarPresetCRUDTests.test_male_with_cup_size_rejected`
- Artifact: docs/evidence/_runs/20261117T101912Z-accounts.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Avatar preset tests are mapped to accounts; the outfits suite covers saved outfits, not avatar preset CRUD.
