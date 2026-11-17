**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test recommendations -v 2`
- Result: PASS - 3 ticket tests passed / 0 failed; 0 skipped across recommendations.
- Tests proving this ticket: `recommendations.tests_weights.TestDeterminism.test_total_equals_sum_of_rule_points`; `recommendations.tests_weights.TestDeterminism.test_each_rule_points_is_zero_or_its_weight`; `recommendations.tests_weights.TestEndpointSmoke.test_response_shape`
- Artifact: docs/evidence/_runs/20261117T095514Z-recommendations.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Fixed the knowledge-table imports and weight assertions; recommendation response-shape tests pass.
