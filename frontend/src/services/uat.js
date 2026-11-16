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
// IN-APP RATING CONTRACT (SRS FR-7.5 / Scope Criteria 9 & 10) — REDESIGNED.
// Stars ONLY (1-5); 4-5 stars = approval. No like/dislike anywhere in the UI.
// Ratings are BUTTON-TRIGGERED (no auto popups) and exist in exactly 2 places:
//   1. Recommendation Panel -> ONE button rating the OVERALL recommendation
//      set (target_type 'item', source 'recommendation_panel', target_id
//      'panel-overall-<studioSessionId>').
//   2. Fitting Studio canvas -> "Rate Avatar Look" (source 'fit_visualization',
//      one row per equipped garment) + Pre/Post-Try-On Check buttons writing
//      FITTING_STUDIO_SURVEYS (fit_rating_score replaces fit_like_dislike).
// Guests: DB write blocked; payload held in sessionStorage (dies with the
// session, FR-1.9) and the sign-up/login modal opens (FR-7.5).
// ============================================================================

export const RATING_APPROVAL_MIN = 4;

export const GUEST_RATING_CTA = "Sign up or Log in to save your rating";

// Session-scoped hold for guest ratings (never localStorage, never the DB).
export const GUEST_PENDING_RATING_KEY = "fitfusion-guest-pending-rating";

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

// A. Recommendation Panel — overall style/color rating.
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
        "How well do these recommended styles and colors suit your avatar profile?",
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

// B. Fitting Studio — on-avatar fit visualization rating.
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
      prompt:
        "How satisfied are you with how this outfit looks on your personalized avatar?",
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

// C. Fitting Studio — pre-session check (before try-on).
export const PRE_CHECK_COPY = Object.freeze({
  buttonLabel: "Pre-Try-On Check",
  eyebrow: "BEFORE TRY-ON",
  title: "Before You Try On",
  submitLabel: "Save Pre-Session Check",
  questions: Object.freeze([
    {
      key: "confidence",
      prompt:
        "Before using the virtual try-on, how confident are you choosing clothes that suit your body type and skin tone?",
      labels: CONFIDENCE_LABELS,
    },
    {
      key: "return_intent",
      prompt:
        "Without previewing items on an avatar, how likely are you to return clothes bought online due to style or look mismatch?",
      labels: RETURN_LABELS,
    },
  ]),
});

// D. Fitting Studio — post-session check (after try-on).
export const POST_CHECK_COPY = Object.freeze({
  buttonLabel: "Post-Try-On Check",
  eyebrow: "AFTER TRY-ON",
  title: "After Your Try-On Session",
  submitLabel: "Save Post-Session Check",
  questions: Object.freeze([
    {
      key: "confidence",
      prompt:
        "After seeing outfits on your avatar, how confident are you now in deciding whether an item suits you?",
      labels: CONFIDENCE_LABELS,
    },
    {
      key: "return_intent",
      prompt:
        "Based on this avatar preview, how likely would you be to return these items if purchased?",
      labels: RETURN_LABELS,
    },
  ]),
});

// RESERVED (legacy): kept exported so the backend source vocabulary stays
// stable; the redesigned UI no longer sends popup-sourced ratings.
export const POPUP_RATING_SOURCE = "fitting_studio_popup";