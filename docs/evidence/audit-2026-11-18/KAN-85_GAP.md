**Why this is not Done**
- Ticket: KAN-85 (TEST) — KAN-83 Edge-case rejection suite
- Current Jira status: To Do
- Blocking reason: Backend invalid-upload tests pass, but the required local-staging Seller Dashboard execution, report exports, and pass/fail matrix were not found. Automated unit coverage does not equal the required staging bundle.
- Missing: FR-4.7 rules (a)-(e) plus batch-cap and file-type cases executed on staging, validation report exports, a 100% pass/fail matrix, and one valid control upload published Active.
- Evidence checked: Real IDs confirmed "ok" in `docs/evidence/_runs/20261117T095224Z-catalog.meta.json`: `catalog.tests.CatalogValidationAndCRUDTests.test_rejects_missing_view_images`; `test_rejects_oversized_image`; `test_upload_reports_missing_fields_and_undersized_images`; `test_upload_reports_csv_filename_mismatch`; `test_successful_upload_derives_color_palette_tags`. No staging matrix or report export was found in `docs/evidence/`.
- To close this ticket: Human action: run the full edge-case bundle through the Seller Dashboard on seeded local staging, export every Validation Report, complete the pass/fail matrix, and include the valid control upload.
- Owner: SETH MARTIN DUCLAYAN
