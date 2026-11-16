**Verification evidence**
- Requirement: complements FR-7.2/FR-7.3 robustness; surfaced during KAN-103 review. Explicitly OUT of KAN-103 scope (KAN-103 validates weights; it does not add input validation).
- Method: `python manage.py test recommendations -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - recommendations: 28 tests; 24 passed; 3 failures; 1 error; see captured failure output.
- Tests proving this ticket: `No limit/enum/numeric input-validation test found in backend/recommendations/test*.py`
- Artifact: `docs/evidence/_runs/20261116T013640Z-recommendations.log; docs/evidence/KAN-117/DEFECT_KAN-117.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: Recommendations command failed; no ticket-specific input-validation test was found in backend test files.
