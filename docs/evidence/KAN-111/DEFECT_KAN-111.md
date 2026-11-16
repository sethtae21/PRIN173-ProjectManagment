# Blocked test evidence: KAN-111

Commit: `389a0deccfb3677fa2b374098dfbdaa746e72885`; Python 3.13.15; Django 6.0.8; `PYTHONIOENCODING=utf-8` set for the one-time runs.

## recommendations - `python manage.py test recommendations -v 2`

- UTC start: see `20261116T013640Z-recommendations.log`
- Result: 28 tests; 24 passed; 3 failures; 1 error; command exited 1.
- Full raw log: `docs/evidence/_runs/20261116T013640Z-recommendations.log`

## Complete captured command output

```text
python : Creating test database for alias 'default' ('test_fitfusion')...
At line:2 char:1002
+ ... global:LASTEXITCODE = 0; python manage.py test $app -v 2 2>&1 | Tee-O ...
+                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : NotSpecified: (Creating test d..._fitfusion')...:String) [], RemoteException
    + FullyQualifiedErrorId : NativeCommandError
 

Found 28 test(s).
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
recommendations.tests_weights (unittest.loader._FailedTest.recommendations.tests_weights) ... ERROR
test_download_package_contains_template_and_image_guidelines 
(recommendations.tests.CatalogValidationAndCRUDTests.test_download_package_contains_template_and_image_guidelines) ... 
ok
test_download_template_contains_header_and_single_example_row 
(recommendations.tests.CatalogValidationAndCRUDTests.test_download_template_contains_header_and_single_example_row) 
... ok
test_guest_cannot_upload (recommendations.tests.CatalogValidationAndCRUDTests.test_guest_cannot_upload) ... ok
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
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 400
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 400
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 400
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 400
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 400
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 400
[IDENTITY] PATCH /catalog/my-listings/6afa5e5b26814fa3a3f09c68/ -> token owner=seller@test.com role=seller id=6afa5e5a26814fa3a3f09c66 | HTTP 400
test_patch_accepts_extended_sizes_and_rejects_legacy_formats 
(recommendations.tests.CatalogValidationAndCRUDTests.test_patch_accepts_extended_sizes_and_rejects_legacy_formats) ... 
ok
test_public_catalog_style_filter_matches_json_array_tags 
(recommendations.tests.CatalogValidationAndCRUDTests.test_public_catalog_style_filter_matches_json_array_tags) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=user@test.com role=user id=6afa5e6b26814fa3a3f09c94 | HTTP 403

==============================================================================
⚠️ RBAC DENY 403 on seller endpoint /catalog/upload/
  token owner: user@test.com (role=user)
  IsSeller correctly refused a non-seller token (FR-1.7).
  If the UI expected seller data here, the client is logged in
  as the WRONG user (stale token), not a backend permission bug.
==============================================================================

test_regular_user_cannot_upload (recommendations.tests.CatalogValidationAndCRUDTests.test_regular_user_cannot_upload) 
... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5e7126814fa3a3f09ca8 | HTTP 400
test_rejects_missing_view_images 
(recommendations.tests.CatalogValidationAndCRUDTests.test_rejects_missing_view_images) ... ok
test_rejects_opaque_background_removal_output 
(recommendations.tests.CatalogValidationAndCRUDTests.test_rejects_opaque_background_removal_output) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5e8126814fa3a3f09cd2 | HTTP 400
test_rejects_oversized_image (recommendations.tests.CatalogValidationAndCRUDTests.test_rejects_oversized_image) ... ok
[IDENTITY] GET /catalog/my-listings/6afa5e8926814fa3a3f09ce9/ -> token owner=seller@test.com role=seller id=6afa5e8826814fa3a3f09ce7 | HTTP 200
[IDENTITY] PATCH /catalog/my-listings/6afa5e8926814fa3a3f09ce9/ -> token owner=seller@test.com role=seller id=6afa5e8826814fa3a3f09ce7 | HTTP 200
[IDENTITY] DELETE /catalog/my-listings/6afa5e8926814fa3a3f09ce9/ -> token owner=seller@test.com role=seller id=6afa5e8826814fa3a3f09ce7 | HTTP 204
[IDENTITY] GET /catalog/my-listings/6afa5e8926814fa3a3f09ce9/ -> token owner=seller@test.com role=seller id=6afa5e8826814fa3a3f09ce7 | HTTP 404
test_seller_can_list_and_manage_own_items 
(recommendations.tests.CatalogValidationAndCRUDTests.test_seller_can_list_and_manage_own_items) ... ok
[IDENTITY] PATCH /catalog/my-listings/6afa5e9226814fa3a3f09cff/ -> token owner=seller@test.com role=seller id=6afa5e9126814fa3a3f09cfd | HTTP 200
test_seller_can_replace_image_and_mismatch_does_not_partially_update (recommendations.tests.CatalogValidationAndCRUDTes
ts.test_seller_can_replace_image_and_mismatch_does_not_partially_update) ... FAIL
[IDENTITY] GET /catalog/my-listings/6afa5e9b26814fa3a3f09d1b/ -> token owner=seller@test.com role=seller id=6afa5e9a26814fa3a3f09d18 | HTTP 404
test_seller_cannot_manage_other_sellers_items 
(recommendations.tests.CatalogValidationAndCRUDTests.test_seller_cannot_manage_other_sellers_items) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5ea226814fa3a3f09d2f | HTTP 202
test_successful_upload_derives_color_palette_tags 
(recommendations.tests.CatalogValidationAndCRUDTests.test_successful_upload_derives_color_palette_tags) ... ok
[IDENTITY] GET /catalog/download-template/ -> token owner=seller@test.com role=seller id=6afa5eae26814fa3a3f09d4e | HTTP 200
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5eae26814fa3a3f09d4e | HTTP 202
test_upload_recognizes_header_after_template_instruction_rows 
(recommendations.tests.CatalogValidationAndCRUDTests.test_upload_recognizes_header_after_template_instruction_rows) 
... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5eb626814fa3a3f09d65 | HTTP 202
[IDENTITY] GET /catalog/batch-report/ -> token owner=seller@test.com role=seller id=6afa5eb626814fa3a3f09d65 | HTTP 200
test_upload_reports_csv_filename_mismatch 
(recommendations.tests.CatalogValidationAndCRUDTests.test_upload_reports_csv_filename_mismatch) ... ok
[IDENTITY] POST /catalog/upload/ -> token owner=seller@test.com role=seller id=6afa5ebf26814fa3a3f09d7c | HTTP 202
[IDENTITY] GET /catalog/batch-report/ -> token owner=seller@test.com role=seller id=6afa5ebf26814fa3a3f09d7c | HTTP 200
test_upload_reports_missing_fields_and_undersized_images 
(recommendations.tests.CatalogValidationAndCRUDTests.test_upload_reports_missing_fields_and_undersized_images) ... ok
test_accepts_dominant_shade_of_declared_color 
(recommendations.tests.CatalogColorAlignmentTests.test_accepts_dominant_shade_of_declared_color) ... ok
test_mismatch_message_carries_the_correct_color_to_declare 
(recommendations.tests.CatalogColorAlignmentTests.test_mismatch_message_carries_the_correct_color_to_declare) ... FAIL
test_muted_blue_gray_denim_now_passes_as_blue 
(recommendations.tests.CatalogColorAlignmentTests.test_muted_blue_gray_denim_now_passes_as_blue) ... ok
test_rejects_a_different_dominant_color 
(recommendations.tests.CatalogColorAlignmentTests.test_rejects_a_different_dominant_color) ... ok
test_suggestion_names_the_passing_color_for_denim 
(recommendations.tests.CatalogColorAlignmentTests.test_suggestion_names_the_passing_color_for_denim) ... FAIL
test_unmapped_hue_suggests_nearest_family_and_passes_when_declared 
(recommendations.tests.CatalogColorAlignmentTests.test_unmapped_hue_suggests_nearest_family_and_passes_when_declared) 
... ok
test_accepts_all_standard_clothing_sizes 
(recommendations.tests.CatalogSizePolicyTests.test_accepts_all_standard_clothing_sizes) ... ok
test_rejects_footwear_category (recommendations.tests.CatalogSizePolicyTests.test_rejects_footwear_category) ... ok
test_rejects_measured_and_nonstandard_sizes 
(recommendations.tests.CatalogSizePolicyTests.test_rejects_measured_and_nonstandard_sizes) ... ok
test_accepts_approved_comma_separated_tags_case_insensitively 
(recommendations.tests.CatalogTagValidationTests.test_accepts_approved_comma_separated_tags_case_insensitively) ... ok
test_rejects_unapproved_style_tags 
(recommendations.tests.CatalogTagValidationTests.test_rejects_unapproved_style_tags) ... ok

======================================================================
ERROR: recommendations.tests_weights (unittest.loader._FailedTest.recommendations.tests_weights)
----------------------------------------------------------------------
ImportError: Failed to import test module: recommendations.tests_weights
Traceback (most recent call last):
  File "C:\Users\seth\AppData\Local\Python\pythoncore-3.13-64\Lib\unittest\loader.py", line 403, in _find_test_path
    module = self._get_module_from_name(name)
  File "C:\Users\seth\AppData\Local\Python\pythoncore-3.13-64\Lib\unittest\loader.py", line 346, in 
_get_module_from_name
    __import__(name)
    ~~~~~~~~~~^^^^^^
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\recommendations\tests_weights.py", line 41, in 
<module>
    from recommendations.knowledge_table import (
    ...<2 lines>...
    )
ImportError: cannot import name 'CONTRAST_BY_HEIGHT' from 'recommendations.knowledge_table' 
(C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\recommendations\knowledge_table.py)


======================================================================
FAIL: test_seller_can_replace_image_and_mismatch_does_not_partially_update (recommendations.tests.CatalogValidationAndC
RUDTests.test_seller_can_replace_image_and_mismatch_does_not_partially_update)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\recommendations\tests.py", line 448, in 
test_seller_can_replace_image_and_mismatch_does_not_partially_update
    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 200 != 400

======================================================================
FAIL: test_mismatch_message_carries_the_correct_color_to_declare 
(recommendations.tests.CatalogColorAlignmentTests.test_mismatch_message_carries_the_correct_color_to_declare)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\recommendations\tests.py", line 44, in 
test_mismatch_message_carries_the_correct_color_to_declare
    self.assertIn('Correct color to declare: "Blue"', message)
    ~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 'Correct color to declare: "Blue"' not found in 'Color mismatch: declared \'Red\' but the image\'s 
dominant color is #1e4fd8. Correct color to declare: "blue" (color family: blue).'

======================================================================
FAIL: test_suggestion_names_the_passing_color_for_denim 
(recommendations.tests.CatalogColorAlignmentTests.test_suggestion_names_the_passing_color_for_denim)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\recommendations\tests.py", line 37, in 
test_suggestion_names_the_passing_color_for_denim
    self.assertEqual(suggestion['name'], 'Blue')
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 'blue' != 'Blue'
- blue
? ^
+ Blue
? ^


----------------------------------------------------------------------
Ran 28 tests in 128.576s

FAILED (failures=3, errors=1)
Destroying test database for alias 'default' ('test_fitfusion')...
```
