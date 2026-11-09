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
// FITTING STUDIO PRE/POST SESSION POPUPS (Criterion 9 / Criterion 11 / OBJ-01)
// CHANGED (popup redesign): the page-level popups now use a TWO-QUESTION
// contract with shopper-friendly wording. Both phases use the SAME 1-5
// direction (higher = better) so the ≥+1 point gain calculation stays valid.
//   * confidence    -> pre/post fit+style confidence (Criterion 9)
//   * return_intent -> pre/post keep-vs-return intent, 5 = keep (Criterion 11)
// The like/dislike on the fit visualization is a SEPARATE binary toggle
// (fit_like_dislike) so it never conflates with the confidence stars.
// Payload names mirror the KAN-89 survey log:
//   { session_id, user_type, pre_confidence, pre_return_intent,
//     post_confidence, post_return_intent, fit_like_dislike, timestamp }
// ============================================================================
export const STUDIO_SURVEY_QUESTIONS = Object.freeze([
  {
    key: "confidence",
    prePrompt:
      "How confident do you feel that you can find an outfit that fits your body type and personal style today?",
    preLowLabel: "Not at all confident",
    preHighLabel: "Very confident",
    postPrompt:
      "After seeing these outfits on your avatar, how confident do you feel about your fit and style choices now?",
    postLowLabel: "Less confident than before",
    postHighLabel: "Much more confident",
  },
  {
    key: "return_intent",
    prePrompt:
      "If you were to buy the items you're about to try on without seeing them first, how likely would you be to return them?",
    preLowLabel: "Definitely would return",
    preHighLabel: "Definitely would keep",
    postPrompt:
      "Based on what you just saw, how likely are you to keep (not return) the items you tried on?",
    postLowLabel: "Definitely would return",
    postHighLabel: "Definitely would keep",
  },
]);

// Guest-facing call-to-action that REPLACES the submit button on both popups
// (FR-7.5: guests see the prompt, nothing is persisted).
export const STUDIO_GUEST_CTA =
  "Sign up to save your ratings & get personalized recommendations";

// RESERVED: popup confidence answers no longer travel through /ratings/;
// only the fit-visualization like/dislike does (source fit_visualization).
// Kept exported so the backend source vocabulary stays stable.
export const POPUP_RATING_SOURCE = "fitting_studio_popup";