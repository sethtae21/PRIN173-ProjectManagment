"""ratings/tests_uat_charter.py — Charter §3.2 UAT KPI alignment (KAN-89 evidence wiring).

Run (Atlas awake):  python manage.py test ratings.tests_uat_charter -v 2
"""
import json
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.urls import reverse
from rest_framework.test import APIClient

# FIX: UAT_VALUE_MIN/MAX live in models.py (where the field validator uses them)
from .models import Rating, UATResponse, UATSession, UAT_VALUE_MIN, UAT_VALUE_MAX
from .uat_kpis import (
    APPROVAL_MIN_SCORE, CHARTER_THRESHOLDS, CONFIDENCE_GAIN_MIN,
    CONFIDENCE_POST_PASS, EVENT_CART_CREATED, EVENT_CHECKOUT_COMPLETED,
    KPI_OBJ01, KPI_OBJ02, KPI_OBJ03, KPI_OBJ04, KPI_OBJ05, KPI_OBJ06,
    KPI_OBJ07, KPI_OBJ08, KPI_OBJ09, PAIRED_QUESTIONS,
    SOURCE_FIT_VISUALIZATION, SOURCE_PRODUCT_PAGE, SOURCE_RECOMMENDATION_PANEL,
    STATUS_BELOW, STATUS_MANUAL, STATUS_MET, STATUS_NOT_RUN,
    SUPPLEMENTARY_QUESTIONS,
    build_uat_workbook_rows, record_uat_commerce_event,
)

User = get_user_model()


def _shopper(username):
    # Matches the project's account factory usage elsewhere in the suite.
    return User.objects.create_user(
        email=f'{username}@example.com',
        full_name=username.replace('_', ' ').title(),
        password='Test123!@#',
        role='shopper',
    )


class CharterThresholdLockTests(SimpleTestCase):
    """These ARE the Charter §3.2 numbers. If this test fails, someone edited
    a charter constant — that is a baselined change requiring adviser/CCB
    sign-off, not a code convenience."""

    def test_charter_numbers_are_locked(self):
        self.assertEqual(CHARTER_THRESHOLDS['OBJ-01'], 80.0)
        self.assertEqual(CHARTER_THRESHOLDS['OBJ-05'], 80.0)
        self.assertEqual(CHARTER_THRESHOLDS['OBJ-06'], 80.0)
        self.assertEqual(CHARTER_THRESHOLDS['OBJ-07'], 70.0)
        self.assertEqual(CHARTER_THRESHOLDS['OBJ-09'], 80.0)
        self.assertEqual(CONFIDENCE_GAIN_MIN, 1)
        self.assertEqual(CONFIDENCE_POST_PASS, 4)
        self.assertEqual(APPROVAL_MIN_SCORE, 4)
        self.assertEqual((UAT_VALUE_MIN, UAT_VALUE_MAX), (0, 5))

    def test_question_contract_and_rating_sources(self):
        sources = dict(Rating.SOURCE_CHOICES)
        for required in (SOURCE_RECOMMENDATION_PANEL, SOURCE_FIT_VISUALIZATION,
                         SOURCE_PRODUCT_PAGE):
            self.assertIn(required, sources)
        self.assertEqual(len(PAIRED_QUESTIONS), 4)
        self.assertIn('style_discovery', SUPPLEMENTARY_QUESTIONS)


class UATSessionCreateTests(TestCase):
    """OBJ-01 join integrity: the session must persist product_id so fit
    ratings can be matched to their try-on session."""

    def setUp(self):
        self.client = APIClient()
        self.user = _shopper('uat_session_create')
        self.client.force_authenticate(self.user)
        self.url = reverse('uat-session-create')

    def test_session_create_stores_product_id_for_obj01_join(self):
        product_id = uuid4().hex
        response = self.client.post(
            self.url, {'role': 'shopper', 'product_id': product_id}, format='json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['product_id'], product_id)
        session = UATSession.objects.get(session_id=response.data['session_id'])
        self.assertEqual(session.product_id, product_id)
        self.assertEqual(session.status, 'active')


class UATResponseZeroValueTests(TestCase):
    """Bug: numeric zero ("No") must be saved; null/empty/non-integer/unknown
    keys must still fail cleanly."""

    def setUp(self):
        self.client = APIClient()
        self.user = _shopper('uat_zero')
        self.client.force_authenticate(self.user)
        session = UATSession.objects.create(
            user=self.user, product_id=uuid4().hex, role='shopper')
        self.product_id = session.product_id
        self.session_id = session.session_id
        self.url = reverse('uat-response-submit')

    def _post(self, value):
        return self.client.post(self.url, {
            'session_id': self.session_id, 'product_id': self.product_id,
            'phase': 'supplementary', 'question_key': 'style_discovery', 'value': value,
        }, format='json')

    def test_zero_answer_is_saved_not_dropped(self):
        response = self._post(0)
        self.assertEqual(response.status_code, 201)
        saved = UATResponse.objects.get(session__session_id=self.session_id,
                                        question_key='style_discovery')
        self.assertEqual(saved.value, 0)

    def test_null_answer_is_still_rejected(self):
        self.assertEqual(self._post(None).status_code, 400)

    def test_empty_string_answer_is_rejected(self):
        self.assertEqual(self._post('').status_code, 400)

    def test_fractional_answer_is_rejected_not_truncated(self):
        # int(1.5) would silently truncate to 1; the view must refuse it.
        self.assertEqual(self._post(1.5).status_code, 400)
        self.assertFalse(UATResponse.objects.filter(
            session__session_id=self.session_id).exists())

    def test_unknown_question_key_rejected(self):
        response = self.client.post(self.url, {
            'session_id': self.session_id, 'product_id': self.product_id,
            'phase': 'supplementary', 'question_key': 'vibes', 'value': 3,
        }, format='json')
        self.assertEqual(response.status_code, 400)


class UATCharterKPITests(TestCase):
    def setUp(self):
        self.product_id = uuid4().hex  # no dependency on seeded catalog ids
        self.users = [_shopper(f'uatkpi{i}') for i in range(6)]
        self.sessions = [
            UATSession.objects.create(user=user, product_id=self.product_id, role='shopper')
            for user in self.users
        ]

    def _answer(self, session, question_key, phase, value):
        UATResponse.objects.create(session=session, product_id=self.product_id,
                                   question_key=question_key, phase=phase, value=value)

    def _row(self, kpi):
        for row in build_uat_workbook_rows():
            if row['kpi'] == kpi:
                return row
        raise AssertionError(f'No workbook row named {kpi!r}')

    # ---- OBJ-01 ----------------------------------------------------------
    def test_obj01_counts_percent_of_eligible_sessions_including_fit_rating(self):
        s_pass_full, s_fail_no_rating, s_fail_style, s_ineligible, s_pass_vote_only, _ = self.sessions
        pid = self.product_id
        # Pass: fit gain +2, style gain +1, fit rating 5 stars.
        self._answer(s_pass_full, 'fit_confidence', 'before', 2)
        self._answer(s_pass_full, 'fit_confidence', 'after', 4)
        self._answer(s_pass_full, 'style_confidence', 'before', 3)
        self._answer(s_pass_full, 'style_confidence', 'after', 4)
        Rating.objects.create(user=s_pass_full.user, target_type='fit', target_id=pid,
                              score=5, source=SOURCE_FIT_VISUALIZATION)
        # Fails: confidence passes but no fit_visualization rating. Ratings
        # tagged with another surface must NOT count for OBJ-01.
        self._answer(s_fail_no_rating, 'fit_confidence', 'before', 2)
        self._answer(s_fail_no_rating, 'fit_confidence', 'after', 4)
        self._answer(s_fail_no_rating, 'style_confidence', 'before', 2)
        self._answer(s_fail_no_rating, 'style_confidence', 'after', 4)
        Rating.objects.create(user=s_fail_no_rating.user, target_type='fit', target_id=pid,
                              score=5, source=SOURCE_PRODUCT_PAGE)
        # Fails: style flat at 3 (gain 0, post < 4) despite a fit like.
        self._answer(s_fail_style, 'fit_confidence', 'before', 3)
        self._answer(s_fail_style, 'fit_confidence', 'after', 4)
        self._answer(s_fail_style, 'style_confidence', 'before', 3)
        self._answer(s_fail_style, 'style_confidence', 'after', 3)
        Rating.objects.create(user=s_fail_style.user, target_type='fit', target_id=pid,
                              score=5, source=SOURCE_FIT_VISUALIZATION)
        # Ineligible: missing style 'after' -> excluded from the denominator.
        self._answer(s_ineligible, 'fit_confidence', 'before', 2)
        self._answer(s_ineligible, 'fit_confidence', 'after', 5)
        self._answer(s_ineligible, 'style_confidence', 'before', 2)
        # Pass: 4->4 (post >= 4 with zero gain) + 'like' vote alone.
        self._answer(s_pass_vote_only, 'fit_confidence', 'before', 4)
        self._answer(s_pass_vote_only, 'fit_confidence', 'after', 4)
        self._answer(s_pass_vote_only, 'style_confidence', 'before', 1)
        self._answer(s_pass_vote_only, 'style_confidence', 'after', 2)
        Rating.objects.create(user=s_pass_vote_only.user, target_type='fit', target_id=pid,
                              vote='like', source=SOURCE_FIT_VISUALIZATION)

        row = self._row(KPI_OBJ01)
        self.assertEqual(row['denominator'], '4')
        self.assertEqual(row['numerator'], '2')
        self.assertEqual(row['actual_result'], '50.00%')
        self.assertEqual(row['status'], STATUS_BELOW)

    # ---- OBJ-06 ----------------------------------------------------------
    def test_obj06_requires_both_confidence_gain_and_return_intent_drop(self):
        s_pass, s_flat_return, s_flat_confidence, s_unpaired, _, _ = self.sessions
        self._answer(s_pass, 'purchase_confidence', 'before', 2)
        self._answer(s_pass, 'purchase_confidence', 'after', 4)
        self._answer(s_pass, 'return_intent', 'before', 4)
        self._answer(s_pass, 'return_intent', 'after', 2)
        # Confidence up, return intent flat -> fails.
        self._answer(s_flat_return, 'purchase_confidence', 'before', 2)
        self._answer(s_flat_return, 'purchase_confidence', 'after', 3)
        self._answer(s_flat_return, 'return_intent', 'before', 3)
        self._answer(s_flat_return, 'return_intent', 'after', 3)
        # Return intent down, confidence flat -> fails.
        self._answer(s_flat_confidence, 'purchase_confidence', 'before', 3)
        self._answer(s_flat_confidence, 'purchase_confidence', 'after', 3)
        self._answer(s_flat_confidence, 'return_intent', 'before', 4)
        self._answer(s_flat_confidence, 'return_intent', 'after', 1)
        # Missing return_intent 'before' -> ineligible.
        self._answer(s_unpaired, 'purchase_confidence', 'before', 2)
        self._answer(s_unpaired, 'purchase_confidence', 'after', 5)
        self._answer(s_unpaired, 'return_intent', 'after', 1)

        row = self._row(KPI_OBJ06)
        self.assertEqual(row['denominator'], '3')
        self.assertEqual(row['numerator'], '1')
        self.assertEqual(row['actual_result'], '33.33%')
        self.assertEqual(row['status'], STATUS_BELOW)

    # ---- OBJ-05 ----------------------------------------------------------
    def test_obj05_measures_recommendation_panel_approval_not_style_discovery(self):
        u1, u2, u3, u4, u5, u6 = self.users
        pid = self.product_id
        Rating.objects.create(user=u1, target_type='item', target_id=pid,
                              score=5, source=SOURCE_RECOMMENDATION_PANEL)
        Rating.objects.create(user=u2, target_type='item', target_id=pid,
                              score=4, source=SOURCE_RECOMMENDATION_PANEL)
        Rating.objects.create(user=u3, target_type='item', target_id=pid,
                              score=3, source=SOURCE_RECOMMENDATION_PANEL)
        Rating.objects.create(user=u4, target_type='item', target_id=pid,
                              vote='like', source=SOURCE_RECOMMENDATION_PANEL)
        # Must NOT leak into OBJ-05: a product-page rating and survey answers.
        Rating.objects.create(user=u5, target_type='item', target_id=pid,
                              score=5, source=SOURCE_PRODUCT_PAGE)
        self._answer(self.sessions[5], 'style_discovery', 'supplementary', 1)

        row = self._row(KPI_OBJ05)
        self.assertEqual(row['denominator'], '4')
        self.assertEqual(row['numerator'], '3')
        self.assertEqual(row['actual_result'], '75.00%')
        self.assertEqual(row['status'], STATUS_BELOW)

        Rating.objects.create(user=u6, target_type='item', target_id=pid,
                              score=5, source=SOURCE_RECOMMENDATION_PANEL)
        row = self._row(KPI_OBJ05)
        self.assertEqual(row['actual_result'], '80.00%')
        self.assertEqual(row['status'], STATUS_MET)

    # ---- OBJ-07 ----------------------------------------------------------
    def test_obj07_counts_completed_checkouts_over_created_carts(self):
        s_done, s_abandoned, s_tryon_only = self.sessions[:3]
        s_done.notes = '{"cart_created": true, "checkout_completed": true}'
        s_done.save()
        s_abandoned.notes = '{"cart_created": true}'
        s_abandoned.save()
        # s_tryon_only has no cart event -> never enters the denominator.

        row = self._row(KPI_OBJ07)
        self.assertEqual(row['denominator'], '2')
        self.assertEqual(row['numerator'], '1')
        self.assertEqual(row['actual_result'], '50.00%')
        self.assertEqual(row['status'], STATUS_BELOW)

    # ---- context rows ----------------------------------------------------
    def test_zero_no_answer_counts_in_style_discovery_context_row(self):
        self._answer(self.sessions[0], 'style_discovery', 'supplementary', 0)
        row = self._row('CONTEXT| Style discovery (survey — not OBJ-05 evidence)')
        self.assertEqual(row['sample_size'], 1)
        self.assertEqual(row['numerator'], '0')
        self.assertEqual(row['denominator'], '1')
        self.assertEqual(row['actual_result'], '0.00% Yes')


class UATCommerceHookTests(TestCase):
    def test_hook_requires_active_session_and_completes_on_checkout(self):
        user = _shopper('hook_user')
        self.assertFalse(record_uat_commerce_event(user, EVENT_CART_CREATED))  # no session

        session = UATSession.objects.create(user=user, product_id=uuid4().hex, role='shopper')
        self.assertTrue(record_uat_commerce_event(user, EVENT_CART_CREATED))
        self.assertTrue(record_uat_commerce_event(user, EVENT_CHECKOUT_COMPLETED))
        session.refresh_from_db()
        self.assertEqual(session.status, 'completed')
        notes = json.loads(session.notes)
        self.assertIs(notes.get('cart_created'), True)
        self.assertIs(notes.get('checkout_completed'), True)
        # Completed session is no longer active: later commerce events are
        # ignored, so one session can never inflate the cart denominator.
        self.assertFalse(record_uat_commerce_event(user, EVENT_CART_CREATED))
        self.assertFalse(record_uat_commerce_event(user, 'bogus_event'))
        self.assertFalse(record_uat_commerce_event(None, EVENT_CART_CREATED))


class UATWorkbookEmptyTests(TestCase):
    def test_empty_database_reports_not_run_with_zero_samples(self):
        rows = {row['kpi']: row for row in build_uat_workbook_rows()}
        for kpi in (KPI_OBJ01, KPI_OBJ05, KPI_OBJ06, KPI_OBJ07):
            self.assertEqual(rows[kpi]['status'], STATUS_NOT_RUN)
            self.assertEqual(rows[kpi]['sample_size'], 0)
            self.assertEqual(rows[kpi]['actual_result'], '')
        for kpi in (KPI_OBJ02, KPI_OBJ03, KPI_OBJ04, KPI_OBJ08, KPI_OBJ09):
            self.assertEqual(rows[kpi]['status'], STATUS_MANUAL)
            self.assertTrue(rows[kpi]['evidence_reference'])

    def test_subjective_surveys_are_labelled_context_not_charter_evidence(self):
        rows = {row['kpi']: row for row in build_uat_workbook_rows()}
        context_rows = [k for k in rows if k.startswith('CONTEXT|')]
        self.assertEqual(len(context_rows), 6)
        for kpi in context_rows:
            self.assertEqual(rows[kpi]['objective'], 'Context only')

    def test_no_proposed_targets_remain(self):
        for row in build_uat_workbook_rows():
            self.assertNotIn('proposed', row['target'].lower())