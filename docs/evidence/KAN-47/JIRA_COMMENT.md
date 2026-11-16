**Verification evidence**
- Requirement: SRS FR-4.1 to FR-4.8; WBS Dictionary 1.3.3.
- Method: `python manage.py test catalog -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - catalog: 53 tests; 49 passed; 4 failures; 0 errors; see captured failure output.
- Tests proving this ticket: `catalog.tests.CatalogValidationAndCRUDTests.test_download_package_contains_template_and_image_guidelines`; `catalog.tests.CatalogValidationAndCRUDTests.test_successful_upload_derives_color_palette_tags`; `catalog.tests.CatalogBatchGuardTests.test_batch_commit_persists_processed_image_names`
- Artifact: `docs/evidence/_runs/20261116T013042Z-catalog.log; docs/evidence/KAN-47/DEFECT_KAN-47.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: The command failed four color/tag assertions; seller dashboard visual proof is separately listed under KAN-66.
