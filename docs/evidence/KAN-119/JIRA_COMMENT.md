**Verification evidence**
- Requirement: SRS FR-4.5, FR-4.6, FR-4.7; WBS Dictionary 1.3.3 / 1.3.7 - purge superseded GridFS objects on image replace/rejected-item re-upload/listing delete
- Method: `python manage.py test catalog`; confirm real test IDs are "ok" in newest docs/evidence/_runs/20261117T095224Z-catalog.meta.json
- Result: PASS - catalog.tests.CatalogValidationAndCRUDTests.test_replacing_image_deletes_old_gridfs_object; test_repeated_replace_then_delete_leaves_no_orphaned_lineage; test_deleting_listing_removes_both_stored_images; test_seller_cascade_removes_both_blobs all "ok" (54/54 catalog tests passed)
- Tests proving this ticket: catalog.tests.CatalogValidationAndCRUDTests.test_replacing_image_deletes_old_gridfs_object; catalog.tests.CatalogValidationAndCRUDTests.test_repeated_replace_then_delete_leaves_no_orphaned_lineage; catalog.tests.CatalogValidationAndCRUDTests.test_deleting_listing_removes_both_stored_images; catalog.tests.CatalogValidationAndCRUDTests.test_seller_cascade_removes_both_blobs
- Artifact: docs/evidence/_runs/20261117T095224Z-catalog.log
- Commit: 6390434   Verified: 2026-11-18
- Limitations: Covers GridFS purge on replace/delete; does not prove FR-4.7 re-upload re-validation status transition end-to-end
