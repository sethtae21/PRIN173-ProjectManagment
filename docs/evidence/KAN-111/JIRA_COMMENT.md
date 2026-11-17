**Verification evidence**
- Requirement: discovered during KAN-103 review; supports FR-7.2 correctness and the public-catalog consistency introduced in KAN-104. Note: created from KAN-103 so it is on the board and not forgotten; KAN-103 itself deliberately does NOT implement it (scope: validate weights, don't change ranking inputs).
- Method: `python manage.py test recommendations -v 2`
- Result: PASS - 1 ticket test passed / 0 failed; 0 skipped across recommendations.
- Tests proving this ticket: `recommendations.tests_weights.TestActiveItemFilter.test_only_active_catalog_items_are_recommended`
- Artifact: docs/evidence/_runs/20261117T095514Z-recommendations.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Corrected the seller fixture and verified inactive listings are excluded from recommendations.
