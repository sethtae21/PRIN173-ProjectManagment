**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test recommendations -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - recommendations: 28 tests; 24 passed; 3 failures; 1 error; see captured failure output.
- Tests proving this ticket: `recommendations.tests_weights.TestDeterminism.test_total_equals_sum_of_rule_points (source test; not run)`; `recommendations.tests_weights.TestDeterminism.test_each_rule_points_are_zero_or_its_weight (source test; not run)`; `recommendations.tests_weights.TestEndpointSmoke.test_response_shape (source test; not run)`
- Artifact: `docs/evidence/_runs/20261116T013640Z-recommendations.log; docs/evidence/KAN-50/DEFECT_KAN-50.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: The recommendation weights module failed during import, so the cited source tests did not execute.
