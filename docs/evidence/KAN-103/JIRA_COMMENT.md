**Verification evidence**
- Requirement: SRS FR-7.2 (Basis of weights; Validation & testing); Scope Baseline WBS 1.3.5 & 1.4.2; Charter §8; Panel review comment (validate weights during implementation & testing).
- Method: `python manage.py test recommendations -v 2`
- Result: PASS - 3 ticket tests passed / 0 failed; 1 skipped across recommendations.
- Tests proving this ticket: `recommendations.tests_weights.TestDeterminism.test_rank_is_repeatable`; `recommendations.tests_weights.TestSensitivity.test_plus_minus_one_does_not_invert`; `recommendations.tests_weights.TestLiteralFreeze.test_exact_scores_and_order`; `recommendations.tests_weights.TestSuiteNonVacuous.test_sensitivity_actually_exercised`
- Artifact: docs/evidence/_runs/20261117T095514Z-recommendations.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Aligned weight and determinism assertions; the optional literal-freeze test remains skipped because no frozen values exist.
