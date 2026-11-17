**Verification evidence**
- Requirement: SRS FR-7.5; Scope Baseline 1.2 Criteria 9–11; Charter OBJ-01, OBJ-05.
- Method: `python manage.py test ratings -v 2`
- Result: PASS - 9 ticket tests passed / 0 failed; 0 skipped across ratings.
- Tests proving this ticket: `ratings.tests.RatingAPITests.test_star_persists`; `ratings.tests.RatingAPITests.test_score_zero_rejected`; `ratings.tests.RatingAPITests.test_score_six_rejected`; `ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted`; `ratings.tests.RatingAPITests.test_seller_submit_rejected_and_not_persisted`; `ratings.tests.RatingAPITests.test_owner_only_update_delete`; `ratings.tests.RatingAPITests.test_source_field_allows_multi_surface_ratings`; `ratings.tests.RatingAPITests.test_upsert_same_user_target_source_keeps_one_row`; `ratings.tests.RatingAPITests.test_mine_returns_only_own_stars`
- Artifact: docs/evidence/_runs/20261117T100832Z-ratings.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Backend suite evidence does not verify browser behavior, production traffic, or manual usability checks.
