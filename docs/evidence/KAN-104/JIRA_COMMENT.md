**Verification evidence**
- Requirement: SRS FR-3.3, §5.1 · WBS 1.3.3 · RT-03 · Scope §1.1
- Method: `python manage.py test catalog -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - catalog: 53 tests; 49 passed; 4 failures; 0 errors; see captured failure output.
- Tests proving this ticket: `No store-filter test found in backend/catalog/tests.py`; `catalog.tests.CatalogValidationAndCRUDTests.test_public_catalog_style_filter_matches_json_array_tags (style filter only)`
- Artifact: `docs/evidence/_runs/20261116T013042Z-catalog.log; docs/evidence/KAN-104/DEFECT_KAN-104.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: Catalog suite failed four assertions; the existing filter test does not prove the requested per-store filter.
