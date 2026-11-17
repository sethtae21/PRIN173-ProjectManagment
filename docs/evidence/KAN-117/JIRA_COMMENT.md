**Verification evidence**
- Requirement: complements FR-7.2/FR-7.3 robustness; surfaced during KAN-103 review. Explicitly OUT of KAN-103 scope (KAN-103 validates weights; it does not add input validation).
- Method: `python manage.py test recommendations -v 2`
- Result: PASS - 4 ticket tests passed / 0 failed; 0 skipped across recommendations.
- Tests proving this ticket: `recommendations.tests_weights.TestRecommendationQueryValidation.test_rejects_invalid_limit_bounds`; `recommendations.tests_weights.TestRecommendationQueryValidation.test_rejects_unknown_enums`; `recommendations.tests_weights.TestRecommendationQueryValidation.test_rejects_invalid_or_out_of_range_height`; `recommendations.tests_weights.TestRecommendationQueryValidation.test_caps_style_tag_count`
- Artifact: docs/evidence/_runs/20261117T095514Z-recommendations.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Added endpoint tests for limit, enum, height, and style-count validation.
