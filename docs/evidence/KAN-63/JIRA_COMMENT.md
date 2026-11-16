**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test catalog -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - catalog: 53 tests; 49 passed; 4 failures; 0 errors; see captured failure output.
- Tests proving this ticket: `catalog.tests.CatalogValidationAndCRUDTests.test_upload_recognizes_header_after_template_instruction_rows`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch`; `catalog.tests.CatalogBatchGuardTests.test_batch_commit_persists_processed_image_names`
- Artifact: `docs/evidence/_runs/20261116T013042Z-catalog.log; docs/evidence/KAN-63/DEFECT_KAN-63.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: Catalog command failed four color/tag assertions; no pass is claimed for the ticket.
