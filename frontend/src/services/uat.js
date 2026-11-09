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