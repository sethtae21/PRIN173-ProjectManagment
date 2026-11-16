"""
Fitting Studio survey contract tests (SADD FITTING_STUDIO_SURVEYS / FR-7.5).

Covers the audit gaps: guest rejection with no DB write, seller rejection,
strict star typing, two-phase upsert on one session_id, server-computed
confidence_gain, the on-account mirror, the fit_rating field rename, the
removal of the non-baselined user_type field, and explicit rejection of
legacy like/dislike reaction keys.

GAP 2 additions: the (user, session_id) key is DB-enforced AND declared in
Meta, a lost create race resolves to the same document, a stale phase
snapshot can no longer clobber the other phase's answers or the gain, and the
dedupe helper's call contract (apply=) used by migration 0011 is pinned.

Run: python manage.py test accounts.tests_fitting_studio_survey -v 2
"""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import FittingStudioSurvey

User = get_user_model()
URL = '/profile/fitting-studio-survey/'


def _user(email, role='shopper'):
    return User.objects.create_user(
        email=email, full_name=email.split('@')[0].title(),
        password='Test123!@#', role=role,
    )


class FittingStudioSurveyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.shopper = _user('survey_shopper@test.com')
        self.seller = _user('survey_seller@test.com', role='seller')
        self.session_id = 'studio-test-0001'

    def _post(self, survey):
        return self.client.post(URL, {'survey': survey}, format='json')

    def test_schema_uses_fit_rating_and_has_no_legacy_fields(self):
        names = [f.name for f in FittingStudioSurvey._meta.get_fields()]
        self.assertIn('fit_rating', names)
        self.assertNotIn('fit_rating_score', names)
        self.assertNotIn('fit_like_dislike', names)
        # CHANGED (audit fix): the non-baselined user_type column is gone.
        self.assertNotIn('user_type', names)

    def test_guest_rejected_and_no_row_written(self):
        """Guest survey attempts are rejected and nothing is cached or persisted."""
        from unittest.mock import patch
        from django.core.cache import cache

        with patch.object(cache, 'set') as cache_set, \
             patch.object(cache, 'add') as cache_add:
            res = self._post({'session_id': self.session_id, 'pre_confidence': 4})
        
        self.assertIn(res.status_code, (401, 403))
        self.assertEqual(FittingStudioSurvey.objects.count(), 0)
        # Cache-spy: nothing was ever written for a guest
        cache_set.assert_not_called()
        cache_add.assert_not_called()

    def test_seller_rejected_and_no_row_written(self):
        self.client.force_authenticate(self.seller)
        res = self._post({'session_id': self.session_id, 'pre_confidence': 4})
        self.assertEqual(res.status_code, 403)
        self.assertEqual(FittingStudioSurvey.objects.count(), 0)

    def test_two_phase_upsert_one_row_and_gain(self):
        self.client.force_authenticate(self.shopper)
        first = self._post({
            'session_id': self.session_id,
            'pre_confidence': 2, 'pre_return_intent': 5,
        })
        self.assertEqual(first.status_code, 201)
        row = FittingStudioSurvey.objects.get()
        self.assertIsNone(row.post_confidence)
        self.assertIsNone(row.confidence_gain)

        second = self._post({
            'session_id': self.session_id,
            'post_confidence': 4, 'post_return_intent': 2, 'fit_rating': 5,
        })
        self.assertEqual(second.status_code, 200)
        row.refresh_from_db()
        self.assertEqual(FittingStudioSurvey.objects.count(), 1)
        self.assertEqual(row.pre_confidence, 2)
        self.assertEqual(row.post_confidence, 4)
        self.assertEqual(row.confidence_gain, 2)
        self.assertEqual(row.fit_rating, 5)

        self.shopper.refresh_from_db()
        mirror = self.shopper.latest_fitting_studio_survey
        self.assertEqual(mirror['confidence_gain'], 2)
        self.assertEqual(mirror['fit_rating'], 5)
        self.assertNotIn('user_type', mirror)

    def test_strict_star_types_rejected(self):
        self.client.force_authenticate(self.shopper)
        for bad in ('4', True, 4.5, 0, 6):
            res = self._post({'session_id': self.session_id, 'pre_confidence': bad})
            self.assertEqual(res.status_code, 400, repr(bad))
        self.assertEqual(FittingStudioSurvey.objects.count(), 0)

    def test_empty_survey_rejected(self):
        self.client.force_authenticate(self.shopper)
        res = self._post({'session_id': self.session_id})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(FittingStudioSurvey.objects.count(), 0)

    def test_legacy_reaction_keys_rejected(self):
        """HARDENING (audit fix): legacy like/dislike keys are refused with 400
        and write nothing, instead of being silently ignored."""
        self.client.force_authenticate(self.shopper)

        res = self._post({
            'session_id': self.session_id,
            'pre_confidence': 2,
            'post_confidence': 4,
            'fit_rating': 5,
            'fit_like_dislike': 'like',
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn('fit_like_dislike', res.data)
        self.assertEqual(FittingStudioSurvey.objects.count(), 0)

        res2 = self._post({
            'session_id': self.session_id,
            'pre_confidence': 3,
            'post_confidence': 5,
            'fit_rating': 4,
            'vote': 'like',
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn('vote', res2.data)
        self.assertEqual(FittingStudioSurvey.objects.count(), 0)

    def test_get_returns_own_rows_and_mirror(self):
        self.client.force_authenticate(self.shopper)
        self._post({'session_id': self.session_id, 'fit_rating': 4})
        res = self.client.get(URL)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['surveys'][0]['fit_rating'], 4)
        self.assertEqual(res.data['latest']['fit_rating'], 4)
        self.assertNotIn('user_type', res.data['surveys'][0])


class SurveyUpsertKeyConcurrencyTests(TestCase):
    """GAP 2: (user, session_id) is a database key, not a convention."""

    def setUp(self):
        self.client = APIClient()
        self.shopper = _user('race_shopper@test.com')
        self.other = _user('race_other@test.com')
        self.session_id = 'studio-race-0001'
        self.client.force_authenticate(self.shopper)

    def _post(self, survey):
        return self.client.post(URL, {'survey': survey}, format='json')

    def test_meta_declares_the_unique_key(self):
        """Guards the drift: without this declaration makemigrations generates
        a migration that DROPS the unique index added by 0011."""
        self.assertIn(('user', 'session_id'), FittingStudioSurvey._meta.unique_together)

    def test_db_rejects_duplicate_user_session(self):
        """The index itself refuses a second document for the same visit.
        (Autocommit backend: no outer transaction is poisoned by the error.)"""
        FittingStudioSurvey.objects.create(
            user=self.shopper, session_id=self.session_id, pre_confidence=2,
        )
        with self.assertRaises(IntegrityError):
            FittingStudioSurvey.objects.create(
                user=self.shopper, session_id=self.session_id, post_confidence=4,
            )
        self.assertEqual(FittingStudioSurvey.objects.count(), 1)

    def test_same_session_id_allowed_for_different_users(self):
        FittingStudioSurvey.objects.create(
            user=self.shopper, session_id=self.session_id, fit_rating=4,
        )
        FittingStudioSurvey.objects.create(
            user=self.other, session_id=self.session_id, fit_rating=3,
        )
        self.assertEqual(FittingStudioSurvey.objects.count(), 2)

    def test_lost_create_race_resolves_to_the_existing_row(self):
        """Simulate losing the insert race: get_or_create raises IntegrityError,
        the view must fall through to the SAME document and merge into it."""
        first = self._post({'session_id': self.session_id, 'pre_confidence': 2})
        self.assertEqual(first.status_code, 201)
        existing = FittingStudioSurvey.objects.get()

        with patch.object(
            FittingStudioSurvey.objects, 'get_or_create',
            side_effect=IntegrityError('duplicate key on (user, session_id)'),
        ):
            second = self._post({
                'session_id': self.session_id, 'post_confidence': 4, 'fit_rating': 5,
            })

        self.assertEqual(second.status_code, 200)
        self.assertFalse(second.data['created'])
        self.assertEqual(second.data['survey_id'], str(existing.pk))
        self.assertEqual(FittingStudioSurvey.objects.count(), 1)

        existing.refresh_from_db()
        self.assertEqual(existing.pre_confidence, 2)
        self.assertEqual(existing.post_confidence, 4)
        self.assertEqual(existing.confidence_gain, 2)
        self.assertEqual(existing.fit_rating, 5)

    def test_stale_phase_snapshot_cannot_clobber_the_other_phase(self):
        """Lost-update regression. A phase-2 writer holding a snapshot taken
        BEFORE phase 1 landed must not null out pre_confidence or the gain.
        The old full row.save() failed this test."""
        self._post({'session_id': self.session_id, 'pre_confidence': 2})
        row = FittingStudioSurvey.objects.get()

        stale = FittingStudioSurvey.objects.get(pk=row.pk)
        stale.pre_confidence = None
        stale.confidence_gain = None

        with patch.object(
            FittingStudioSurvey.objects, 'get_or_create',
            return_value=(stale, False),
        ):
            res = self._post({'session_id': self.session_id, 'post_confidence': 4})

        self.assertEqual(res.status_code, 200)
        self.assertEqual(FittingStudioSurvey.objects.count(), 1)
        row.refresh_from_db()
        self.assertEqual(row.pre_confidence, 2)       # phase 1 survived
        self.assertEqual(row.post_confidence, 4)      # phase 2 applied
        self.assertEqual(row.confidence_gain, 2)      # recomputed from storage

        self.shopper.refresh_from_db()
        self.assertEqual(
            self.shopper.latest_fitting_studio_survey['confidence_gain'], 2,
        )

    def test_confidence_gain_is_server_computed_not_client_supplied(self):
        res = self._post({
            'session_id': self.session_id,
            'pre_confidence': 1, 'post_confidence': 5,
            'confidence_gain': 99,
        })
        self.assertEqual(res.status_code, 201)
        row = FittingStudioSurvey.objects.get()
        self.assertEqual(row.confidence_gain, 4)


class SurveyDedupeHelperTests(TestCase):
    """The 0011 pre-constraint helper stays safe to re-run on clean data, and
    its call contract is pinned so a signature change can never again break
    test-database creation."""

    def test_helper_is_a_noop_on_clean_data(self):
        from accounts.survey_dedupe import dedupe_fitting_studio_surveys

        shopper = _user('dedupe_shopper@test.com')
        FittingStudioSurvey.objects.create(
            user=shopper, session_id='studio-dedupe-0001', fit_rating=4,
        )
        FittingStudioSurvey.objects.create(
            user=shopper, session_id='studio-dedupe-0002', fit_rating=5,
        )

        stats = dedupe_fitting_studio_surveys()
        self.assertEqual(stats['duplicate_groups'], 0)
        self.assertEqual(stats['deleted'], 0)
        self.assertEqual(FittingStudioSurvey.objects.count(), 2)

        again = dedupe_fitting_studio_surveys()
        self.assertEqual(again['deleted'], 0)
        self.assertEqual(FittingStudioSurvey.objects.count(), 2)

    def test_migration_call_shape_apply_keyword_is_supported(self):
        """REGRESSION: migration 0011 calls dedupe_fitting_studio_surveys(apply=True).
        Narrowing the helper to (apps, schema_editor) broke create_test_db."""
        from accounts.survey_dedupe import dedupe_fitting_studio_surveys

        stats = dedupe_fitting_studio_surveys(apply=True)
        self.assertTrue(stats['applied'])
        self.assertEqual(stats['deleted'], 0)

    def test_apply_false_is_a_dry_run(self):
        from accounts.survey_dedupe import dedupe_fitting_studio_surveys

        shopper = _user('dedupe_dry@test.com')
        FittingStudioSurvey.objects.create(
            user=shopper, session_id='studio-dedupe-dry', fit_rating=4,
        )
        stats = dedupe_fitting_studio_surveys(apply=False)
        self.assertFalse(stats['applied'])
        self.assertEqual(stats['deleted'], 0)
        self.assertEqual(FittingStudioSurvey.objects.count(), 1)

    def test_positional_bool_is_treated_as_apply(self):
        from accounts.survey_dedupe import dedupe_fitting_studio_surveys

        stats = dedupe_fitting_studio_surveys(False)
        self.assertFalse(stats['applied'])