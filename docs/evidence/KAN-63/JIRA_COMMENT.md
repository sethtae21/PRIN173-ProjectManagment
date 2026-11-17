**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test catalog -v 2`
- Result: PASS - 6 ticket tests passed / 0 failed; 0 skipped across catalog.
- Tests proving this ticket: `catalog.tests.CatalogValidationAndCRUDTests.test_upload_recognizes_header_after_template_instruction_rows`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch`; `catalog.tests.CatalogValidationAndCRUDTests.test_successful_upload_derives_color_palette_tags`; `catalog.tests.CatalogBatchGuardTests.test_batch_commit_persists_processed_image_names`; `catalog.tests.CatalogBatchGuardTests.test_delete_during_batch_processing_does_not_resurrect_item`
- Artifact: docs/evidence/_runs/20261117T095224Z-catalog.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Aligned upload fixtures and parser checks with the generated 11-column CSV format.
