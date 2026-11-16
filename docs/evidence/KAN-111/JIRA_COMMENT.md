**Verification evidence**
- Requirement: discovered during KAN-103 review; supports FR-7.2 correctness and the public-catalog consistency introduced in KAN-104. Note: created from KAN-103 so it is on the board and not forgotten; KAN-103 itself deliberately does NOT implement it (scope: validate weights, don't change ranking inputs).
- Method: `python manage.py test recommendations -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - recommendations: 28 tests; 24 passed; 3 failures; 1 error; see captured failure output.
- Tests proving this ticket: `recommendations.tests_weights.TestActiveItemFilter.test_only_active_catalog_items_are_recommended (source test; not run)`
- Artifact: `docs/evidence/_runs/20261116T013640Z-recommendations.log; docs/evidence/KAN-111/DEFECT_KAN-111.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: The test is in recommendations/tests_weights.py, which failed import before test execution.
