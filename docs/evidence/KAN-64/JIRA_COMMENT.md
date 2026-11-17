**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test catalog -v 2`
- Result: PASS - 7 ticket tests passed / 0 failed; 0 skipped across catalog.
- Tests proving this ticket: `catalog.tests.CatalogColorAlignmentTests.test_accepts_dominant_shade_of_declared_color`; `catalog.tests.CatalogColorAlignmentTests.test_rejects_a_different_dominant_color`; `catalog.tests.CatalogColorAlignmentTests.test_mismatch_message_carries_the_correct_color_to_declare`; `catalog.tests.CatalogTagValidationTests.test_accepts_approved_comma_separated_tags_case_insensitively`; `catalog.tests.CatalogTagValidationTests.test_rejects_style_tags_outside_controlled_vocabulary`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images`; `catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch`
- Artifact: docs/evidence/_runs/20261117T095224Z-catalog.log
- Commit: `cbb6eab` (working tree dirty)  Verified: 2026-11-17
- Limitations: Color messages now use knowledge-table casing; style validation rejects tags outside the approved vocabulary.
