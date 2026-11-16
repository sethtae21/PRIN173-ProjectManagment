**Verification evidence**
- Requirement: SRS FR-7.5; Scope Baseline 1.2 Criteria 9–11; Charter OBJ-01, OBJ-05.
- Method: `python manage.py test ratings -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: 28 tests passed; 0 failed.
- Tests proving this ticket: `ratings.tests.RatingAPITests.test_star_persists_as_score_only`; `ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted`; `ratings.tests.RatingAPITests.test_validation_bounds_and_empty_payload`; `ratings.tests.RatingAPITests.test_owner_only_update_delete`; `ratings.tests.RatingAPITests.test_rating_never_required_for_core_flow`
- Artifact: `docs/evidence/_runs/20261116T013922Z-ratings.log`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: Backend API behavior only; this does not verify the separate KAN-102 UI controls.
