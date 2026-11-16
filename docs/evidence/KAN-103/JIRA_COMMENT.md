**Verification evidence**
- Requirement: SRS FR-7.2 (Basis of weights; Validation & testing); Scope Baseline WBS 1.3.5 & 1.4.2; Charter §8; Panel review comment (validate weights during implementation & testing).
- Method: `python manage.py test recommendations -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - recommendations: 28 tests; 24 passed; 3 failures; 1 error; see captured failure output.
- Tests proving this ticket: `recommendations.tests_weights.TestDeterminism.test_rank_is_repeatable (source test; not run)`; `recommendations.tests_weights.TestSensitivity.test_plus_minus_one_does_not_invert (source test; not run)`; `recommendations.tests_weights.TestLiteralFreeze.test_exact_scores_and_order (source test; not run)`; `recommendations.tests_weights.TestSuiteNonVacuous.test_sensitivity_actually_exercised (source test; not run)`
- Artifact: `docs/evidence/_runs/20261116T013640Z-recommendations.log; docs/evidence/KAN-103/DEFECT_KAN-103.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: The weights module import failed before any KAN-103 test executed.
