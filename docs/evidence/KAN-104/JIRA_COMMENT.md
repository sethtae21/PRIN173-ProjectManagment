**Verification evidence**
- Requirement: SRS FR-3.3, §5.1 · WBS 1.3.3 · RT-03 · Scope §1.1
- Method: `python manage.py test catalog -v 2`
- Result: PASS - 1 ticket test passed / 0 failed; 0 skipped across catalog.
- Tests proving this ticket: `catalog.tests.CatalogValidationAndCRUDTests.test_public_catalog_store_filter_returns_only_active_seller_items`
- Artifact: docs/evidence/_runs/20261117T095224Z-catalog.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Added a store-filter integration test that checks active-only results and returned store metadata.
