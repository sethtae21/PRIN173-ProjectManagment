from django.test import TestCase
from django.contrib.sessions.models import Session
from django.core.cache import cache
from rest_framework.test import APIClient

from accounts.models import User
from .models import Rating


class RatingAPITests(TestCase):
    """KAN-101: rating endpoints — stars (score) and reactions (like/dislike)
    are tracked as INDEPENDENT dimensions (FR-7.5, Criteria 9-11).
    
    REGISTERED USERS ONLY: guests have no rating rights (403 + prompt)."""

    def setUp(self):
        self.client = APIClient()
        # FIX: create_user requires full_name as positional argument
        self.user = User.objects.create_user(
            email='rater@test.com', password='Test123!@#', full_name='Test Rater', role='user')
        self.other = User.objects.create_user(
            email='other@test.com', password='Test123!@#', full_name='Other User', role='user')
        self.t = {'target_type': 'item', 'target_id': '6ab52dc83c8d812f8b7ee414'}

    def test_star_persists_as_score_only(self):
        self.client.force_authenticate(self.user)
        res = self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['rating']['score'], 5)
        self.assertIsNone(res.data['rating']['vote'])

    def test_like_persists_as_vote_only(self):
        self.client.force_authenticate(self.user)
        res = self.client.post('/ratings/', {**self.t, 'vote': 'like'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['rating']['vote'], 'like')
        self.assertIsNone(res.data['rating']['score'])

    def test_upsert_keeps_both_dimensions(self):
        self.client.force_authenticate(self.user)
        self.client.post('/ratings/', {**self.t, 'score': 4}, format='json')
        res = self.client.post('/ratings/', {**self.t, 'vote': 'dislike'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(Rating.objects.filter(user=self.user).count(), 1)
        row = Rating.objects.get(user=self.user)
        self.assertEqual(row.score, 4)
        self.assertEqual(row.vote, 'dislike')

    def test_summary_separates_counts(self):
        self.client.force_authenticate(self.user)
        self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        self.client.post('/ratings/', {**dict(self.t, target_id='x2'), 'vote': 'like'}, format='json')
        res = self.client.get('/ratings/summary/', self.t)
        self.assertEqual(res.data['score_count'], 1)
        self.assertEqual(res.data['average'], 5.0)
        self.assertEqual(res.data['like_count'], 0)
        self.assertEqual(res.data['dislike_count'], 0)

    def test_guest_submit_rejected_and_not_persisted(self):
        res = self.client.post('/ratings/', {**self.t, 'vote': 'like'}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.data['prompt'], 'signup_login')
        self.assertFalse(res.data['persisted'])
        self.assertEqual(Rating.objects.count(), 0)
        self.assertEqual(Session.objects.count(), 0)
        self.assertNotIn('session_aggregate', res.data)

    def test_guest_session_clear_still_safe(self):
        res = self.client.post('/ratings/guest-session/clear/')
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['cleared'])
        self.assertEqual(Rating.objects.count(), 0)
        self.assertEqual(Session.objects.count(), 0)

    def test_owner_only_update_delete(self):
        self.client.force_authenticate(self.user)
        rid = self.client.post('/ratings/', {**self.t, 'score': 3}, format='json').data['rating']['id']
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.patch(f'/ratings/{rid}/', {'score': 1}, format='json').status_code, 404)
        self.assertEqual(self.client.delete(f'/ratings/{rid}/').status_code, 404)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.delete(f'/ratings/{rid}/').status_code, 204)

    def test_validation_bounds_and_empty_payload(self):
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post('/ratings/', {**self.t, 'score': 6}, format='json').status_code, 400)
        self.assertEqual(self.client.post('/ratings/', self.t, format='json').status_code, 400)

    def test_rating_never_required_for_core_flow(self):
        self.assertEqual(self.client.get('/catalog/').status_code, 200)
        self.assertEqual(Rating.objects.count(), 0)

    def test_source_field_allows_multi_surface_ratings(self):
        self.client.force_authenticate(self.user)
        res1 = self.client.post('/ratings/', {
            **self.t,
            'score': 5,
            'source': 'recommendation_panel'
        }, format='json')
        self.assertEqual(res1.status_code, 201)
        
        res2 = self.client.post('/ratings/', {
            **self.t,
            'score': 4,
            'source': 'fit_visualization'
        }, format='json')
        self.assertEqual(res2.status_code, 201)
        
        self.assertEqual(Rating.objects.filter(user=self.user).count(), 2)
        
        rec_row = Rating.objects.get(user=self.user, source='recommendation_panel')
        fit_row = Rating.objects.get(user=self.user, source='fit_visualization')
        self.assertEqual(rec_row.score, 5)
        self.assertEqual(fit_row.score, 4)

    def test_summary_filters_by_source(self):
        self.client.force_authenticate(self.user)
        self.client.post('/ratings/', {
            **self.t,
            'score': 5,
            'source': 'recommendation_panel'
        }, format='json')
        self.client.post('/ratings/', {
            **self.t,
            'score': 3,
            'source': 'fit_visualization'
        }, format='json')
        
        res_all = self.client.get('/ratings/summary/', self.t)
        self.assertEqual(res_all.data['score_count'], 2)
        self.assertEqual(res_all.data['average'], 4.0)
        
        res_rec = self.client.get('/ratings/summary/', {**self.t, 'source': 'recommendation_panel'})
        self.assertEqual(res_rec.data['score_count'], 1)
        self.assertEqual(res_rec.data['average'], 5.0)
        self.assertEqual(res_rec.data['source'], 'recommendation_panel')