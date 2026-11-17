# KAN-49 historical backend test failures (resolved)

This file preserves complete raw outputs from failed ratings attempts. The
latest ratings run, `docs/evidence/_runs/20261117T100832Z-ratings.log`, passed
all 57 tests after correcting stale archival-test expectations. The current
ticket result is PASS; see `docs/evidence/EVIDENCE_INDEX.md`.

The earlier failed ratings attempt is also preserved in
`docs/evidence/_runs/20261117T095641Z-ratings.log`.

## Preserved failed attempt

- Command: `python manage.py test ratings -v 2`
- UTC: `2026-11-17T10:03:48.021433Z`
- Commit: `cbb6eab779dd61025214f68102867c342acd6351`

Complete raw suite output (including traceback):

```text
Creating test database for alias 'default' ('test_fitfusion')...

Found 57 test(s).
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
  Applying accounts.0001_initial... OK
  Applying accounts.0002_remove_user_body_proportions_remove_user_height_and_more... OK
  Applying accounts.0003_archiveduser_user_archived_at_user_status_and_more... OK
  Applying accounts.0004_remove_archiveduser_retention_expires_at... OK
  Applying accounts.0005_user_fitting_studio_surveys... OK
  Applying accounts.0006_remove_user_fitting_studio_surveys_and_more... OK
  Applying accounts.0007_user_latest_fitting_studio_survey... OK
  Applying accounts.0008_replace_fit_vote_with_score... OK
  Applying accounts.0009_fit_rating_and_validators... OK
  Applying accounts.0010_remove_survey_user_type... OK
  Applying accounts.0011_unique_fitting_survey_session... OK
  Applying accounts.0012_pseudonymize_archiveduser... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying admin.0004_alter_logentry_id... OK
  Applying auth.0013_alter_group_id_alter_permission_id_alter_user_id... OK
  Applying catalog.0001_initial... OK
  Applying catalog.0002_catalogitem_size_max_cm_catalogitem_size_min_cm... OK
  Applying catalog.0003_remove_catalogitem_size_max_cm_and_more... OK
  Applying catalog.0004_remove_catalogitem_side_image... OK
  Applying catalog.0005_alter_catalogitem_category... OK
  Applying catalog.0006_remove_catalogitem_occasion_tags... OK
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
  Applying ratings.0005_star_only_ratings... OK
  Applying sessions.0001_initial...test_boolean_rejected (ratings.tests.RatingAPITests.test_boolean_rejected) ...  OK

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
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc269328ec70cc5de9fee0 | HTTP 400
ok
test_float_rejected (ratings.tests.RatingAPITests.test_float_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc269728ec70cc5de9fef6 | HTTP 400
ok
test_guest_session_clear_still_safe (ratings.tests.RatingAPITests.test_guest_session_clear_still_safe) ... ok
test_guest_submit_rejected_and_not_persisted (ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted)
Guest rating attempts are rejected with 403, nothing is persisted ... ok
test_mine_returns_only_own_stars (ratings.tests.RatingAPITests.test_mine_returns_only_own_stars) ... [IDENTITY] GET /ratings/mine/ -> token owner=rater@test.com role=shopper id=6afc26a128ec70cc5de9ff38 | HTTP 200
ok
test_missing_score_rejected (ratings.tests.RatingAPITests.test_missing_score_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26a428ec70cc5de9ff50 | HTTP 400
ok
test_model_has_no_vote_field (ratings.tests.RatingAPITests.test_model_has_no_vote_field) ... ok
test_numeric_string_rejected_not_coerced (ratings.tests.RatingAPITests.test_numeric_string_rejected_not_coerced) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26ab28ec70cc5de9ff7c | HTTP 400
ok
test_owner_only_update_delete (ratings.tests.RatingAPITests.test_owner_only_update_delete) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26ae28ec70cc5de9ff92 | HTTP 201
[IDENTITY] PATCH /ratings/6afc26af28ec70cc5de9ff95/ -> token owner=other@test.com role=shopper id=6afc26af28ec70cc5de9ff93 | HTTP 404
[IDENTITY] DELETE /ratings/6afc26af28ec70cc5de9ff95/ -> token owner=other@test.com role=shopper id=6afc26af28ec70cc5de9ff93 | HTTP 404
[IDENTITY] DELETE /ratings/6afc26af28ec70cc5de9ff95/ -> token owner=rater@test.com role=shopper id=6afc26ae28ec70cc5de9ff92 | HTTP 204
ok
test_rating_never_required_for_core_flow (ratings.tests.RatingAPITests.test_rating_never_required_for_core_flow) ... ok
test_score_plus_like_or_dislike_keys_rejected (ratings.tests.RatingAPITests.test_score_plus_like_or_dislike_keys_rejected)
Legacy boolean-style reaction keys are also rejected. ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26b528ec70cc5de9ffbf | HTTP 400
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26b528ec70cc5de9ffbf | HTTP 400
ok
test_score_plus_vote_rejected_not_silently_dropped (ratings.tests.RatingAPITests.test_score_plus_vote_rejected_not_silently_dropped)
A valid star score must NOT let a legacy `vote` key through. ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26b928ec70cc5de9ffd5 | HTTP 400
ok
test_score_six_rejected (ratings.tests.RatingAPITests.test_score_six_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26bc28ec70cc5de9ffeb | HTTP 400
ok
test_score_zero_rejected (ratings.tests.RatingAPITests.test_score_zero_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26c028ec70cc5dea0001 | HTTP 400
ok
test_seller_cannot_delete_any_rating (ratings.tests.RatingAPITests.test_seller_cannot_delete_any_rating)
Shopper-only RBAC closes the create/delete asymmetry. ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26c328ec70cc5dea0017 | HTTP 201
[IDENTITY] DELETE /ratings/6afc26c428ec70cc5dea001a/ -> token owner=seller@test.com role=seller id=6afc26c428ec70cc5dea0019 | HTTP 403
ok
test_seller_submit_rejected_and_not_persisted (ratings.tests.RatingAPITests.test_seller_submit_rejected_and_not_persisted) ... [IDENTITY] POST /ratings/ -> token owner=seller@test.com role=seller id=6afc26c728ec70cc5dea0030 | HTTP 403
ok
test_source_field_allows_multi_surface_ratings (ratings.tests.RatingAPITests.test_source_field_allows_multi_surface_ratings) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26ca28ec70cc5dea0044 | HTTP 201
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26ca28ec70cc5dea0044 | HTTP 201
ok
test_source_required (ratings.tests.RatingAPITests.test_source_required) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26ce28ec70cc5dea005c | HTTP 400
ok
test_star_persists (ratings.tests.RatingAPITests.test_star_persists) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26d128ec70cc5dea0072 | HTTP 201
ok
test_summary_approval_threshold_is_four (ratings.tests.RatingAPITests.test_summary_approval_threshold_is_four) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26d528ec70cc5dea0089 | HTTP 201
[IDENTITY] GET /ratings/summary/ -> token owner=rater@test.com role=shopper id=6afc26d528ec70cc5dea0089 | HTTP 200
ok
test_summary_filters_by_source_and_counts_approvals (ratings.tests.RatingAPITests.test_summary_filters_by_source_and_counts_approvals) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26d828ec70cc5dea00a0 | HTTP 201
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26d828ec70cc5dea00a0 | HTTP 201
[IDENTITY] GET /ratings/summary/ -> token owner=rater@test.com role=shopper id=6afc26d828ec70cc5dea00a0 | HTTP 200
[IDENTITY] GET /ratings/summary/ -> token owner=rater@test.com role=shopper id=6afc26d828ec70cc5dea00a0 | HTTP 200
ok
test_undocumented_or_empty_source_rejected (ratings.tests.RatingAPITests.test_undocumented_or_empty_source_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26dc28ec70cc5dea00b8 | HTTP 400
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26dc28ec70cc5dea00b8 | HTTP 400
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26dc28ec70cc5dea00b8 | HTTP 400
ok
test_unique_together_declared (ratings.tests.RatingAPITests.test_unique_together_declared) ... ok
test_upsert_same_user_target_source_keeps_one_row (ratings.tests.RatingAPITests.test_upsert_same_user_target_source_keeps_one_row) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26e328ec70cc5dea00e4 | HTTP 201
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26e328ec70cc5dea00e4 | HTTP 200
ok
test_vote_only_payload_rejected (ratings.tests.RatingAPITests.test_vote_only_payload_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26e628ec70cc5dea00fb | HTTP 400
ok
test_vote_payload_rejected (ratings.tests.RatingAPITests.test_vote_payload_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc26ea28ec70cc5dea0111 | HTTP 400
ok
test_uat_response_seller_rejected (ratings.tests.UATEndpointRBACTests.test_uat_response_seller_rejected)
A seller must not be able to log survey answers into any session. ... [IDENTITY] POST /ratings/uat/session/ -> token owner=uat-shopper@test.com role=shopper id=6afc26ed28ec70cc5dea0127 | HTTP 201
[IDENTITY] POST /ratings/uat/response/ -> token owner=uat-seller@test.com role=seller id=6afc26ed28ec70cc5dea0128 | HTTP 403
ok
test_uat_session_seller_rejected (ratings.tests.UATEndpointRBACTests.test_uat_session_seller_rejected) ... [IDENTITY] POST /ratings/uat/session/ -> token owner=uat-seller@test.com role=seller id=6afc26f028ec70cc5dea013e | HTTP 403
ok
test_uat_session_shopper_allowed (ratings.tests.UATEndpointRBACTests.test_uat_session_shopper_allowed) ... [IDENTITY] POST /ratings/uat/session/ -> token owner=uat-shopper@test.com role=shopper id=6afc26f328ec70cc5dea0152 | HTTP 201
ok
test_guest_cannot_create_uat_session (ratings.tests.UATGuestDenialTests.test_guest_cannot_create_uat_session) ... ok
test_guest_cannot_export_uat_workbook (ratings.tests.UATGuestDenialTests.test_guest_cannot_export_uat_workbook)
The charter KPI export is staff-only; a guest must not even reach ... ok
test_guest_cannot_submit_uat_response_into_a_real_shopper_session (ratings.tests.UATGuestDenialTests.test_guest_cannot_submit_uat_response_into_a_real_shopper_session)
A valid, shopper-owned session_id must not become a guest write hole. ... ok
test_guest_cannot_submit_uat_response_with_a_fabricated_session_id (ratings.tests.UATGuestDenialTests.test_guest_cannot_submit_uat_response_with_a_fabricated_session_id) ... ok
test_active_accounts_are_never_relocated (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_active_accounts_are_never_relocated) ... ok
test_custom_window_is_honoured (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_custom_window_is_honoured) ... ok
test_due_date_is_archived_at_plus_grace_days (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_due_date_is_archived_at_plus_grace_days) ... ok
test_force_relocates_a_fresh_archive (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_force_relocates_a_fresh_archive) ... ok
test_fresh_archive_is_not_relocated (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_fresh_archive_is_not_relocated) ... ok
test_legacy_null_stamp_has_no_due_date (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_legacy_null_stamp_has_no_due_date) ... ok
test_legacy_null_stamp_is_relocated_immediately (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_legacy_null_stamp_is_relocated_immediately) ... ok
test_overdue_archive_is_relocated (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_overdue_archive_is_relocated) ... ok
test_preview_force_marks_every_row_eligible (ratings.tests_uat_charter.ArchiveSchedulePreviewTests.test_preview_force_marks_every_row_eligible) ... ok
test_preview_lists_legacy_rows_as_immediate (ratings.tests_uat_charter.ArchiveSchedulePreviewTests.test_preview_lists_legacy_rows_as_immediate) ... ok
test_preview_reports_schedule_and_moves_nothing (ratings.tests_uat_charter.ArchiveSchedulePreviewTests.test_preview_reports_schedule_and_moves_nothing) ... ok
test_apply_pseudonymizes_and_is_repeatable (ratings.tests_uat_charter.ColdArchiveBackfillTests.test_apply_pseudonymizes_and_is_repeatable) ... FAIL
test_preview_writes_nothing (ratings.tests_uat_charter.ColdArchiveBackfillTests.test_preview_writes_nothing) ... ok
test_cold_copy_is_pseudonymized_and_idempotent (ratings.tests_uat_charter.ColdCopyTests.test_cold_copy_is_pseudonymized_and_idempotent) ... ok
test_cold_moved_at_falls_back_to_now_for_legacy_rows (ratings.tests_uat_charter.ColdCopyTests.test_cold_moved_at_falls_back_to_now_for_legacy_rows) ... ok
test_cold_moved_at_stores_the_scheduled_due_date (ratings.tests_uat_charter.ColdCopyTests.test_cold_moved_at_stores_the_scheduled_due_date)
DOCUMENTED BEHAVIOUR (not the relocation instant). ... ok
test_from_user_heals_a_legacy_intact_row (ratings.tests_uat_charter.ColdCopyTests.test_from_user_heals_a_legacy_intact_row)
A row written BEFORE the fix is healed on re-touch, not duplicated. ... ok
test_seller_store_identity_is_cleared (ratings.tests_uat_charter.ColdCopyTests.test_seller_store_identity_is_cleared) ... ok
test_login_blocked_after_relocation (ratings.tests_uat_charter.RetentionErasureTests.test_login_blocked_after_relocation) ... scanned=1 pseudonymized=1 already_clean=0
[dry-run] scanned=1 pseudonymized=1 already_clean=0
[IDENTITY] LOGIN /auth/login/ -> HTTP 400 submitted=erase@test.com issued=<no token>
ok
test_orders_survive_but_are_pseudonymized (ratings.tests_uat_charter.RetentionErasureTests.test_orders_survive_but_are_pseudonymized) ... ok
test_relocation_erases_active_personal_data (ratings.tests_uat_charter.RetentionErasureTests.test_relocation_erases_active_personal_data) ... ok
test_second_sweep_is_a_noop (ratings.tests_uat_charter.RetentionErasureTests.test_second_sweep_is_a_noop) ... ok
test_buyer_cart_items_are_detached_not_deleted (ratings.tests_uat_charter.SellerDetachTests.test_buyer_cart_items_are_detached_not_deleted) ... ok
test_failure_on_one_row_is_logged_and_skipped (ratings.tests_uat_charter.SweepResilienceTests.test_failure_on_one_row_is_logged_and_skipped) ... ok

======================================================================
FAIL: test_apply_pseudonymizes_and_is_repeatable (ratings.tests_uat_charter.ColdArchiveBackfillTests.test_apply_pseudonymizes_and_is_repeatable)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\ratings\tests_uat_charter.py", line 321, in test_apply_pseudonymizes_and_is_repeatable
    self.assertEqual(getattr(self.legacy, name), value, name)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 'seller' != 'shopper'
- seller
+ shopper
 : role

----------------------------------------------------------------------
Ran 57 tests in 177.584s

FAILED (failures=1)
Destroying test database for alias 'default' ('test_fitfusion')...


```


## Complete raw output: 2026-11-17T09:56 ratings failure

~~~~text
Creating test database for alias 'default' ('test_fitfusion')...

Found 57 test(s).
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
  Applying accounts.0001_initial... OK
  Applying accounts.0002_remove_user_body_proportions_remove_user_height_and_more... OK
  Applying accounts.0003_archiveduser_user_archived_at_user_status_and_more... OK
  Applying accounts.0004_remove_archiveduser_retention_expires_at... OK
  Applying accounts.0005_user_fitting_studio_surveys... OK
  Applying accounts.0006_remove_user_fitting_studio_surveys_and_more... OK
  Applying accounts.0007_user_latest_fitting_studio_survey... OK
  Applying accounts.0008_replace_fit_vote_with_score... OK
  Applying accounts.0009_fit_rating_and_validators... OK
  Applying accounts.0010_remove_survey_user_type... OK
  Applying accounts.0011_unique_fitting_survey_session... OK
  Applying accounts.0012_pseudonymize_archiveduser... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying admin.0004_alter_logentry_id... OK
  Applying auth.0013_alter_group_id_alter_permission_id_alter_user_id... OK
  Applying catalog.0001_initial... OK
  Applying catalog.0002_catalogitem_size_max_cm_catalogitem_size_min_cm... OK
  Applying catalog.0003_remove_catalogitem_size_max_cm_and_more... OK
  Applying catalog.0004_remove_catalogitem_side_image... OK
  Applying catalog.0005_alter_catalogitem_category... OK
  Applying catalog.0006_remove_catalogitem_occasion_tags... OK
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
  Applying ratings.0005_star_only_ratings... OK
  Applying sessions.0001_initial...test_boolean_rejected (ratings.tests.RatingAPITests.test_boolean_rejected) ...  OK

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
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc24e86ae71927d19d68fe | HTTP 400
ok
test_float_rejected (ratings.tests.RatingAPITests.test_float_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc24eb6ae71927d19d6914 | HTTP 400
ok
test_guest_session_clear_still_safe (ratings.tests.RatingAPITests.test_guest_session_clear_still_safe) ... ok
test_guest_submit_rejected_and_not_persisted (ratings.tests.RatingAPITests.test_guest_submit_rejected_and_not_persisted)
Guest rating attempts are rejected with 403, nothing is persisted ... ok
test_mine_returns_only_own_stars (ratings.tests.RatingAPITests.test_mine_returns_only_own_stars) ... [IDENTITY] GET /ratings/mine/ -> token owner=rater@test.com role=shopper id=6afc24f66ae71927d19d6956 | HTTP 200
ok
test_missing_score_rejected (ratings.tests.RatingAPITests.test_missing_score_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc24f96ae71927d19d696e | HTTP 400
ok
test_model_has_no_vote_field (ratings.tests.RatingAPITests.test_model_has_no_vote_field) ... ok
test_numeric_string_rejected_not_coerced (ratings.tests.RatingAPITests.test_numeric_string_rejected_not_coerced) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25006ae71927d19d699a | HTTP 400
ok
test_owner_only_update_delete (ratings.tests.RatingAPITests.test_owner_only_update_delete) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25036ae71927d19d69b0 | HTTP 201
[IDENTITY] PATCH /ratings/6afc25046ae71927d19d69b3/ -> token owner=other@test.com role=shopper id=6afc25046ae71927d19d69b1 | HTTP 404
[IDENTITY] DELETE /ratings/6afc25046ae71927d19d69b3/ -> token owner=other@test.com role=shopper id=6afc25046ae71927d19d69b1 | HTTP 404
[IDENTITY] DELETE /ratings/6afc25046ae71927d19d69b3/ -> token owner=rater@test.com role=shopper id=6afc25036ae71927d19d69b0 | HTTP 204
ok
test_rating_never_required_for_core_flow (ratings.tests.RatingAPITests.test_rating_never_required_for_core_flow) ... ok
test_score_plus_like_or_dislike_keys_rejected (ratings.tests.RatingAPITests.test_score_plus_like_or_dislike_keys_rejected)
Legacy boolean-style reaction keys are also rejected. ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc250b6ae71927d19d69dd | HTTP 400
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc250b6ae71927d19d69dd | HTTP 400
ok
test_score_plus_vote_rejected_not_silently_dropped (ratings.tests.RatingAPITests.test_score_plus_vote_rejected_not_silently_dropped)
A valid star score must NOT let a legacy `vote` key through. ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc250e6ae71927d19d69f3 | HTTP 400
ok
test_score_six_rejected (ratings.tests.RatingAPITests.test_score_six_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25116ae71927d19d6a09 | HTTP 400
ok
test_score_zero_rejected (ratings.tests.RatingAPITests.test_score_zero_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25156ae71927d19d6a1f | HTTP 400
ok
test_seller_cannot_delete_any_rating (ratings.tests.RatingAPITests.test_seller_cannot_delete_any_rating)
Shopper-only RBAC closes the create/delete asymmetry. ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25186ae71927d19d6a35 | HTTP 201
[IDENTITY] DELETE /ratings/6afc25196ae71927d19d6a38/ -> token owner=seller@test.com role=seller id=6afc25196ae71927d19d6a37 | HTTP 403
ok
test_seller_submit_rejected_and_not_persisted (ratings.tests.RatingAPITests.test_seller_submit_rejected_and_not_persisted) ... [IDENTITY] POST /ratings/ -> token owner=seller@test.com role=seller id=6afc251d6ae71927d19d6a4e | HTTP 403
ok
test_source_field_allows_multi_surface_ratings (ratings.tests.RatingAPITests.test_source_field_allows_multi_surface_ratings) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc251f6ae71927d19d6a62 | HTTP 201
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc251f6ae71927d19d6a62 | HTTP 201
ok
test_source_required (ratings.tests.RatingAPITests.test_source_required) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25236ae71927d19d6a7a | HTTP 400
ok
test_star_persists (ratings.tests.RatingAPITests.test_star_persists) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25266ae71927d19d6a90 | HTTP 201
ok
test_summary_approval_threshold_is_four (ratings.tests.RatingAPITests.test_summary_approval_threshold_is_four) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc252a6ae71927d19d6aa7 | HTTP 201
[IDENTITY] GET /ratings/summary/ -> token owner=rater@test.com role=shopper id=6afc252a6ae71927d19d6aa7 | HTTP 200
ok
test_summary_filters_by_source_and_counts_approvals (ratings.tests.RatingAPITests.test_summary_filters_by_source_and_counts_approvals) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc252d6ae71927d19d6abe | HTTP 201
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc252d6ae71927d19d6abe | HTTP 201
[IDENTITY] GET /ratings/summary/ -> token owner=rater@test.com role=shopper id=6afc252d6ae71927d19d6abe | HTTP 200
[IDENTITY] GET /ratings/summary/ -> token owner=rater@test.com role=shopper id=6afc252d6ae71927d19d6abe | HTTP 200
ok
test_undocumented_or_empty_source_rejected (ratings.tests.RatingAPITests.test_undocumented_or_empty_source_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25316ae71927d19d6ad6 | HTTP 400
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25316ae71927d19d6ad6 | HTTP 400
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25316ae71927d19d6ad6 | HTTP 400
ok
test_unique_together_declared (ratings.tests.RatingAPITests.test_unique_together_declared) ... ok
test_upsert_same_user_target_source_keeps_one_row (ratings.tests.RatingAPITests.test_upsert_same_user_target_source_keeps_one_row) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25386ae71927d19d6b02 | HTTP 201
[IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc25386ae71927d19d6b02 | HTTP 200
ok
test_vote_only_payload_rejected (ratings.tests.RatingAPITests.test_vote_only_payload_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc253c6ae71927d19d6b19 | HTTP 400
ok
test_vote_payload_rejected (ratings.tests.RatingAPITests.test_vote_payload_rejected) ... [IDENTITY] POST /ratings/ -> token owner=rater@test.com role=shopper id=6afc253f6ae71927d19d6b2f | HTTP 400
ok
test_uat_response_seller_rejected (ratings.tests.UATEndpointRBACTests.test_uat_response_seller_rejected)
A seller must not be able to log survey answers into any session. ... [IDENTITY] POST /ratings/uat/session/ -> token owner=uat-shopper@test.com role=shopper id=6afc25436ae71927d19d6b45 | HTTP 201
[IDENTITY] POST /ratings/uat/response/ -> token owner=uat-seller@test.com role=seller id=6afc25436ae71927d19d6b46 | HTTP 403
ok
test_uat_session_seller_rejected (ratings.tests.UATEndpointRBACTests.test_uat_session_seller_rejected) ... [IDENTITY] POST /ratings/uat/session/ -> token owner=uat-seller@test.com role=seller id=6afc25466ae71927d19d6b5c | HTTP 403
ok
test_uat_session_shopper_allowed (ratings.tests.UATEndpointRBACTests.test_uat_session_shopper_allowed) ... [IDENTITY] POST /ratings/uat/session/ -> token owner=uat-shopper@test.com role=shopper id=6afc25496ae71927d19d6b70 | HTTP 201
ok
test_guest_cannot_create_uat_session (ratings.tests.UATGuestDenialTests.test_guest_cannot_create_uat_session) ... ok
test_guest_cannot_export_uat_workbook (ratings.tests.UATGuestDenialTests.test_guest_cannot_export_uat_workbook)
The charter KPI export is staff-only; a guest must not even reach ... ok
test_guest_cannot_submit_uat_response_into_a_real_shopper_session (ratings.tests.UATGuestDenialTests.test_guest_cannot_submit_uat_response_into_a_real_shopper_session)
A valid, shopper-owned session_id must not become a guest write hole. ... ok
test_guest_cannot_submit_uat_response_with_a_fabricated_session_id (ratings.tests.UATGuestDenialTests.test_guest_cannot_submit_uat_response_with_a_fabricated_session_id) ... ok
test_active_accounts_are_never_relocated (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_active_accounts_are_never_relocated) ... ok
test_custom_window_is_honoured (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_custom_window_is_honoured) ... ok
test_due_date_is_archived_at_plus_grace_days (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_due_date_is_archived_at_plus_grace_days) ... ok
test_force_relocates_a_fresh_archive (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_force_relocates_a_fresh_archive) ... ok
test_fresh_archive_is_not_relocated (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_fresh_archive_is_not_relocated) ... ok
test_legacy_null_stamp_has_no_due_date (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_legacy_null_stamp_has_no_due_date) ... ok
test_legacy_null_stamp_is_relocated_immediately (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_legacy_null_stamp_is_relocated_immediately) ... ok
test_overdue_archive_is_relocated (ratings.tests_uat_charter.ArchiveEligibilityMathTests.test_overdue_archive_is_relocated) ... ok
test_preview_force_marks_every_row_eligible (ratings.tests_uat_charter.ArchiveSchedulePreviewTests.test_preview_force_marks_every_row_eligible) ... ok
test_preview_lists_legacy_rows_as_immediate (ratings.tests_uat_charter.ArchiveSchedulePreviewTests.test_preview_lists_legacy_rows_as_immediate) ... ok
test_preview_reports_schedule_and_moves_nothing (ratings.tests_uat_charter.ArchiveSchedulePreviewTests.test_preview_reports_schedule_and_moves_nothing) ... ok
test_apply_pseudonymizes_and_is_repeatable (ratings.tests_uat_charter.ColdArchiveBackfillTests.test_apply_pseudonymizes_and_is_repeatable) ... ERROR
test_preview_writes_nothing (ratings.tests_uat_charter.ColdArchiveBackfillTests.test_preview_writes_nothing) ... FAIL
test_cold_copy_is_pseudonymized_and_idempotent (ratings.tests_uat_charter.ColdCopyTests.test_cold_copy_is_pseudonymized_and_idempotent) ... ok
test_cold_moved_at_falls_back_to_now_for_legacy_rows (ratings.tests_uat_charter.ColdCopyTests.test_cold_moved_at_falls_back_to_now_for_legacy_rows) ... ok
test_cold_moved_at_stores_the_scheduled_due_date (ratings.tests_uat_charter.ColdCopyTests.test_cold_moved_at_stores_the_scheduled_due_date)
DOCUMENTED BEHAVIOUR (not the relocation instant). ... ok
test_from_user_heals_a_legacy_intact_row (ratings.tests_uat_charter.ColdCopyTests.test_from_user_heals_a_legacy_intact_row)
A row written BEFORE the fix is healed on re-touch, not duplicated. ... FAIL
test_seller_store_identity_is_cleared (ratings.tests_uat_charter.ColdCopyTests.test_seller_store_identity_is_cleared) ... FAIL
test_login_blocked_after_relocation (ratings.tests_uat_charter.RetentionErasureTests.test_login_blocked_after_relocation) ... scanned=1 pseudonymized=1 already_clean=0
[IDENTITY] LOGIN /auth/login/ -> HTTP 400 submitted=erase@test.com issued=<no token>
ok
test_orders_survive_but_are_pseudonymized (ratings.tests_uat_charter.RetentionErasureTests.test_orders_survive_but_are_pseudonymized) ... ok
test_relocation_erases_active_personal_data (ratings.tests_uat_charter.RetentionErasureTests.test_relocation_erases_active_personal_data) ... ok
test_second_sweep_is_a_noop (ratings.tests_uat_charter.RetentionErasureTests.test_second_sweep_is_a_noop) ... ok
test_buyer_cart_items_are_detached_not_deleted (ratings.tests_uat_charter.SellerDetachTests.test_buyer_cart_items_are_detached_not_deleted) ... ok
test_failure_on_one_row_is_logged_and_skipped (ratings.tests_uat_charter.SweepResilienceTests.test_failure_on_one_row_is_logged_and_skipped) ... ok

======================================================================
ERROR: test_apply_pseudonymizes_and_is_repeatable (ratings.tests_uat_charter.ColdArchiveBackfillTests.test_apply_pseudonymizes_and_is_repeatable)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\ratings\tests_uat_charter.py", line 317, in test_apply_pseudonymizes_and_is_repeatable
    call_command('pseudonymize_archived_users', '--apply')
    ~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\.venv\Lib\site-packages\django\core\management\__init__.py", line 173, in call_command
    defaults = parser.parse_args(args=parse_args)
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\.venv\Lib\site-packages\django\core\management\base.py", line 72, in parse_args
    return super().parse_args(args, namespace)
           ~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^
  File "C:\Users\seth\AppData\Local\Python\pythoncore-3.13-64\Lib\argparse.py", line 1930, in parse_args
    self.error(msg)
    ~~~~~~~~~~^^^^^
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\.venv\Lib\site-packages\django\core\management\base.py", line 78, in error
    raise CommandError("Error: %s" % message)
django.core.management.base.CommandError: Error: unrecognized arguments: --apply

======================================================================
FAIL: test_preview_writes_nothing (ratings.tests_uat_charter.ColdArchiveBackfillTests.test_preview_writes_nothing)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\ratings\tests_uat_charter.py", line 313, in test_preview_writes_nothing
    self.assertEqual(self.legacy.email, 'legacy@test.com')
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: 'archived-1d9848b53282ef7e7f912338d4c2c518@archive.invalid' != 'legacy@test.com'
- archived-1d9848b53282ef7e7f912338d4c2c518@archive.invalid
+ legacy@test.com


======================================================================
FAIL: test_from_user_heals_a_legacy_intact_row (ratings.tests_uat_charter.ColdCopyTests.test_from_user_heals_a_legacy_intact_row)
A row written BEFORE the fix is healed on re-touch, not duplicated.
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\ratings\tests_uat_charter.py", line 258, in test_from_user_heals_a_legacy_intact_row
    self.assertEqual(healed.mobile, '')
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^
AssertionError: None != ''

======================================================================
FAIL: test_seller_store_identity_is_cleared (ratings.tests_uat_charter.ColdCopyTests.test_seller_store_identity_is_cleared)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\seth\Documents\PRIN173-ProjectManagment\backend\ratings\tests_uat_charter.py", line 237, in test_seller_store_identity_is_cleared
    self.assertEqual(cold.store_name, '')
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^
AssertionError: None != ''

----------------------------------------------------------------------
Ran 57 tests in 183.044s

FAILED (failures=3, errors=1)
Destroying test database for alias 'default' ('test_fitfusion')...


~~~~


## Complete raw output: 2026-11-16 recommendations failure

~~~~text
Command: python manage.py test recommendations -v 2
UTC start: 2026-11-16T01:36:40.144Z
Commit: 389a0deccfb3677fa2b374098dfbdaa746e72885
Python: Python 3.13.15
Django: 6.0.8
--- Full raw command output ---
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


Exit code: 1
Run summary:


~~~~
