**Verification evidence**
- Requirement: SRS FR-4.1 to FR-4.8; WBS Dictionary 1.3.3.
- Method: `python manage.py test catalog -v 2`
- Result: PASS - 7 ticket tests passed / 0 failed; 0 skipped across catalog.
- Tests proving this ticket: `catalog.tests.CatalogValidationAndCRUDTests.test_download_template_contains_header_and_single_example_row`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_recognizes_header_after_template_instruction_rows`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch`; `catalog.tests.CatalogValidationAndCRUDTests.test_successful_upload_derives_color_palette_tags`; `catalog.tests.CatalogValidationAndCRUDTests.test_seller_can_list_and_manage_own_items`; `catalog.tests.CatalogValidationAndCRUDTests.test_seller_cannot_manage_other_sellers_items`
- Artifact: docs/evidence/_runs/20261117T095224Z-catalog.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Catalog validation and upload tests now use the live template's columns and canonical color names.
