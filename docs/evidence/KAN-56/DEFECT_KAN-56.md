# Blocked test evidence: KAN-56

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
