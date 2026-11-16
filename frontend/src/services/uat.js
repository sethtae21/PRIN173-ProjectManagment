/**
 * frontend/src/services/uat.js
 * Single source of truth for the Week-12 UAT (Charter §3.2) on the client.
 * MIRRORS backend/ratings/uat_kpis.py — edit both together.
 */

// ---- questionnaire contract (mirror of ratings/uat_kpis.py) ----------------
export const UAT_PHASES = Object.freeze({
  BEFORE: "before",
  AFTER: "after",
  SUPPLEMENTARY: "supplementary",
});

export const UAT_PAIRED_QUESTIONS = Object.freeze([
  { key: "fit_confidence", prompt: "How confident are you that this item would fit you the way you want?", lowLabel: "Not at all confident", highLabel: "Very confident" },
  { key: "style_confidence", prompt: "How confident are you that this item suits your personal style?", lowLabel: "Not at all confident", highLabel: "Very confident" },
  { key: "purchase_confidence", prompt: "How confident are you in deciding whether to buy this item?", lowLabel: "Not at all confident", highLabel: "Very confident" },
  { key: "return_intent", prompt: "If you bought this item, how likely would you be to return it?", lowLabel: "Very unlikely", highLabel: "Very likely" },
]);

export const UAT_SUPPLEMENTARY_KEYS = Object.freeze([
  "privacy_comfort", "responsiveness", "match_helpfulness",
  "style_discovery", "checkout_frustration", "seller_validation_clarity",
]);

export const UAT_VALUE_MIN = 0; // "No" is encoded as 0 and MUST be submittable
export const UAT_VALUE_MAX = 5;

// ---- rating surfaces (mirror Rating.SOURCE_CHOICES / uat_kpis.py) ----------
export const RATING_TARGET_TYPES = Object.freeze({ ITEM: "item", FIT: "fit" });
export const RATING_SOURCES = Object.freeze({
  RECOMMENDATION_PANEL: "recommendation_panel",
  FIT_VISUALIZATION: "fit_visualization",
  PRODUCT_PAGE: "product_page",
  ORDER_HISTORY: "order_history",
});

// ---- UAT session storage: ONE prefix, defined once --------------------------
export const UAT_SESSION_STORAGE_PREFIX = "fitfusion-uat-session-";

export function uatSessionStorageKey(userId) {
  return `${UAT_SESSION_STORAGE_PREFIX}${userId}`;
}

export function readStoredUATSession(userId) {
  try {
    return JSON.parse(localStorage.getItem(uatSessionStorageKey(userId)) || "null");
  } catch { return null; }
}

export function findAnyStoredUATSession() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(UAT_SESSION_STORAGE_PREFIX)) {
        const parsed = JSON.parse(localStorage.getItem(key) || "null");
        if (parsed && parsed.session_id) return parsed;
      }
    }
  } catch { /* corrupted storage never breaks the page */ }
  return null;
}

// ---- endpoints --------------------------------------------------------------
export const UAT_ENDPOINTS = Object.freeze({
  session: "/ratings/uat/session/",
  response: "/ratings/uat/response/",
  export: "/ratings/uat/export/",
});

// ---- answer guard -----------------------------------------------------------
// FIX: 0 is a VALID answer (style_discovery "No"). Only null/undefined/empty is skipped.
export function isUATAnswer(value) {
  return value !== null && value !== undefined && value !== "";
}

// ============================================================================
// IN-APP RATING CONTRACT (SRS FR-7.5 / Scope Criteria 9-11) — SRS-ALIGNED COPY.
// Stars ONLY (1-5); 4-5 stars = Approval, 1-3 = Not approval. No like/dislike.
// Surfaces:
//   1. Recommendation Panel  -> overall set, accounts_rating target_type=item,
//      source=recommendation_panel, target_id='panel-overall-<studioSessionId>'.
//   2. Try-On Canvas         -> accounts_rating target_type=fit,
//      source=fit_visualization (one row per equipped garment).
//   3. Pre/Post Try-On Check -> accounts_fittingstudiosurvey (confidence +
//      return intent, 1-5, same direction within each pair).
//   4. Mock-Checkout Success -> auto popup, accounts_rating target_type=fit,
//      source=fit_visualization (fit-accuracy of the avatar preview).
// GUESTS: clicking ANY star blocks the action, saves/caches NOTHING, and shows
// the sign-up/login prompt below (FR-7.5 / FR-1.9). Registered users persist.
// ============================================================================

export const RATING_APPROVAL_MIN = 4;

// Exact guest-block prompt (SRS / SADD): shown when a Guest clicks a star.
export const GUEST_RATING_PROMPT = "Please sign up or log in to save your rating.";

export const PANEL_OVERALL_TARGET_PREFIX = "panel-overall-";

export function panelOverallTargetId(studioSessionId) {
  return `${PANEL_OVERALL_TARGET_PREFIX}${studioSessionId}`;
}

const CONFIDENCE_LABELS = Object.freeze([
  "Not Confident",
  "Slightly Confident",
  "Moderately Confident",
  "Confident",
  "Very Confident",
]);

const RETURN_LABELS = Object.freeze([
  "Very Unlikely to Return",
  "Unlikely to Return",
  "Neutral",
  "Likely to Return",
  "Very Likely to Return",
]);

// 1. Recommendation Panel (SRS-aligned copy).
export const RECOMMENDATION_RATING_COPY = Object.freeze({
  buttonLabel: "Rate Recommendations",
  eyebrow: "RECOMMENDATION PANEL",
  title: "Rate These Recommendations",
  helperNote:
    "Ratings evaluate style & color suggestions on your avatar, not physical garment sizing.",
  submitLabel: "Submit Rating",
  questions: Object.freeze([
    {
      key: "score",
      prompt:
        "How well does this recommendation match your style and color palette?",
      labels: Object.freeze([
        "Poor match",
        "Fair match",
        "Neutral / Okay",
        "Good match",
        "Great match",
      ]),
    },
  ]),
});

// 2. Try-On Canvas visualization (SRS-aligned copy).
export const FIT_RATING_COPY = Object.freeze({
  buttonLabel: "Rate Avatar Look",
  eyebrow: "FIT VISUALIZATION",
  title: "Rate On-Avatar Visualization",
  helperNote:
    "This rates the visual preview on your avatar only, not physical garment fit.",
  submitLabel: "Submit Rating",
  questions: Object.freeze([
    {
      key: "score",
      prompt: "Rate this outfit visualization on your avatar.",
      labels: Object.freeze([
        "Very Dissatisfied",
        "Dissatisfied",
        "Neutral",
        "Satisfied",
        "Very Satisfied",
      ]),
    },
  ]),
});

// 3a. Pre-session check (SRS §5.1 / SADD accounts_fittingstudiosurvey).
export const PRE_CHECK_COPY = Object.freeze({
  buttonLabel: "Pre-Try-On Check",
  eyebrow: "BEFORE TRY-ON",
  title: "Before You Try On",
  submitLabel: "Save Pre-Session Check",
  questions: Object.freeze([
    {
      key: "confidence",
      prompt:
        "Before trying on: How confident are you in choosing items that suit you?",
      labels: CONFIDENCE_LABELS,
    },
    {
      key: "return_intent",
      prompt: "How likely are you to return items bought online?",
      labels: RETURN_LABELS,
    },
  ]),
});

// 3b. Post-session check (SRS §5.1 / SADD accounts_fittingstudiosurvey).
export const POST_CHECK_COPY = Object.freeze({
  buttonLabel: "Post-Try-On Check",
  eyebrow: "AFTER TRY-ON",
  title: "After Your Try-On Session",
  submitLabel: "Save Post-Session Check",
  questions: Object.freeze([
    {
      key: "confidence",
      prompt:
        "After trying on: How confident are you in your purchase/style decision?",
      labels: CONFIDENCE_LABELS,
    },
    {
      key: "return_intent",
      prompt: "How likely are you to return these items?",
      labels: RETURN_LABELS,
    },
  ]),
});

// 4. Mock-Checkout Success pop-up (exact wording from SRS FR-7.5).
//    Auto-opens after a successful mock checkout; Registered users only.
export const CHECKOUT_FIT_ACCURACY_COPY = Object.freeze({
  eyebrow: "MOCK CHECKOUT SUCCESS",
  title: "Rate Fit Accuracy",
  helperNote:
    "This rates how accurately the avatar preview represented the garment on you.",
  submitLabel: "Submit",
  skipLabel: "Skip",
  questions: Object.freeze([
    {
      key: "score",
      prompt: "How accurately did the avatar preview show this garment on you?",
      labels: Object.freeze([
        "Very Inaccurate",
        "Inaccurate",
        "Neutral",
        "Accurate",
        "Very Accurate",
      ]),
    },
  ]),
});

// RESERVED (legacy): kept exported so the backend source vocabulary stays
// stable; the redesigned UI no longer sends popup-sourced ratings.
export const POPUP_RATING_SOURCE = "fitting_studio_popup";