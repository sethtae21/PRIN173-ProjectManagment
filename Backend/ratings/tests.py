from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User
from .models import Rating


class RatingAPITests(TestCase):
    """KAN-101: rating endpoints — stars (score) and reactions (like/dislike)
    are tracked as INDEPENDENT dimensions (FR-7.5, Criteria 9-11)."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='rater', email='rater@test.com', password='Test123!@#', role='user')
        self.other = User.objects.create_user(
            username='other', email='other@test.com', password='Test123!@#', role='user')
        self.t = {'target_type': 'item', 'target_id': '6ab52dc83c8d812f8b7ee414'}

    def test_star_persists_as_score_only(self):
        self.client.force_authenticate(self.user)
        res = self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['rating']['score'], 5)
        self.assertIsNone(res.data['rating']['vote'])          # a 5★ is NOT a like

    def test_like_persists_as_vote_only(self):
        self.client.force_authenticate(self.user)
        res = self.client.post('/ratings/', {**self.t, 'vote': 'like'}, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['rating']['vote'], 'like')
        self.assertIsNone(res.data['rating']['score'])         # a like is NOT a 5★

    def test_upsert_keeps_both_dimensions(self):
        self.client.force_authenticate(self.user)
        self.client.post('/ratings/', {**self.t, 'score': 4}, format='json')
        res = self.client.post('/ratings/', {**self.t, 'vote': 'dislike'}, format='json')
        self.assertEqual(res.status_code, 200)                 # same row updated
        self.assertEqual(Rating.objects.filter(user=self.user).count(), 1)
        row = Rating.objects.get(user=self.user)
        self.assertEqual(row.score, 4)                         # star preserved
        self.assertEqual(row.vote, 'dislike')                  # reaction added

    def test_summary_separates_counts(self):
        self.client.force_authenticate(self.user)
        self.client.post('/ratings/', {**self.t, 'score': 5}, format='json')
        self.client.post('/ratings/', {**dict(self.t, target_id='x2'), 'vote': 'like'}, format='json')
        res = self.client.get('/ratings/summary/', self.t)
        self.assertEqual(res.data['score_count'], 1)
        self.assertEqual(res.data['average'], 5.0)
        self.assertEqual(res.data['like_count'], 0)            # the 5★ did not become a like
        self.assertEqual(res.data['dislike_count'], 0)

    def test_guest_not_persisted_and_prompted(self):
        res = self.client.post('/ratings/', {**self.t, 'vote': 'like'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.data['persisted'])
        self.assertEqual(res.data['prompt'], 'signup_login')
        self.assertEqual(Rating.objects.count(), 0)
        self.assertEqual(res.data['session_aggregate']['like_count'], 1)

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
        self.assertEqual(self.client.post('/ratings/', self.t, format='json').status_code, 400)  # neither score nor vote

    def test_rating_never_required_for_core_flow(self):
        self.assertEqual(self.client.get('/catalog/').status_code, 200)
        self.assertEqual(Rating.objects.count(), 0)