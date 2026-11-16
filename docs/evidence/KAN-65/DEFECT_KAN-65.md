# Blocked test evidence: KAN-65

Commit: `389a0deccfb3677fa2b374098dfbdaa746e72885`; Python 3.13.15; Django 6.0.8; `PYTHONIOENCODING=utf-8` set for the one-time runs.

## accounts - `python manage.py test accounts -v 2`

- UTC start: see `20261116T012828Z-accounts.log`
- Result: 20 tests; 15 passed; 6 failures; 0 errors; command exited 1.
- Full raw log: `docs/evidence/_runs/20261116T012828Z-accounts.log`

## Complete captured command output

```text
python : Creating test database for alias 'default' ('test_fitfusion')...
At line:2 char:1002
+ ... global:LASTEXITCODE = 0; python manage.py test $app -v 2 2>&1 | Tee-O ...
+                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Creating test d..._fitfusion')...:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 

Found 20 test(s).
Operations to perform:
  Synchronize unmigrated apps: corsheaders, drf_spectacular, messages, rest_framework, rest_framework_simplejwt, staticfiles
  Apply all migrations: accounts, admin, auth, catalog, commerce, contenttypes, outfits, ratings, sessions
Synchronizing apps without migrations:
  Creating tables...
    Running deferred SQL...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0001_initial... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying auth.0007_alter_validators_add_error_messages... OK
  Applying auth.0008_alter_user_username_max_length... OK
  Applying auth.0009_alter_user_last_name_max_length... OK
  Applying auth.0010_alter_group_name_max_length... OK
  Applying auth.0011_update_proxy_permissions... OK
  Applying auth.0012_alter_user_first_name_max_length... OK
  Applying auth.0013_alter_group_id_alter_permission_id_alter_user_id... OK
  Applying accounts.0001_initial... OK
  Applying accounts.0002_remove_user_body_proportions_remove_user_height_and_more... OK
  Applying accounts.0003_archiveduser_user_archived_at_user_status_and_more... OK
  Applying accounts.0004_remove_archiveduser_retention_expires_at... OK
  Applying accounts.0005_user_fitting_studio_surveys... OK
  Applying accounts.0006_remove_user_fitting_studio_surveys_and_more... OK
  Applying accounts.0007_user_latest_fitting_studio_survey... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying admin.0004_alter_logentry_id... OK
  Applying catalog.0001_initial... OK
  Applying catalog.0002_catalogitem_size_max_cm_catalogitem_size_min_cm... OK
  Applying catalog.0003_remove_catalogitem_size_max_cm_and_more... OK
  Applying catalog.0004_remove_catalogitem_side_image... OK
  Applying catalog.0005_alter_catalogitem_category... OK
  Applying commerce.0001_initial... OK
  Applying commerce.0002_order_contact_number_order_recipient_name_and_more... OK
  Applying commerce.0003_order_recipient_email... OK
  Applying commerce.0004_order_order_number... OK
  Applying commerce.0005_order_user_nullable... OK
  Applying commerce.0006_cartitem_catalog_item_id_cartitem_item_name_and_more... OK
  Applying contenttypes.0003_alter_contenttype_id... OK
  Applying outfits.0001_initial... OK
  Applying outfits.0002_outfit_avatar_cup_size_outfit_avatar_gender_and_more... OK
  Applying outfits.0003_avatarpreset_body_build_cm_avatarpreset_style_focus_and_more... OK
  Applying ratings.0001_initial... OK
  Applying ratings.0002_alter_rating_unique_together_rating_source_and_more... OK
  Applying ratings.0003_uatsession_uatresponse... OK
  Applying ratings.0004_rename_uat_response_session_product_idx_uat_respons_session_a26510_idx_and_more... OK
  Applying sessions.0001_initial... OK

============================================================
FITFUSION AI SERVER IS RUNNING!
============================================================
Available Test Links:
1. Test Upload Page:       http://127.0.0.1:8000/test-upload/
2. Django Admin:           http://127.0.0.1:8000/admin/
3. Download CSV Template:  http://127.0.0.1:8000/catalog/download-template/
4. Public Catalog API:     http://127.0.0.1:8000/catalog/
5. Swagger API Docs:       http://127.0.0.1:8000/api/docs/
============================================================

System check identified no issues (0 silenced).
[IDENTITY] DELETE /profile/ -> token owner=acct@test.com role=shopper id=6afa5c59817021c1c7839dce | HTTP 200
test_delete_account_cascades_and_blocks_login 
(accounts.tests.AccountManagementTests.test_delete_account_cascades_and_blocks_login) ... FAIL
test_guest_cannot_view_profile (accounts.tests.AccountManagementTests.test_guest_cannot_view_profile) ... ok
test_password_change_success_and_login (accounts.tests.AccountManagementTests.test_password_change_success_and_login) 
... FAIL
test_password_change_wrong_current_rejected 
(accounts.tests.AccountManagementTests.test_password_change_wrong_current_rejected) ... FAIL
test_profile_payload_excludes_body_fields 
(accounts.tests.AccountManagementTests.test_profile_payload_excludes_body_fields)
[IDENTITY] GET /profile/ -> token owner=acct@test.com role=shopper id=6afa5c70817021c1c7839e22 | HTTP 200
Avatar refactor regression: body/skin data must NOT leak from /profile/. ... ok
[IDENTITY] PATCH /profile/ -> token owner=acct@test.com role=shopper id=6afa5c76817021c1c7839e36 | HTTP 200
test_update_profile (accounts.tests.AccountManagementTests.test_update_profile) ... ok
test_update_profile_ignores_legacy_body_fields 
(accounts.tests.AccountManagementTests.test_update_profile_ignores_legacy_body_fields)
[IDENTITY] PATCH /profile/ -> token owner=acct@test.com role=shopper id=6afa5c7c817021c1c7839e4a | HTTP 200
Legacy clients sending body fields get them silently ignored (no crash). ... ok
[IDENTITY] GET /profile/ -> token owner=acct@test.com role=shopper id=6afa5c83817021c1c7839e5e | HTTP 200
test_view_profile (accounts.tests.AccountManagementTests.test_view_profile) ... ok
[IDENTITY] POST /presets/ -> token owner=preset@test.com role=shopper id=6afa5c89817021c1c7839e72 | HTTP 201
test_create_preset (accounts.tests.AvatarPresetCRUDTests.test_create_preset) ... ok
test_guest_rejected (accounts.tests.AvatarPresetCRUDTests.test_guest_rejected) ... ok
[IDENTITY] POST /presets/ -> token owner=preset@test.com role=shopper id=6afa5c96817021c1c7839e9d | HTTP 201
[IDENTITY] GET /presets/ -> token owner=other@test.com role=shopper id=6afa5c97817021c1c7839e9e | HTTP 200
test_list_returns_only_own_presets (accounts.tests.AvatarPresetCRUDTests.test_list_returns_only_own_presets) ... ok
[IDENTITY] POST /presets/ -> token owner=preset@test.com role=shopper id=6afa5c9d817021c1c7839eb3 | HTTP 400
test_male_with_cup_size_rejected (accounts.tests.AvatarPresetCRUDTests.test_male_with_cup_size_rejected) ... ok
[IDENTITY] POST /presets/ -> token owner=preset@test.com role=shopper id=6afa5ca4817021c1c7839ec8 | HTTP 201
[IDENTITY] PATCH /presets/6afa5ca5817021c1c7839eca/ -> token owner=other@test.com role=shopper id=6afa5ca5817021c1c7839ec9 | HTTP 404
[IDENTITY] DELETE /presets/6afa5ca5817021c1c7839eca/ -> token owner=other@test.com role=shopper id=6afa5ca5817021c1c7839ec9 | HTTP 404
test_other_user_cannot_update_or_delete (accounts.tests.AvatarPresetCRUDTests.test_other_user_cannot_update_or_delete) 
... ok
[IDENTITY] POST /auth/change-password/ -> token owner=password-seller@test.com role=seller id=6afa5cac817021c1c7839ede | HTTP 200
test_seller_password_change_is_persisted 
(accounts.tests.PasswordChangePersistenceTests.test_seller_password_change_is_persisted) ... ok
[IDENTITY] POST /auth/change-password/ -> token owner=password-shopper@test.com role=shopper id=6afa5cb6817021c1c7839ef2 | HTTP 200
test_shopper_password_change_is_persisted 
(accounts.tests.PasswordChangePersistenceTests.test_shopper_password_change_is_persisted) ... ok
test_ping_result_never_contains_the_connection_uri 
(accounts.tests.DatabasePingRedactionTests.test_ping_result_never_contains_the_connection_uri) ... ok
test_delete_falls_back_to_filename_for_non_object_id_keys 
(accounts.tests.GridFSStorageDeletionTests.test_delete_falls_back_to_filename_for_non_object_id_keys) ... ok
test_delete_finds_object_id_backed_image_fields 
(accounts.tests.GridFSStorageDeletionTests.test_delete_finds_object_id_backed_image_fields) ... ok
test_delete_is_a_noop_when_the_file_is_already_absent 
(accounts.tests.GridFSStorageDeletionTests.test_delete_is_a_noop_when_the_file_is_already_absent) ... 
  test_delete_is_a_noop_when_the_file_is_already_absent 
(accounts.tests.GridFSStorageDeletionTests.test_delete_is_a_noop_when_the_file_is_already_absent) 
(key='507f1f77bcf86cd799439011') ... FAIL
  test_delete_is_a_noop_when_the_file_is_already_absent 
(accounts.tests.GridFSStorageDeletionTests.test_delete_is_a_noop_when_the_file_is_already_absent) 
(key='catalog/front/legacy.png') ... FAIL
test_delete_propagates_failure_when_gridfs_is_unavailable 
(accounts.tests.GridFSStorageDeletionTests.test_delete_propagates_failure_when_gridfs_is_unavailable) ... FAIL

======================================================================
FAIL: test_delete_account_cascades_and_blocks_login 
(accounts.tests.AccountManagementTests.test_delete_account_cascades_and_blocks_login)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\AppData\Local\Python\pythoncore-3.13-64\Lib\unittest\mock.py", line 1432, in patched
    return func(*newargs, **newkeywargs)
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\accounts\tests.py", line 172, in 
test_delete_account_cascades_and_blocks_login
    self.assertEqual(res.status_code, 204)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 200 != 204

======================================================================
FAIL: test_password_change_success_and_login 
(accounts.tests.AccountManagementTests.test_password_change_success_and_login)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\accounts\tests.py", line 137, in 
test_password_change_success_and_login
    self.assertEqual(res.status_code, 200)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 404 != 200

======================================================================
FAIL: test_password_change_wrong_current_rejected 
(accounts.tests.AccountManagementTests.test_password_change_wrong_current_rejected)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\accounts\tests.py", line 131, in 
test_password_change_wrong_current_rejected
    self.assertEqual(res.status_code, 400)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 404 != 400

======================================================================
FAIL: test_delete_is_a_noop_when_the_file_is_already_absent 
(accounts.tests.GridFSStorageDeletionTests.test_delete_is_a_noop_when_the_file_is_already_absent) 
(key='507f1f77bcf86cd799439011')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\accounts\tests.py", line 313, in 
test_delete_is_a_noop_when_the_file_is_already_absent
    with self.assertLogs('accounts.storage', level='WARNING') as logs:
         ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\seth\AppData\Local\Python\pythoncore-3.13-64\Lib\unittest\_log.py", line 84, in __exit__
    self._raiseFailure(
    ~~~~~~~~~~~~~~~~~~^
        "no logs of level {} or higher triggered on {}"
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        .format(logging.getLevelName(self.level), self.logger.name))
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: no logs of level WARNING or higher triggered on accounts.storage

======================================================================
FAIL: test_delete_is_a_noop_when_the_file_is_already_absent 
(accounts.tests.GridFSStorageDeletionTests.test_delete_is_a_noop_when_the_file_is_already_absent) 
(key='catalog/front/legacy.png')
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\accounts\tests.py", line 313, in 
test_delete_is_a_noop_when_the_file_is_already_absent
    with self.assertLogs('accounts.storage', level='WARNING') as logs:
         ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\seth\AppData\Local\Python\pythoncore-3.13-64\Lib\unittest\_log.py", line 84, in __exit__
    self._raiseFailure(
    ~~~~~~~~~~~~~~~~~~^
        "no logs of level {} or higher triggered on {}"
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
        .format(logging.getLevelName(self.level), self.logger.name))
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: no logs of level WARNING or higher triggered on accounts.storage

======================================================================
FAIL: test_delete_propagates_failure_when_gridfs_is_unavailable 
(accounts.tests.GridFSStorageDeletionTests.test_delete_propagates_failure_when_gridfs_is_unavailable)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\accounts\tests.py", line 293, in 
test_delete_propagates_failure_when_gridfs_is_unavailable
    with self.assertRaises(FileNotFoundError):
         ~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^
AssertionError: FileNotFoundError not raised

----------------------------------------------------------------------
Ran 20 tests in 102.414s

FAILED (failures=6)
Destroying test database for alias 'default' ('test_fitfusion')...
```

## catalog - `python manage.py test catalog -v 2`

- UTC start: see `20261116T013042Z-catalog.log`
- Result: 53 tests; 49 passed; 4 failures; 0 errors; command exited 1.
- Full raw log: `docs/evidence/_runs/20261116T013042Z-catalog.log`

## Complete captured command output

```text
python : Creating test database for alias 'default' ('test_fitfusion')...
At line:2 char:1002
+ ... global:LASTEXITCODE = 0; python manage.py test $app -v 2 2>&1 | Tee-O ...
+                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Creating test d..._fitfusion')...:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 

Found 53 test(s).
Operations to perform:
  Synchronize unmigrated apps: corsheaders, drf_spectacular, messages, rest_framework, rest_framework_simplejwt, staticfiles
  Apply all migrations: accounts, admin, auth, catalog, commerce, contenttypes, outfits, ratings, sessions
Synchronizing apps without migrations:
  Creating tables...
    Running deferred SQL...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0001_initial... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying auth.0007_alter_validators_add_error_messages... OK
  Applying auth.0008_alter_user_username_max_length... OK
  Applying auth.0009_alter_user_last_name_max_length... OK
  Applying auth.0010_alter_group_name_max_length... OK
  Applying auth.0011_update_proxy_permissions... OK
  Applying auth.0012_alter_user_first_name_max_length... OK
  Applying auth.0013_alter_group_id_alter_permission_id_alter_user_id... OK
  Applying accounts.0001_initial... OK
  Applying accounts.0002_remove_user_body_proportions_remove_user_height_and_more... OK
  Applying accounts.0003_archiveduser_user_archived_at_user_status_and_more... OK
  Applying accounts.0004_remove_archiveduser_retention_expires_at... OK
  Applying accounts.0005_user_fitting_studio_surveys... OK
  Applying accounts.0006_remove_user_fitting_studio_surveys_and_more... OK
  Applying accounts.0007_user_latest_fitting_studio_survey... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying admin.0004_alter_logentry_id... OK
  Applying catalog.0001_initial... OK
  Applying catalog.0002_catalogitem_size_max_cm_catalogitem_size_min_cm... OK
  Applying catalog.0003_remove_catalogitem_size_max_cm_and_more... OK
  Applying catalog.0004_remove_catalogitem_side_image... OK
  Applying catalog.0005_alter_catalogitem_category... OK
  Applying commerce.0001_initial... OK
  Applying commerce.0002_order_contact_number_order_recipient_name_and_more... OK
  Applying commerce.0003_order_recipient_email... OK
  Applying commerce.0004_order_order_number... OK
  Applying commerce.0005_order_user_nullable... OK
  Applying commerce.0006_cartitem_catalog_item_id_cartitem_item_name_and_more... OK
  Applying contenttypes.0003_alter_contenttype_id... OK
  Applying outfits.0001_initial... OK
  Applying outfits.0002_outfit_avatar_cup_size_outfit_avatar_gender_and_more... OK
  Applying outfits.0003_avatarpreset_body_build_cm_avatarpreset_style_focus_and_more... OK
  Applying ratings.0001_initial... OK
  Applying ratings.0002_alter_rating_unique_together_rating_source_and_more... OK
  Applying ratings.0003_uatsession_uatresponse... OK
  Applying ratings.0004_rename_uat_response_session_product_idx_uat_respons_session_a26510_idx_and_more... OK
test_batch_commit_persists_processed_image_names 
(catalog.tests.CatalogBatchGuardTests.test_batch_commit_persists_processed_image_names)
  Applying sessions.0001_initial... OK

============================================================
FITFUSION AI SERVER IS RUNNING!
============================================================
Available Test Links:
1. Test Upload Page:       http://127.0.0.1:8000/test-upload/
2. Django Admin:           http://127.0.0.1:8000/admin/
3. Download CSV Template:  http://127.0.0.1:8000/catalog/download-template/
4. Public Catalog API:     http://127.0.0.1:8000/catalog/
5. Swagger API Docs:       http://127.0.0.1:8000/api/docs/
============================================================

System check identified no issues (0 silenced).
[IDENTITY] POST /catalog/upload/ -> token owner=batch-seller@test.com role=seller id=6afa5ce07f9a45ab9309073b | HTTP 202
Guards the orphan trap: _commit_item must carry the new image names. ... ok
test_batch_deferred_purge_failure_is_attributable_to_the_listing 
(catalog.tests.CatalogBatchGuardTests.test_batch_deferred_purge_failure_is_attributable_to_the_listing)
[IDENTITY] POST /catalog/upload/ -> token owner=batch-seller@test.com role=seller id=6afa5ce77f9a45ab93090755 | HTTP 202
A failed deferred purge must name the listing, not log item=None. ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=batch-seller@test.com role=seller id=6afa5cee7f9a45ab9309076f | HTTP 202
test_delete_during_batch_processing_does_not_resurrect_item 
(catalog.tests.CatalogBatchGuardTests.test_delete_during_batch_processing_does_not_resurrect_item) ... ok
test_another_sellers_item_untouched_by_delete 
(catalog.tests.CatalogDeletePathTests.test_another_sellers_item_untouched_by_delete)
[IDENTITY] DELETE /catalog/my-listings/6afa5cf97f9a45ab9309078c/ -> token owner=del-seller@test.com role=seller id=6afa5cf67f9a45ab93090789 | HTTP 404
Owner-scoped 404: seller A cannot delete seller B's listing. ... ok
test_delete_with_gridfs_unreachable_succeeds_and_logs_error 
(catalog.tests.CatalogDeletePathTests.test_delete_with_gridfs_unreachable_succeeds_and_logs_error)
[IDENTITY] DELETE /catalog/my-listings/6afa5d017f9a45ab930907a3/ -> token owner=del-seller@test.com role=seller id=6afa5cff7f9a45ab930907a1 | HTTP 204
GridFS down during post_delete -> row still deleted, ERROR logged, never 500. ... ok
test_queryset_delete_removes_both_blobs_and_detach_intact 
(catalog.tests.CatalogDeletePathTests.test_queryset_delete_removes_both_blobs_and_detach_intact)
QuerySet.delete() -> receiver fires -> both blobs gone, cart detached, outfit through-row gone. ... ok
test_seller_cascade_removes_both_blobs (catalog.tests.CatalogDeletePathTests.test_seller_cascade_removes_both_blobs)
Deleting the seller CASCADEs through their listings -> receiver fires. ... ok
test_backup_excludes_referenced_blobs (catalog.tests.CatalogGridFSBackupTests.test_backup_excludes_referenced_blobs) 
... ok
test_backup_then_sweep_then_restore_round_trip 
(catalog.tests.CatalogGridFSBackupTests.test_backup_then_sweep_then_restore_round_trip) ... ok
test_backup_with_no_orphans_writes_nothing 
(catalog.tests.CatalogGridFSBackupTests.test_backup_with_no_orphans_writes_nothing) ... ok
test_restore_is_idempotent (catalog.tests.CatalogGridFSBackupTests.test_restore_is_idempotent) ... ok
test_sweep_delete_removes_orphans_only (catalog.tests.CatalogSweepOrphanTests.test_sweep_delete_removes_orphans_only) 
... ok
test_sweep_dry_run_does_not_delete (catalog.tests.CatalogSweepOrphanTests.test_sweep_dry_run_does_not_delete) ... ok
test_sweep_ignores_non_catalog_prefixes (catalog.tests.CatalogSweepOrphanTests.test_sweep_ignores_non_catalog_prefixes)
A blob under a different upload_to must never be touched. ... ok
test_sweep_is_idempotent (catalog.tests.CatalogSweepOrphanTests.test_sweep_is_idempotent) ... ok
test_delete_between_processing_and_commit_purges_new_images 
(catalog.tests.CatalogValidationAndCRUDTests.test_delete_between_processing_and_commit_purges_new_images)
[IDENTITY] PATCH /catalog/my-listings/6afa5d4a7f9a45ab930908a3/ -> token owner=seller@test.com role=seller id=6afa5d4a7f9a45ab930908a1 | HTTP 200
Row disappears AFTER the new PNGs are written but BEFORE the commit. ... ok
test_delete_during_revalidation_does_not_resurrect_item 
(catalog.tests.CatalogValidationAndCRUDTests.test_delete_during_revalidation_does_not_resurrect_item)
[IDENTITY] PATCH /catalog/my-listings/6afa5d527f9a45ab930908be/ -> token owner=seller@test.com role=seller id=6afa5d527f9a45ab930908bc | HTTP 200
Seller deletes the listing while rembg is still running. ... ok
[IDENTITY] DELETE /catalog/my-listings/6afa5d5a7f9a45ab930908d7/ -> token owner=seller@test.com role=seller id=6afa5d597f9a45ab930908d5 | HTTP 503
test_delete_refused_when_gridfs_unreachable_leaves_listing_intact 
(catalog.tests.CatalogValidationAndCRUDTests.test_delete_refused_when_gridfs_unreachable_leaves_listing_intact) ... ok
[IDENTITY] DELETE /catalog/my-listings/6afa5d617f9a45ab930908ef/ -> token owner=seller@test.com role=seller id=6afa5d607f9a45ab930908ed | HTTP 204
test_delete_without_images_still_succeeds_when_gridfs_unreachable 
(catalog.tests.CatalogValidationAndCRUDTests.test_delete_without_images_still_succeeds_when_gridfs_unreachable) ... ok
[IDENTITY] DELETE /catalog/my-listings/6afa5d677f9a45ab93090905/ -> token owner=seller@test.com role=seller id=6afa5d677f9a45ab93090903 | HTTP 204
test_deleting_listing_leaves_order_item_snapshots_intact 
(catalog.tests.CatalogValidationAndCRUDTests.test_deleting_listing_leaves_order_item_snapshots_intact) ... ok
[IDENTITY] DELETE /catalog/my-listings/6afa5d6e7f9a45ab9309091d/ -> token owner=seller@test.com role=seller id=6afa5d6d7f9a45ab9309091b | HTTP 204
test_deleting_listing_removes_both_stored_images 
(catalog.tests.CatalogValidationAndCRUDTests.test_deleting_listing_removes_both_stored_images) ... ok
test_download_package_contains_template_and_image_guidelines 
(catalog.tests.CatalogValidationAndCRUDTests.test_download_package_contains_template_and_image_guidelines) ... ok
test_download_template_contains_header_and_single_example_row 
(catalog.tests.CatalogValidationAndCRUDTests.test_download_template_contains_header_and_single_example_row) ... ok
[IDENTITY] PATCH /catalog/my-listings/6afa5d847f9a45ab9309095f/ -> token owner=seller@test.com role=seller id=6afa5d847f9a45ab9309095d | HTTP 200
test_edited_rejected_listing_stays_processing_until_pipeline_passes 
(catalog.tests.CatalogValidationAndCRUDTests.test_edited_rejected_listing_stays_processing_until_pipeline_passes) ... 
ok
test_guest_cannot_upload (catalog.tests.CatalogValidationAndCRUDTests.test_guest_cannot_upload) ... ok
test_old_image_cleanup_failure_does_not_strand_processing 
(catalog.tests.CatalogValidationAndCRUDTests.test_old_image_cleanup_failure_does_not_strand_processing)
[IDENTITY] PATCH /catalog/my-listings/6afa5d917f9a45ab9309098a/ -> token owner=seller@test.com role=seller id=6afa5d917f9a45ab93090988 | HTTP 200
An unreachable bucket during old-image cleanup must not block the pipeline. ... ok
test_partial_replacement_write_is_compensated 
(catalog.tests.CatalogValidationAndCRUDTests.test_partial_replacement_write_is_compensated)
[IDENTITY] PATCH /catalog/my-listings/6afa5d987f9a45ab930909a5/ -> token owner=seller@test.com role=seller id=6afa5d987f9a45ab930909a3 | HTTP 503
Front succeeds, rear fails: the new front must be purged, originals kept. ... ok
[IDENTITY] PATCH /catalog/my-listings/6afa5d9f7f9a45ab930909be/ -> token owner=seller@test.com role=seller id=6afa5d9f7f9a45ab930909bc | HTTP 503
test_pipeline_submission_failure_does_not_leave_item_processing 
(catalog.tests.CatalogValidationAndCRUDTests.test_pipeline_submission_failure_does_not_leave_item_processing) ... ok
test_public_catalog_style_filter_matches_json_array_tags 
(catalog.tests.CatalogValidationAndCRUDTests.test_public_catalog_style_filter_matches_json_array_tags) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=user@test.com role=user id=6afa5dad7f9a45ab930909ed | HTTP 403

==============================================================================
⚠️ RBAC DENY 403 on seller endpoint /catalog/upload/
  token owner: user@test.com (role=user)
  IsSeller correctly refused a non-seller token (FR-1.7).
  If the UI expected seller data here, the client is logged in
  as the WRONG user (stale token), not a backend permission bug.
==============================================================================

test_regular_user_cannot_upload (catalog.tests.CatalogValidationAndCRUDTests.test_regular_user_cannot_upload) ... ok
test_rejected_listing_with_missing_assets_cannot_be_promoted 
(catalog.tests.CatalogValidationAndCRUDTests.test_rejected_listing_with_missing_assets_cannot_be_promoted)
[IDENTITY] PATCH /catalog/my-listings/6afa5db57f9a45ab93090a03/ -> token owner=seller@test.com role=seller id=6afa5db47f9a45ab93090a01 | HTTP 200
Acceptance rule: a rejected item with no stored assets stays rejected. ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5dbb7f9a45ab93090a17 | HTTP 400
test_rejects_missing_view_images (catalog.tests.CatalogValidationAndCRUDTests.test_rejects_missing_view_images) ... ok
test_rejects_opaque_background_removal_output 
(catalog.tests.CatalogValidationAndCRUDTests.test_rejects_opaque_background_removal_output) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5dc77f9a45ab93090a41 | HTTP 400
test_rejects_oversized_image (catalog.tests.CatalogValidationAndCRUDTests.test_rejects_oversized_image) ... ok
[IDENTITY] PATCH /catalog/my-listings/6afa5dce7f9a45ab93090a58/ -> token owner=seller@test.com role=seller id=6afa5dce7f9a45ab93090a56 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5dce7f9a45ab93090a58/ -> token owner=seller@test.com role=seller id=6afa5dce7f9a45ab93090a56 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5dce7f9a45ab93090a58/ -> token owner=seller@test.com role=seller id=6afa5dce7f9a45ab93090a56 | HTTP 200
[IDENTITY] DELETE /catalog/my-listings/6afa5dce7f9a45ab93090a58/ -> token owner=seller@test.com role=seller id=6afa5dce7f9a45ab93090a56 | HTTP 204
test_repeated_replace_then_delete_leaves_no_orphaned_lineage 
(catalog.tests.CatalogValidationAndCRUDTests.test_repeated_replace_then_delete_leaves_no_orphaned_lineage) ... ok
[IDENTITY] PATCH /catalog/my-listings/6afa5dd87f9a45ab93090a79/ -> token owner=seller@test.com role=seller id=6afa5dd77f9a45ab93090a77 | HTTP 503
test_replacement_storage_failure_does_not_strand_processing 
(catalog.tests.CatalogValidationAndCRUDTests.test_replacement_storage_failure_does_not_strand_processing) ... ok
[IDENTITY] PATCH /catalog/my-listings/6afa5ddf7f9a45ab93090a91/ -> token owner=seller@test.com role=seller id=6afa5dde7f9a45ab93090a8f | HTTP 200
test_replacing_image_deletes_old_gridfs_object 
(catalog.tests.CatalogValidationAndCRUDTests.test_replacing_image_deletes_old_gridfs_object) ... ok
[IDENTITY] GET /catalog/my-listings/6afa5de67f9a45ab93090aac/ -> token owner=seller@test.com role=seller id=6afa5de57f9a45ab93090aaa | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5de67f9a45ab93090aac/ -> token owner=seller@test.com role=seller id=6afa5de57f9a45ab93090aaa | HTTP 200
[IDENTITY] DELETE /catalog/my-listings/6afa5de67f9a45ab93090aac/ -> token owner=seller@test.com role=seller id=6afa5de57f9a45ab93090aaa | HTTP 204
[IDENTITY] GET /catalog/my-listings/6afa5de67f9a45ab93090aac/ -> token owner=seller@test.com role=seller id=6afa5de57f9a45ab93090aaa | HTTP 404
test_seller_can_list_and_manage_own_items 
(catalog.tests.CatalogValidationAndCRUDTests.test_seller_can_list_and_manage_own_items) ... ok
[IDENTITY] PATCH /catalog/my-listings/6afa5def7f9a45ab93090ac2/ -> token owner=seller@test.com role=seller id=6afa5dee7f9a45ab93090ac0 | HTTP 200
test_seller_can_replace_image_and_it_revalidates 
(catalog.tests.CatalogValidationAndCRUDTests.test_seller_can_replace_image_and_it_revalidates) ... ok
[IDENTITY] GET /catalog/my-listings/6afa5df87f9a45ab93090add/ -> token owner=seller@test.com role=seller id=6afa5df67f9a45ab93090ada | HTTP 404
test_seller_cannot_manage_other_sellers_items 
(catalog.tests.CatalogValidationAndCRUDTests.test_seller_cannot_manage_other_sellers_items) ... ok
[IDENTITY] PATCH /catalog/my-listings/6afa5e007f9a45ab93090af3/ -> token owner=seller@test.com role=seller id=6afa5dfe7f9a45ab93090af1 | HTTP 200
test_seller_color_mismatch_rejects_listing_not_activates 
(catalog.tests.CatalogValidationAndCRUDTests.test_seller_color_mismatch_rejects_listing_not_activates) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5e077f9a45ab93090b0b | HTTP 202
test_successful_upload_derives_color_palette_tags 
(catalog.tests.CatalogValidationAndCRUDTests.test_successful_upload_derives_color_palette_tags) ... ok
[IDENTITY] GET /catalog/download-template/ -> token owner=seller@test.com role=seller id=6afa5e0e7f9a45ab93090b26 | HTTP 200
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5e0e7f9a45ab93090b26 | HTTP 202
test_upload_recognizes_header_after_template_instruction_rows 
(catalog.tests.CatalogValidationAndCRUDTests.test_upload_recognizes_header_after_template_instruction_rows) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5e167f9a45ab93090b3d | HTTP 202
[IDENTITY] GET /catalog/batch-report/ -> token owner=seller@test.com role=seller id=6afa5e167f9a45ab93090b3d | HTTP 200
test_upload_reports_csv_filename_mismatch 
(catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5e1e7f9a45ab93090b54 | HTTP 202
[IDENTITY] GET /catalog/batch-report/ -> token owner=seller@test.com role=seller id=6afa5e1e7f9a45ab93090b54 | HTTP 200
test_upload_reports_missing_fields_and_undersized_images 
(catalog.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images) ... ok
test_accepts_dominant_shade_of_declared_color 
(catalog.tests.CatalogColorAlignmentTests.test_accepts_dominant_shade_of_declared_color) ... ok
test_mismatch_message_carries_the_correct_color_to_declare 
(catalog.tests.CatalogColorAlignmentTests.test_mismatch_message_carries_the_correct_color_to_declare) ... FAIL
test_muted_blue_gray_denim_now_passes_as_blue 
(catalog.tests.CatalogColorAlignmentTests.test_muted_blue_gray_denim_now_passes_as_blue) ... ok
test_rejects_a_different_dominant_color 
(catalog.tests.CatalogColorAlignmentTests.test_rejects_a_different_dominant_color) ... ok
test_suggestion_names_the_passing_color_for_denim 
(catalog.tests.CatalogColorAlignmentTests.test_suggestion_names_the_passing_color_for_denim) ... FAIL
test_unmapped_hue_suggests_nearest_family_and_passes_when_declared 
(catalog.tests.CatalogColorAlignmentTests.test_unmapped_hue_suggests_nearest_family_and_passes_when_declared) ... ok
test_accepts_approved_comma_separated_tags_case_insensitively 
(catalog.tests.CatalogTagValidationTests.test_accepts_approved_comma_separated_tags_case_insensitively) ... FAIL
test_rejects_unapproved_style_and_occasion_tags 
(catalog.tests.CatalogTagValidationTests.test_rejects_unapproved_style_and_occasion_tags) ... FAIL

======================================================================
FAIL: test_mismatch_message_carries_the_correct_color_to_declare 
(catalog.tests.CatalogColorAlignmentTests.test_mismatch_message_carries_the_correct_color_to_declare)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\catalog\tests.py", line 301, in 
test_mismatch_message_carries_the_correct_color_to_declare
    self.assertIn('Correct color to declare: "Blue"', message)
    ~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 'Correct color to declare: "Blue"' not found in 'Color mismatch: declared \'Red\' but the image\'s 
dominant color is #1e4fd8. Correct color to declare: "blue" (color family: blue).'

======================================================================
FAIL: test_suggestion_names_the_passing_color_for_denim 
(catalog.tests.CatalogColorAlignmentTests.test_suggestion_names_the_passing_color_for_denim)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\catalog\tests.py", line 294, in 
test_suggestion_names_the_passing_color_for_denim
    self.assertEqual(suggestion['name'], 'Blue')
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 'blue' != 'Blue'
- blue
? ^
+ Blue
? ^


======================================================================
FAIL: test_accepts_approved_comma_separated_tags_case_insensitively 
(catalog.tests.CatalogTagValidationTests.test_accepts_approved_comma_separated_tags_case_insensitively)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\catalog\tests.py", line 329, in 
test_accepts_approved_comma_separated_tags_case_insensitively
    self.assertTrue(is_valid)
    ~~~~~~~~~~~~~~~^^^^^^^^^^
AssertionError: False is not true

======================================================================
FAIL: test_rejects_unapproved_style_and_occasion_tags 
(catalog.tests.CatalogTagValidationTests.test_rejects_unapproved_style_and_occasion_tags)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\catalog\tests.py", line 338, in 
test_rejects_unapproved_style_and_occasion_tags
    self.assertTrue(any('not-an-occasion' in error and 'occasion_tags' in error for error in errors))
    ~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: False is not true

----------------------------------------------------------------------
Ran 53 tests in 325.085s

FAILED (failures=4)
Destroying test database for alias 'default' ('test_fitfusion')...
```
