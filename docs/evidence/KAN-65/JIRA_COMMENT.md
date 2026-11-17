**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test catalog -v 2`
- Result: PASS - 3 ticket tests passed / 0 failed; 0 skipped across catalog.
- Tests proving this ticket: `catalog.tests.CatalogDeletePathTests.test_delete_with_gridfs_unreachable_succeeds_and_logs_error`; `catalog.tests.CatalogSweepOrphanTests.test_sweep_delete_removes_orphans_only`; `catalog.tests.CatalogSweepOrphanTests.test_sweep_is_idempotent`
- Artifact: docs/evidence/_runs/20261117T095224Z-catalog.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Added an orphan sweep assertion after simulated GridFS unavailability; both file and chunk records are removed.
