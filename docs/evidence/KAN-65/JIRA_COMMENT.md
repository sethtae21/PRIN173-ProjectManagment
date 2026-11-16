**Verification evidence**
- Requirement: not stated in ticket
- Method: `python manage.py test accounts -v 2`; `python manage.py test catalog -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: BLOCKED - accounts: 20 tests, 15 passed, 6 failure records; catalog: 53 tests, 49 passed, 4 failed.
- Tests proving this ticket: `accounts.tests.GridFSStorageDeletionTests.test_delete_finds_object_id_backed_image_fields`; `accounts.tests.GridFSStorageDeletionTests.test_delete_falls_back_to_filename_for_non_object_id_keys`; `accounts.tests.GridFSStorageDeletionTests.test_delete_is_a_noop_when_the_file_is_already_absent (FAIL)`; `accounts.tests.GridFSStorageDeletionTests.test_delete_propagates_failure_when_gridfs_is_unavailable (FAIL)`; `catalog.tests.CatalogValidationAndCRUDTests.test_replacing_image_deletes_old_gridfs_object`; `catalog.tests.CatalogValidationAndCRUDTests.test_deleting_listing_removes_both_stored_images`
- Artifact: `docs/evidence/_runs/20261116T012828Z-accounts.log; docs/evidence/_runs/20261116T013042Z-catalog.log; docs/evidence/KAN-65/DEFECT_KAN-65.md`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: GridFS deletion assertions failed in accounts; no temp-file-specific test was found.
