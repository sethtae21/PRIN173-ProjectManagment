**Verification evidence**
- Requirement: CODE — SRS FR-4.5/4.6/4.7/6.8; purge superseded GridFS images on replace/re-upload/delete, return edits to processing, preserve order snapshots.
- Method: Read-only review of `backend/catalog/views/core.py`, `backend/catalog/models.py`, and `backend/catalog/tests.py`; confirm real test IDs are "ok" in newest `docs/evidence/_runs/20261117T095224Z-catalog.meta.json` (54/54).
- Result: PASS — cleanup, partial-write compensation, post_delete cascade, revalidation queue, and snapshot-preservation logic are present at audit HEAD.
- Tests proving this ticket: `catalog.tests.CatalogValidationAndCRUDTests.test_replacing_image_deletes_old_gridfs_object`; `catalog.tests.CatalogValidationAndCRUDTests.test_repeated_replace_then_delete_leaves_no_orphaned_lineage`; `catalog.tests.CatalogValidationAndCRUDTests.test_deleting_listing_removes_both_stored_images`; `catalog.tests.CatalogValidationAndCRUDTests.test_deleting_listing_leaves_order_item_snapshots_intact`; `catalog.tests.CatalogValidationAndCRUDTests.test_edited_rejected_listing_stays_processing_until_pipeline_passes`.
- Artifact: docs/evidence/_runs/20261117T095224Z-catalog.log
- Commit/Verified: source 9dd3c4b; run cbb6eab; 2026-11-18.
- Limitations: Tests use simulated GridFS; no live Atlas storage-metric sample was taken.
