**Verification evidence**
- Requirement: SRS FR-6.1–6.9 · WBS 1.3.6 · RT-07 · Scope Criterion 8 (≥70% of carts complete mock checkout)
- Method: `python manage.py test commerce -v 2` (PYTHONIOENCODING=utf-8 set).
- Result: 8 tests passed; 0 failed.
- Tests proving this ticket: `commerce.tests.CommerceAPITests.test_cart_crud_round_trip`; `commerce.tests.CommerceAPITests.test_guest_rejected_from_cart_and_checkout`; `commerce.tests.CommerceAPITests.test_checkout_approval_snapshots_and_clears_cart`; `commerce.tests.CommerceAPITests.test_checkout_decline_keeps_cart_and_creates_no_order`; `commerce.tests.CommerceAPITests.test_user_cannot_read_another_users_order`; `commerce.tests.CommerceAPITests.test_checkout_persists_selected_items_and_leaves_unselected_cart_items`; `commerce.tests.CommerceAPITests.test_checkout_rejects_empty_cart`; `commerce.tests.CommerceAPITests.test_remove_selected_items_only_removes_current_users_selection`
- Artifact: `docs/evidence/_runs/20261116T014328Z-commerce.log`
- Commit: `389a0de`  Verified: `2026-11-16`
- Limitations: Automated backend behavior only; no browser checkout UI or real payment is tested.
