"""KAN-101 / FR-7.5 rating endpoint tests — STAR-ONLY baseline.

CHANGED (audit fix): the previous suite asserted that vote-only ('like' /
'dislike') submissions succeed and that summary exposes like/dislike counts.
The star-only baseline removed the vote dimension (ratings migration 0005),
so those expectations are replaced by strict star-type / boundary tests,
source-contract tests, shopper-only RBAC, guest ephemerality, and upsert /
uniqueness coverage.

REGISTERED SHOPPERS ONLY: guests get 403 + prompt and nothing is cached or
persisted (FR-1.9); sellers get 403 (ratings are a shopper surface).

GAP 3 ADDITION: UATEndpointRBACTests covered shopper + seller on the UAT write
endpoints but never an unauthenticated GUEST. UATGuestDenialTests closes that
hole — denial status, zero rows in BOTH UAT collections, zero cache writes and
no guest session row, using payloads that WOULD succeed for a shopper so the
refusal is provably about identity rather than malformed input.
"""
from django.contrib.sessions.models import Session
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from .models import Rating


class RatingAPITests(TestCase):
    """Star-only rating contract (FR-7.5, Scope Criteria 9-11)."""

    def setUp(self):
        self.client = APIClient()
        # FIX: role must be a real ROLE_CHOICES member ('shopper'); the old
        # suite used role='user', which the shopper-only RBAC now rejects.
        self.user = User.objects.create_user(
            email='rater@test.com', password='Test123!@#',
            full_name='Test Rater', role='shopper')
        self.other = User.objects.create_user(
            email='other@test.com', password='Test123!@#',
            full_name='Other User', role='shopper')
        self.seller = User.objects.create_user(
            email='seller@test.com', password='Test123!@#',
            full_name='Seller User', role='seller', store_name='Test Store')
        self.t = {
            'target_type': 'item',
            'target_id': '6ab52dc83c8d812f8b7ee414',
            'source': 'recommendation_panel',
        }

    # ---- stars persist ----------------------------------------------------
    def test_star_persists(self):
        self.client.force_authenticate(self.user)
        res = self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(res.data['persisted'])
        self.assertEqual(res.data['rating']['score'], 5)
        self.assertNotIn('vote', res.data['rating'])

    def test_model_has_no_vote_field(self):
        self.assertNotIn('vote', [f.name for f in Rating._meta.get_fields()])

    # ---- strict integer typing / bounds ----------------------------------
    def test_score_zero_rejected(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.post('/ratings/', {**self.t, 'score': 0}, format='json').status_code, 400)
        self.assertEqual(Rating.objects.count(), 0)

    def test_score_six_rejected(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.post('/ratings/', {**self.t, 'score': 6}, format='json').status_code, 400)

    def test_numeric_string_rejected_not_coerced(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.post('/ratings/', {**self.t, 'score': '5'}, format='json').status_code, 400)
        self.assertEqual(Rating.objects.count(), 0)

    def test_boolean_rejected(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.post('/ratings/', {**self.t, 'score': True}, format='json').status_code, 400)

    def test_float_rejected(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.post('/ratings/', {**self.t, 'score': 4.0}, format='json').status_code, 400)

    def test_missing_score_rejected(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(
            self.client.post('/ratings/', self.t, format='json').status_code, 400)

    # ---- no vote dimension ------------------------------------------------
    def test_vote_payload_rejected(self):
        self.client.force_authenticate(self.user)
        body = {k: v for k, v in self.t.items()}
        res = self.client.post('/ratings/', {**body, 'vote': 'like'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Rating.objects.count(), 0)

    def test_vote_only_payload_rejected(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(
            '/ratings/',
            {'target_type': 'item', 'target_id': self.t['target_id'],
             'source': 'recommendation_panel', 'vote': 'dislike'},
            format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(Rating.objects.count(), 0)

    def test_score_plus_vote_rejected_not_silently_dropped(self):
        """A valid star score must NOT let a legacy `vote` key through.

        DRF serializers normally ignore unknown input keys; without the
        serializer-level `to_internal_value` guard this payload would save
        the star and silently drop the vote, masking client drift.
        """
        self.client.force_authenticate(self.user)
        res = self.client.post(
            '/ratings/',
            {**self.t, 'score': 5, 'vote': 'like'},
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn('vote', res.data)
        self.assertEqual(Rating.objects.count(), 0)

    def test_score_plus_like_or_dislike_keys_rejected(self):
        """Legacy boolean-style reaction keys are also rejected."""
        self.client.force_authenticate(self.user)
        for key in ('like', 'dislike'):
            res = self.client.post(
                '/ratings/',
                {**self.t, 'score': 4, key: True},
                format='json',
            )
            self.assertEqual(res.status_code, 400, f"payload with {key} leaked through")
            self.assertIn(key, res.data)
        self.assertEqual(Rating.objects.count(), 0)

    # ---- source contract --------------------------------------------------
    def test_source_required(self):
        self.client.force_authenticate(self.user)
        body = {k: v for k, v in self.t.items() if k != 'source'}
        self.assertEqual(
            self.client.post('/ratings/', {**body, 'score': 5}, format='json').status_code, 400)

    def test_undocumented_or_empty_source_rejected(self):
        self.client.force_authenticate(self.user)
        for bad in ('fitting_studio_popup', '', 'order-history'):
            res = self.client.post('/ratings/', {**self.t, 'score': 5, 'source': bad}, format='json')
            self.assertEqual(res.status_code, 400, bad)

    def test_source_field_allows_multi_surface_ratings(self):
        self.client.force_authenticate(self.user)
        res1 = self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        self.assertEqual(res1.status_code, 201)
        res2 = self.client.post(
            '/ratings/',
            {**self.t, 'score': 4, 'target_type': 'fit', 'source': 'fit_visualization'},
            format='json')
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(Rating.objects.filter(user=self.user).count(), 2)
        self.assertEqual(
            Rating.objects.get(user=self.user, source='recommendation_panel').score, 5)
        self.assertEqual(
            Rating.objects.get(user=self.user, source='fit_visualization').score, 4)

    # ---- upsert / uniqueness ---------------------------------------------
    def test_upsert_same_user_target_source_keeps_one_row(self):
        self.client.force_authenticate(self.user)
        self.client.post('/ratings/', {**self.t, 'score': 4}, format='json')
        res = self.client.post('/ratings/', {**self.t, 'score': 2}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Rating.objects.filter(user=self.user).count(), 1)
        self.assertEqual(Rating.objects.get(user=self.user).score, 2)

    def test_unique_together_declared(self):
        self.assertIn(
            ('user', 'target_type', 'target_id', 'source'),
            Rating._meta.unique_together,
        )

    # ---- summary ----------------------------------------------------------
    def test_summary_filters_by_source_and_counts_approvals(self):
        self.client.force_authenticate(self.user)
        self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        self.client.post(
            '/ratings/',
            {**self.t, 'score': 3, 'target_type': 'fit', 'source': 'fit_visualization'},
            format='json')

        res_all = self.client.get('/ratings/summary/', {
            'target_type': self.t['target_type'], 'target_id': self.t['target_id']})
        self.assertEqual(res_all.data['score_count'], 1)
        self.assertEqual(res_all.data['average'], 5.0)
        self.assertEqual(res_all.data['approval_count'], 1)
        self.assertNotIn('like_count', res_all.data)
        self.assertNotIn('dislike_count', res_all.data)

        res_rec = self.client.get('/ratings/summary/', {
            'target_type': self.t['target_type'],
            'target_id': self.t['target_id'],
            'source': 'recommendation_panel'})
        self.assertEqual(res_rec.data['score_count'], 1)
        self.assertEqual(res_rec.data['source'], 'recommendation_panel')

    def test_summary_approval_threshold_is_four(self):
        self.client.force_authenticate(self.user)
        self.client.post('/ratings/', {**self.t, 'score': 3}, format='json')
        res = self.client.get('/ratings/summary/', {
            'target_type': self.t['target_type'], 'target_id': self.t['target_id']})
        self.assertEqual(res.data['approval_count'], 0)

    # ---- RBAC / guest ephemerality ---------------------------------------
    def test_guest_submit_rejected_and_not_persisted(self):
        """Guest rating attempts are rejected with 403, nothing is persisted
        to the DB, and the cache is never written to (FR-1.9 ephemeral guests)."""
        from unittest.mock import patch
        from django.core.cache import cache

        with patch.object(cache, 'set') as cache_set, \
             patch.object(cache, 'add') as cache_add:
            res = self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data['prompt'], 'signup_login')
        self.assertFalse(res.data['persisted'])
        self.assertEqual(Rating.objects.count(), 0)
        self.assertEqual(Session.objects.count(), 0)
        self.assertNotIn('session_aggregate', res.data)
        # Cache-spy: nothing was ever written for a guest
        cache_set.assert_not_called()
        cache_add.assert_not_called()

    def test_seller_submit_rejected_and_not_persisted(self):
        self.client.force_authenticate(self.seller)
        res = self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(Rating.objects.count(), 0)

    def test_guest_session_clear_still_safe(self):
        res = self.client.post('/ratings/guest-session/clear/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['cleared'])
        self.assertEqual(Rating.objects.count(), 0)
        self.assertEqual(Session.objects.count(), 0)

    # ---- ownership / optionality / rehydration ---------------------------
    def test_owner_only_update_delete(self):
        self.client.force_authenticate(self.user)
        rid = self.client.post('/ratings/', {**self.t, 'score': 3}, format='json').data['rating']['id']
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.client.patch(f'/ratings/{rid}/', {'score': 1}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(f'/ratings/{rid}/').status_code, 404)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.delete(f'/ratings/{rid}/').status_code, 204)

    def test_seller_cannot_delete_any_rating(self):
        """Shopper-only RBAC closes the create/delete asymmetry.

        The patch guard on `RatingDetailView.delete` ensures a seller can
        neither create a rating nor remove another user's. The row survives
        the attempted delete.
        """
        self.client.force_authenticate(self.user)
        rid = self.client.post(
            '/ratings/', {**self.t, 'score': 3}, format='json').data['rating']['id']

        self.client.force_authenticate(self.seller)
        self.assertEqual(
            self.client.delete(f'/ratings/{rid}/').status_code,
            403,
            "seller could delete another user's rating",
        )
        self.assertTrue(Rating.objects.filter(id=rid).exists())

    def test_mine_returns_only_own_stars(self):
        Rating.objects.create(user=self.user, target_type='item', target_id='a',
                              score=4, source='order_history')
        Rating.objects.create(user=self.other, target_type='item', target_id='b',
                              score=5, source='order_history')
        self.client.force_authenticate(self.user)
        res = self.client.get('/ratings/mine/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['target_id'], 'a')

    def test_rating_never_required_for_core_flow(self):
        self.assertEqual(self.client.get('/catalog/').status_code, 200)
        self.assertEqual(Rating.objects.count(), 0)


class UATEndpointRBACTests(TestCase):
    """OBJ-01 / OBJ-05 evidence integrity: UAT survey writes are shopper-only.

    A seller logging a UAT session or response would contaminate the paired
    pre/post evidence (OBJ-01 / OBJ-06) and the recommendation-approval
    denominator (OBJ-05). Both endpoints must refuse sellers with 403;
    shoppers still succeed.
    """

    def setUp(self):
        self.client = APIClient()
        self.shopper = User.objects.create_user(
            email='uat-shopper@test.com', password='Test123!@#',
            full_name='UAT Shopper', role='shopper',
        )
        self.seller = User.objects.create_user(
            email='uat-seller@test.com', password='Test123!@#',
            full_name='UAT Seller', role='seller', store_name='UAT Store',
        )
        self.session_payload = {
            'role': 'shopper',
            'product_id': '6ab52dc83c8d812f8b7ee414',
        }

    def test_uat_session_shopper_allowed(self):
        self.client.force_authenticate(self.shopper)
        res = self.client.post('/ratings/uat/session/', self.session_payload, format='json')
        self.assertEqual(res.status_code, 201)

    def test_uat_session_seller_rejected(self):
        self.client.force_authenticate(self.seller)
        res = self.client.post('/ratings/uat/session/', self.session_payload, format='json')
        self.assertEqual(res.status_code, 403)
        from .models import UATSession
        self.assertEqual(UATSession.objects.count(), 0)

    def test_uat_response_seller_rejected(self):
        """A seller must not be able to log survey answers into any session."""
        # Create a session as the shopper first so there's a valid target.
        self.client.force_authenticate(self.shopper)
        session = self.client.post(
            '/ratings/uat/session/', self.session_payload, format='json').data

        # Now try to log a response as the seller.
        self.client.force_authenticate(self.seller)
        res = self.client.post(
            '/ratings/uat/response/',
            {
                'session_id': session['session_id'],
                'product_id': self.session_payload['product_id'],
                'phase': 'before',
                'question_key': 'fit_confidence',
                'value': 3,
            },
            format='json',
        )
        self.assertEqual(res.status_code, 403)
        from .models import UATResponse
        self.assertEqual(UATResponse.objects.count(), 0)


class UATGuestDenialTests(TestCase):
    """GAP 3: unauthenticated GUESTS must not write UAT evidence.

    UATEndpointRBACTests above already covers shopper (allowed) and seller
    (403). This class closes the missing third role: the anonymous guest.

    WHY THE PAYLOADS ARE FULLY VALID: every body below is one a registered
    shopper would get 201 for (same product_id / question_key / phase / value
    as the shopper test above). So a refusal here is provably about IDENTITY,
    not about a malformed request that would have 400'd anyway.

    WHAT IS ASSERTED:
      * 401/403 — both write views use permission_classes=[IsAuthenticated],
        so DRF refuses the guest BEFORE post() runs. With JWTAuthentication
        first in the auth stack the actual code is 401; 403 is accepted too
        so the test pins the security property, not one settings detail.
      * zero rows in BOTH uat_session and uat_response (and no stray Rating).
      * zero cache writes — the UAT views never touch the cache today; this
        is a regression guard against a future "just cache it for guests"
        shortcut, which FR-1.9 forbids.
      * no django_session row — the guest stays ephemeral, exactly as the
        guest rating test above asserts.

    Nothing here relaxes a permission: views.py, models.py, serializers.py
    and accounts/permissions.py are unchanged.
    """

    SESSION_URL = '/ratings/uat/session/'
    RESPONSE_URL = '/ratings/uat/response/'
    EXPORT_URL = '/ratings/uat/export/'
    PRODUCT_ID = '6ab52dc83c8d812f8b7ee414'

    def setUp(self):
        self.client = APIClient()  # deliberately NEVER authenticated
        self.session_payload = {'role': 'shopper', 'product_id': self.PRODUCT_ID}

    def _response_payload(self, session_id):
        return {
            'session_id': session_id,
            'product_id': self.PRODUCT_ID,
            'phase': 'before',
            'question_key': 'fit_confidence',
            'value': 3,
        }

    def _assert_total_denial(self, res, cache_set, cache_add, *, sessions, responses):
        from .models import UATResponse, UATSession

        self.assertIn(res.status_code, (401, 403))
        self.assertEqual(UATSession.objects.count(), sessions)
        self.assertEqual(UATResponse.objects.count(), responses)
        self.assertEqual(Rating.objects.count(), 0)
        self.assertEqual(Session.objects.count(), 0)
        cache_set.assert_not_called()
        cache_add.assert_not_called()

    def test_guest_cannot_create_uat_session(self):
        from unittest.mock import patch
        from django.core.cache import cache

        with patch.object(cache, 'set') as cache_set, \
             patch.object(cache, 'add') as cache_add:
            res = self.client.post(self.SESSION_URL, self.session_payload, format='json')

        self._assert_total_denial(res, cache_set, cache_add, sessions=0, responses=0)

    def test_guest_cannot_submit_uat_response_into_a_real_shopper_session(self):
        """A valid, shopper-owned session_id must not become a guest write hole.

        The session is created through the ORM so the ONLY thing distinguishing
        this request from the passing shopper case is the absent credentials.
        """
        from unittest.mock import patch
        from django.core.cache import cache
        from .models import UATSession

        shopper = User.objects.create_user(
            email='uat-guest-target@test.com', password='Test123!@#',
            full_name='UAT Guest Target', role='shopper',
        )
        session = UATSession.objects.create(
            user=shopper, role='shopper', status='active', product_id=self.PRODUCT_ID)

        with patch.object(cache, 'set') as cache_set, \
             patch.object(cache, 'add') as cache_add:
            res = self.client.post(
                self.RESPONSE_URL,
                self._response_payload(session.session_id),
                format='json',
            )

        self._assert_total_denial(res, cache_set, cache_add, sessions=1, responses=0)

    def test_guest_cannot_submit_uat_response_with_a_fabricated_session_id(self):
        from unittest.mock import patch
        from django.core.cache import cache

        with patch.object(cache, 'set') as cache_set, \
             patch.object(cache, 'add') as cache_add:
            res = self.client.post(
                self.RESPONSE_URL,
                self._response_payload('0' * 32),
                format='json',
            )

        self._assert_total_denial(res, cache_set, cache_add, sessions=0, responses=0)

    def test_guest_cannot_export_uat_workbook(self):
        """The charter KPI export is staff-only; a guest must not even reach
        the staff check, and nothing may be written on the way out."""
        from unittest.mock import patch
        from django.core.cache import cache

        with patch.object(cache, 'set') as cache_set, \
             patch.object(cache, 'add') as cache_add:
            res = self.client.get(self.EXPORT_URL)

        self._assert_total_denial(res, cache_set, cache_add, sessions=0, responses=0)