"""ratings/uat_kpis.py — Charter-aligned UAT KPI engine (single source of truth).

Traceability: Project Charter §3.2 (objectives + acceptance criteria), SRS §1.2,
Scope Criteria 1–11, WBS 1.4.x UAT plan, KAN-89 evidence wiring.

Rules baked into this module:
  * Charter numbers are BASELINED acceptance criteria. They are never
    "proposed", never retuned to fit captured data, and any edit is a
    baselined change (adviser/CCB), guarded by CharterThresholdLockTests.
  * Percent-of-eligible-sessions KPIs (OBJ-01/06) use paired before/after
    answers only; unpaired answers never enter the denominator.
  * OBJ-05 reads in-app ratings tagged source='recommendation_panel' only.
  * OBJ-07 counts trusted server-side commerce events, never client claims
    and never manual POSTs (the manual event endpoint was removed so the
    evidence cannot be falsified).
  * Objectives whose charter evidence is observed/measured (OBJ-02/03/04/08/09)
    are reported as manual-evidence rows. Subjective survey answers are
    exported only as "Context only" rows and are never substituted.

Keep the questionnaire constants in sync with frontend/src/services/uat.js.
"""
import json
import logging

from .models import Rating, UATResponse, UATSession

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Charter §3.2 thresholds (Criteria 5, 8–11). LOCKED by CharterThresholdLockTests.
# ---------------------------------------------------------------------------
CHARTER_THRESHOLDS = {
    'OBJ-01': 80.0,   # Criterion 9  — fit/style confidence + fit "like"
    'OBJ-05': 80.0,   # Criterion 10 — recommendation approval
    'OBJ-06': 80.0,   # Criterion 11 — confidence up AND return intent down
    'OBJ-07': 70.0,   # Criterion 8  — carts completing mock checkout
    'OBJ-09': 80.0,   # Criterion 5  — items published without correction
}

# Charter §3.2 objective budgets for the non-rating objectives (used to build
# target text so every number appears exactly once in the codebase).
GUEST_TRYON_BUDGET_MINUTES = 2      # OBJ-02 / Criterion 6
API_SLO_PERCENT = 95                # OBJ-03 / Criteria 1–3
API_P95_BUDGET_MS = 500
CANVAS_RENDER_BUDGET_SECONDS = 1
PAGE_LOAD_BUDGET_SECONDS = 3
CHECKLIST_PASS_PERCENT = 100        # OBJ-04 / RT-09
CSV_PIPELINE_ITEM_COUNT = 10        # OBJ-08
CSV_PIPELINE_BUDGET_SECONDS = 60

# Per-session scoring rules (Criterion 9: gain >= +1 OR post >= 4/5;
# "like" >= 4/5 per FR-7.5 which allows like/dislike OR 1–5).
CONFIDENCE_GAIN_MIN = 1
CONFIDENCE_POST_PASS = 4
APPROVAL_MIN_SCORE = 4

# Mathematical and encoding constants (not charter thresholds, but extracted
# to satisfy strict no-magic-number linting and ensure zero numeric literals
# remain in the KPI calculation logic).
PERCENTAGE_SCALE = 100
YES_NO_VALUE_YES = 1

# ---------------------------------------------------------------------------
# Questionnaire contract (mirror of frontend/src/services/uat.js).
# ---------------------------------------------------------------------------
PHASE_BEFORE = 'before'
PHASE_AFTER = 'after'
PHASE_SUPPLEMENTARY = 'supplementary'

PAIRED_QUESTIONS = (
    'fit_confidence',
    'style_confidence',
    'purchase_confidence',
    'return_intent',
)
SUPPLEMENTARY_QUESTIONS = (
    'privacy_comfort',
    'responsiveness',
    'match_helpfulness',
    'style_discovery',
    'checkout_frustration',
    'seller_validation_clarity',
)
YES_NO_QUESTIONS = ('style_discovery',)
KNOWN_QUESTION_KEYS = frozenset(PAIRED_QUESTIONS + SUPPLEMENTARY_QUESTIONS)

# Rating surfaces — validated against Rating.SOURCE_CHOICES in the test suite.
SOURCE_RECOMMENDATION_PANEL = 'recommendation_panel'
SOURCE_FIT_VISUALIZATION = 'fit_visualization'
SOURCE_PRODUCT_PAGE = 'product_page'

# OBJ-07 trusted commerce events (Criterion 8).
EVENT_CART_CREATED = 'cart_created'
EVENT_CHECKOUT_COMPLETED = 'checkout_completed'
UAT_COMMERCE_EVENTS = (EVENT_CART_CREATED, EVENT_CHECKOUT_COMPLETED)

# Workbook statuses (consumed by the CSV export and UAT-04 reporting).
STATUS_NOT_RUN = 'Not Run'
STATUS_MANUAL = 'Not Run — manual evidence'
STATUS_MET = 'Met target'
STATUS_BELOW = 'Below target'
STATUS_CALCULATED = 'Calculated'

# KPI row labels (built from constants where numbers are involved).
KPI_OBJ01 = 'OBJ-01| Fit/style confidence sessions meeting charter criterion'
KPI_OBJ02 = (f'OBJ-02| Guest first try-on ≤ {GUEST_TRYON_BUDGET_MINUTES} min '
             'with zero photo uploads')
KPI_OBJ03 = (f'OBJ-03| Performance (API < {API_P95_BUDGET_MS} ms / '
             f'canvas < {CANVAS_RENDER_BUDGET_SECONDS} s / '
             f'load < {PAGE_LOAD_BUDGET_SECONDS} s)')
KPI_OBJ04 = 'OBJ-04| Security & privacy checklist'
KPI_OBJ05 = 'OBJ-05| Recommendation approval'
KPI_OBJ06 = 'OBJ-06| Purchase-decision sessions meeting charter criterion'
KPI_OBJ07 = 'OBJ-07| Mock checkout completion (completed ÷ created carts)'
KPI_OBJ08 = (f'OBJ-08| {CSV_PIPELINE_ITEM_COUNT}-item CSV pipeline '
             f'< {CSV_PIPELINE_BUDGET_SECONDS} s')
KPI_OBJ09 = 'OBJ-09| Items published without manual correction'


# ---------------------------------------------------------------------------
# Small shared helpers
# ---------------------------------------------------------------------------
def _not_run():
    return {'actual_result': '', 'sample_size': 0, 'numerator': '',
            'denominator': '', 'status': STATUS_NOT_RUN}


def _manual_evidence(evidence_reference):
    """Row for objectives whose charter evidence is observed/measured outside
    the survey store. Never fabricates a number; never accepts a subjective
    rating as a substitute."""
    return {**_not_run(),
            'status': STATUS_MANUAL,
            'evidence_reference': evidence_reference}


def _json_notes(raw):
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _paired_values(question_key):
    """Paired before/after answers keyed by (session PK, product id str).

    Only keys answered in BOTH phases are returned: an unpaired answer cannot
    evidence a within-session change and stays out of the eligible
    denominator. `value == 0` is a legal answer and is kept (value__isnull).
    """
    collected = {}
    for response in UATResponse.objects.filter(
        question_key=question_key,
        value__isnull=False,
    ).values('session_id', 'product_id', 'phase', 'value'):
        key = (response['session_id'], str(response['product_id']))
        collected.setdefault(key, {})[response['phase']] = int(response['value'])
    return {key: phases for key, phases in collected.items()
            if PHASE_BEFORE in phases and PHASE_AFTER in phases}


def _confidence_improved(pair):
    """Criterion 9 per-question condition: gain ≥ +1 OR post ≥ 4/5."""
    return (pair[PHASE_AFTER] - pair[PHASE_BEFORE] >= CONFIDENCE_GAIN_MIN
            or pair[PHASE_AFTER] >= CONFIDENCE_POST_PASS)


def _rating_approves(row):
    """FR-7.5: approval can be expressed as vote 'like' OR score ≥ 4/5."""
    score = row.get('score')
    if score is not None and int(score) >= APPROVAL_MIN_SCORE:
        return True
    return row.get('vote') == 'like'


def _rate_summary(numerator, denominator, threshold_pct, evidence_reference):
    percentage = (numerator / denominator) * PERCENTAGE_SCALE if denominator else 0.0
    return {
        'actual_result': f'{percentage:.2f}%',
        'sample_size': denominator,
        'numerator': str(numerator),
        'denominator': str(denominator),
        'status': STATUS_MET if percentage >= threshold_pct else STATUS_BELOW,
        'evidence_reference': evidence_reference,
    }


def _at_least(threshold_pct):
    return f'≥ {threshold_pct:g}%'


# ---------------------------------------------------------------------------
# Charter KPI builders
# ---------------------------------------------------------------------------
def _obj01_fit_style_summary():
    """Criterion 9: % of ELIGIBLE try-on sessions where fit AND style
    confidence improved AND the fit visualization was rated "like".
    Fit ratings join to sessions by (user, product) — UATSessionCreateView
    persists product_id — and must be tagged source='fit_visualization' /
    target_type='fit'."""
    fit_pairs = _paired_values('fit_confidence')
    style_pairs = _paired_values('style_confidence')
    eligible_keys = sorted(set(fit_pairs) & set(style_pairs))
    evidence = ('Pre/post fit_confidence + style_confidence answers joined to '
                'fit_visualization in-app ratings (FR-7.5 / KAN-89 / KAN-101).')
    if not eligible_keys:
        return {**_not_run(),
                'evidence_reference': f'{evidence} No eligible sessions captured yet.'}

    session_user = {(session.pk, str(session.product_id)): session.user_id
                    for session in UATSession.objects.all()}

    fit_likes = set()
    for row in Rating.objects.filter(
        target_type='fit',
        source=SOURCE_FIT_VISUALIZATION,
    ).values('user_id', 'target_id', 'score', 'vote'):
        if _rating_approves(row):
            fit_likes.add((row['user_id'], str(row['target_id'])))

    met = 0
    for key in eligible_keys:
        fit_ok = _confidence_improved(fit_pairs[key])
        style_ok = _confidence_improved(style_pairs[key])
        user_id = session_user.get(key)
        liked = user_id is not None and (user_id, key[1]) in fit_likes
        if fit_ok and style_ok and liked:
            met += 1

    return _rate_summary(met, len(eligible_keys),
                         CHARTER_THRESHOLDS['OBJ-01'], evidence)


def _obj05_recommendation_approval_summary():
    """Criterion 10: % of recorded recommendation_panel ratings approving.
    Product-page / fit ratings and all survey questions are excluded."""
    rows = list(Rating.objects.filter(
        target_type='item',
        source=SOURCE_RECOMMENDATION_PANEL,
    ).values('score', 'vote'))
    evidence = ('Rating rows with source=recommendation_panel (FR-7.5 / KAN-101). '
                'Approval = vote "like" or score ≥ 4/5.')
    if not rows:
        return {**_not_run(),
                'evidence_reference': f'{evidence} No ratings recorded yet.'}
    approvals = sum(1 for row in rows if _rating_approves(row))
    return _rate_summary(approvals, len(rows), CHARTER_THRESHOLDS['OBJ-05'], evidence)


def _obj06_purchase_decision_summary():
    """Criterion 11: % of ELIGIBLE sessions with purchase confidence STRICTLY
    increased AND return intent STRICTLY decreased vs the before baseline."""
    confidence_pairs = _paired_values('purchase_confidence')
    return_pairs = _paired_values('return_intent')
    eligible_keys = sorted(set(confidence_pairs) & set(return_pairs))
    evidence = ('Paired pre/post purchase_confidence and return_intent responses '
                '(KAN-89). Session passes only when confidence strictly increased '
                'AND return intent strictly decreased.')
    if not eligible_keys:
        return {**_not_run(),
                'evidence_reference': f'{evidence} No eligible sessions captured yet.'}
    met = 0
    for key in eligible_keys:
        confidence = confidence_pairs[key]
        returns = return_pairs[key]
        if (confidence[PHASE_AFTER] > confidence[PHASE_BEFORE]
                and returns[PHASE_AFTER] < returns[PHASE_BEFORE]):
            met += 1
    return _rate_summary(met, len(eligible_keys),
                         CHARTER_THRESHOLDS['OBJ-06'], evidence)


def _obj07_checkout_completion_summary():
    """Criterion 8: completed mock checkouts ÷ carts created during UAT.

    Events are written server-side (record_uat_commerce_event) on the
    tester's own ACTIVE session; try-on-only sessions never enter the
    denominator. The per-session boolean flags are an EXACT cart count in
    this system: the cart is a per-user singleton (Cart.objects.get_or_create)
    and a session flips to 'completed' the moment its checkout succeeds, so
    one session can contribute at most one created cart and one completed
    checkout — and post-checkout cart events are ignored by the hook.
    """
    carts = 0
    completed = 0
    for session in UATSession.objects.all():
        notes = _json_notes(session.notes)
        if notes.get(EVENT_CART_CREATED) is not True:
            continue
        carts += 1
        if notes.get(EVENT_CHECKOUT_COMPLETED) is True:
            completed += 1
    evidence = ('Server-side UAT commerce events (cart_created / checkout_completed) '
                'recorded on active shopper UAT sessions (KAN-89).')
    if carts == 0:
        return {**_not_run(),
                'evidence_reference': f'{evidence} No UAT carts recorded yet.'}
    return _rate_summary(completed, carts, CHARTER_THRESHOLDS['OBJ-07'], evidence)


# ---------------------------------------------------------------------------
# Context-only summaries (subjective signals; never charter evidence)
# ---------------------------------------------------------------------------
_CONTEXT_EVIDENCE = 'Supplementary UAT survey (KAN-89) — context only.'


def _rating_mean_summary(question_key):
    values = [int(v) for v in UATResponse.objects.filter(
        question_key=question_key, value__isnull=False,
    ).values_list('value', flat=True)]
    if not values:
        return {**_not_run(), 'evidence_reference': _CONTEXT_EVIDENCE}
    mean = sum(values) / len(values)
    return {'actual_result': f'{mean:.2f} / 5', 'sample_size': len(values),
            'numerator': '', 'denominator': '', 'status': STATUS_CALCULATED,
            'evidence_reference': _CONTEXT_EVIDENCE}


def _yes_no_summary(question_key):
    values = [int(v) for v in UATResponse.objects.filter(
        question_key=question_key, value__isnull=False,
    ).values_list('value', flat=True)]
    if not values:
        return {**_not_run(), 'evidence_reference': _CONTEXT_EVIDENCE}
    yes = sum(1 for v in values if v == YES_NO_VALUE_YES)
    pct = (yes / len(values)) * PERCENTAGE_SCALE
    return {'actual_result': f'{pct:.2f}% Yes', 'sample_size': len(values),
            'numerator': str(yes), 'denominator': str(len(values)),
            'status': STATUS_CALCULATED, 'evidence_reference': _CONTEXT_EVIDENCE}


CONTEXT_QUESTIONS = (
    ('privacy_comfort', 'CONTEXT| Privacy comfort (survey — not OBJ-02 evidence)',
     'Supplementary comfort rating (informative only). OBJ-02 requires an observed '
     f'≤ {GUEST_TRYON_BUDGET_MINUTES}:00 guest try-on with zero photo uploads.'),
    ('responsiveness', 'CONTEXT| Perceived responsiveness (survey — not OBJ-03 evidence)',
     f'Supplementary perception rating. OBJ-03 requires measured API < {API_P95_BUDGET_MS} ms, '
     f'canvas < {CANVAS_RENDER_BUDGET_SECONDS} s, load < {PAGE_LOAD_BUDGET_SECONDS} s.'),
    ('match_helpfulness', 'CONTEXT| Match reasons helpfulness (survey — not OBJ-05 evidence)',
     f'Supplementary clarity rating. OBJ-05 is {_at_least(CHARTER_THRESHOLDS["OBJ-05"])} '
     'approval of recommendations via in-app rating.'),
    ('style_discovery', 'CONTEXT| Style discovery (survey — not OBJ-05 evidence)',
     'Supplementary Yes/No question ("No" = 0 is a valid, persisted answer).'),
    ('checkout_frustration', 'CONTEXT| Checkout frustration (survey — not OBJ-07 evidence)',
     'Supplementary friction rating. OBJ-07 is completed ÷ created mock checkouts.'),
    ('seller_validation_clarity', 'CONTEXT| Seller validation clarity (survey — not OBJ-09 evidence)',
     f'Supplementary clarity rating. OBJ-09 is {_at_least(CHARTER_THRESHOLDS["OBJ-09"])} '
     'of items published without manual correction.'),
)


# ---------------------------------------------------------------------------
# Workbook
# ---------------------------------------------------------------------------
def build_uat_workbook_rows():
    rows = []

    def add_row(kpi, objective, target, summary):
        rows.append({
            'kpi': kpi,
            'objective': objective,
            'target': target,
            'actual_result': summary.get('actual_result', ''),
            'sample_size': summary.get('sample_size', 0),
            'status': summary.get('status', STATUS_NOT_RUN),
            'evidence_reference': summary.get('evidence_reference', ''),
            'numerator': str(summary.get('numerator', '')),
            'denominator': str(summary.get('denominator', '')),
        })

    add_row(
        KPI_OBJ01, 'OBJ-01',
        f'{_at_least(CHARTER_THRESHOLDS["OBJ-01"])} of eligible try-on sessions show fit AND '
        f'style confidence gain ≥ +{CONFIDENCE_GAIN_MIN} point OR post ≥ {CONFIDENCE_POST_PASS}/5, '
        f'AND rate the fit visualization "like" (≥ {APPROVAL_MIN_SCORE}/5) '
        '(Charter §3.2 OBJ-01 / Scope Criterion 9)',
        _obj01_fit_style_summary(),
    )
    add_row(
        KPI_OBJ02, 'OBJ-02',
        f'First-time Guest completes one virtual try-on ≤ {GUEST_TRYON_BUDGET_MINUTES}:00 '
        'without training, registration, or any photo upload '
        '(Charter §3.2 OBJ-02 / Scope Criterion 6)',
        _manual_evidence('Observed UAT session timing + upload audit (KAN-88 / UAT-01). '
                         'Observed measurement — subjective ratings are NOT accepted as a substitute.'),
    )
    add_row(
        KPI_OBJ03, 'OBJ-03',
        f'{API_SLO_PERCENT}% of catalog/filtering/recommendation/commerce API requests '
        f'< {API_P95_BUDGET_MS} ms; canvas overlay/view/proportion renders '
        f'< {CANVAS_RENDER_BUDGET_SECONDS} s; initial load < {PAGE_LOAD_BUDGET_SECONDS} s '
        '(Charter §3.2 OBJ-03 / Scope Criteria 1–3)',
        _manual_evidence('Automated performance run + canvas render benchmark + load-time test '
                         '(KAN-84 / KAN-90; measure_api_perf). Measured values only.'),
    )
    add_row(
        KPI_OBJ04, 'OBJ-04',
        f'{CHECKLIST_PASS_PERCENT}% pass on Security & Privacy checklist (TLS 1.2+, '
        'Argon2id, server-side RBAC, ephemeral guests, no photo upload) '
        '(Charter §3.2 OBJ-04 / RT-09)',
        _manual_evidence('Security & Privacy checklist audit (KAN-90 / RT-09 / UAT-07).'),
    )
    add_row(
        KPI_OBJ05, 'OBJ-05',
        f'{_at_least(CHARTER_THRESHOLDS["OBJ-05"])} of recorded Recommendation-Panel ratings '
        f'approve the recommendation ("like" or score ≥ {APPROVAL_MIN_SCORE}/5) '
        '(Charter §3.2 OBJ-05 / Scope Criterion 10)',
        _obj05_recommendation_approval_summary(),
    )
    add_row(
        KPI_OBJ06, 'OBJ-06',
        f'{_at_least(CHARTER_THRESHOLDS["OBJ-06"])} of eligible sessions report '
        'purchase-decision confidence increase AND return-intent decrease versus the '
        'pre-session baseline (Charter §3.2 OBJ-06 / Scope Criterion 11)',
        _obj06_purchase_decision_summary(),
    )
    add_row(
        KPI_OBJ07, 'OBJ-07',
        f'{_at_least(CHARTER_THRESHOLDS["OBJ-07"])} of carts created during UAT complete '
        'the simulated mock checkout (Charter §3.2 OBJ-07 / Scope Criterion 8)',
        _obj07_checkout_completion_summary(),
    )
    add_row(
        KPI_OBJ08, 'OBJ-08',
        f'{CSV_PIPELINE_ITEM_COUNT}-item CSV upload pipeline completes '
        f'< {CSV_PIPELINE_BUDGET_SECONDS} s (Charter §3.2 OBJ-08)',
        _manual_evidence('`python manage.py measure_upload` timing run '
                         f'(KAN-83 / KAN-84), budget < {CSV_PIPELINE_BUDGET_SECONDS} s.'),
    )
    add_row(
        KPI_OBJ09, 'OBJ-09',
        f'{_at_least(CHARTER_THRESHOLDS["OBJ-09"])} of CSV-uploaded items publish without '
        'manual correction (Charter §3.2 OBJ-09 / Scope Criterion 5)',
        _manual_evidence('Seller Dashboard validation-report audit — items published without '
                         'manual correction (KAN-85 / UAT-05).'),
    )

    for question_key, kpi, target in CONTEXT_QUESTIONS:
        summary = (_yes_no_summary(question_key)
                   if question_key in YES_NO_QUESTIONS
                   else _rating_mean_summary(question_key))
        add_row(kpi, 'Context only', target, summary)

    return rows


# ---------------------------------------------------------------------------
# OBJ-07 trusted event recording (server-side commerce hook ONLY)
# ---------------------------------------------------------------------------
def _apply_uat_event(session, event):
    from django.utils import timezone

    notes = _json_notes(session.notes)
    notes[event] = True
    event_log = notes.get('event_log')
    if not isinstance(event_log, list):
        event_log = []
    event_log.append({'event': event, 'at': timezone.now().isoformat()})
    notes['event_log'] = event_log
    session.notes = json.dumps(notes)
    if event == EVENT_CHECKOUT_COMPLETED:
        session.status = 'completed'
    session.save()


def record_uat_commerce_event(user, event):
    """Server-side OBJ-07 hook called by commerce views (cart add_item and the
    successful checkout path only).

    Records the event on the user's most recent ACTIVE UAT session.
    Owner-scoped, append-only, and never raises: UAT bookkeeping must not
    be able to break a cart or checkout. Returns True if recorded.

    Because the session flips to 'completed' when checkout succeeds, later
    cart events for that session are ignored — one session can therefore
    never inflate the created-cart denominator.
    """
    try:
        if event not in UAT_COMMERCE_EVENTS:
            return False
        if user is None or not getattr(user, 'is_authenticated', False):
            return False
        session = (UATSession.objects.filter(user=user, status='active')
                   .order_by('-started_at').first())
        if session is None:
            return False
        _apply_uat_event(session, event)
        return True
    except Exception:  # noqa: BLE001 — commerce flow must never break
        logger.exception('UAT commerce event recording failed (event=%s); '
                         'commerce flow unaffected.', event)
        return False