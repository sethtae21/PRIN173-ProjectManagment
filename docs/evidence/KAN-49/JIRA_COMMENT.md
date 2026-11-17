**Verification evidence**
- Requirement: SRS FR-7.1–7.5; Scope Baseline WBS 1.3.5 (incl. Criteria 10 evidence); Charter OBJ-05.
- Method: `python manage.py test ratings -v 2`; `python manage.py test recommendations -v 2`
- Result: PASS - 8 ticket tests passed / 0 failed; 0 skipped across ratings, recommendations.
- Tests proving this ticket: `recommendations.tests_weights.TestDeterminism.test_total_equals_sum_of_rule_points`; `recommendations.tests_weights.TestDeterminism.test_each_rule_points_is_zero_or_its_weight`; `recommendations.tests_weights.TestDeterminism.test_rank_is_repeatable`; `recommendations.tests_weights.TestSensitivity.test_plus_minus_one_does_not_invert`; `recommendations.tests_weights.TestEndpointSmoke.test_response_shape`; `ratings.tests.RatingAPITests.test_star_persists`; `ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted`; `ratings.tests.RatingAPITests.test_rating_never_required_for_core_flow`
- Artifact: docs/evidence/_runs/20261117T100832Z-ratings.log; docs/evidence/_runs/20261117T095514Z-recommendations.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Fixed weight imports and assertions, and corrected the archive suite's stale dry-run, role, and nullable-field expectations; both suites now pass.
