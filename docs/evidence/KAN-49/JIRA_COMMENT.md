**Verification evidence**
- Requirement: SRS FR-7.1–7.5; Scope Baseline WBS 1.3.5 (incl. Criteria 10 evidence); Charter OBJ-05.
- Method: `python manage.py test recommendations -v 2`; `python manage.py test ratings -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - recommendations: 24 passed, 3 failed, 1 error; ratings: 28 passed, 0 failed.
- Tests proving this ticket: `recommendations.tests_weights (module import ERROR; no module test cases ran)`; `ratings.tests.RatingAPITests.test_star_persists_as_score_only`; `ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted`; `ratings.tests.RatingAPITests.test_rating_never_required_for_core_flow`
- Artifact: `docs/evidence/_runs/20261116T013640Z-recommendations.log; docs/evidence/_runs/20261116T013922Z-ratings.log; docs/evidence/KAN-49/DEFECT_KAN-49.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: Ratings passed 28/28; recommendations failed with a missing CONTRAST_BY_HEIGHT import and three assertions.
