/**
 * frontend/src/services/session.js
 * SINGLE SOURCE OF TRUTH for the authenticated session (access/refresh/user).
 *
 * WHY THIS FILE EXISTS (bug fix): the dein<->karosu "swap after refresh" was
 * caused by two divergent token copies: an in-memory token set from the login
 * response (correct until the next page load) and a persistent token that
 * login never overwrote (stale, belonged to the PREVIOUS user). Every refresh
 * re-booted the app from the stale copy, so the UI rewound one session and
 * seller endpoints 403'd with the shopper's JWT (FR-1.7 working correctly).
 *
 * Contract:
 *  - ONE canonical storage key (STORAGE_KEY) kept in **sessionStorage** so the
 *    session is PER-TAB (NEW: "login page bypass" fix). localStorage is shared
 *    by every tab of the browser, so a "fresh" tab inherited another tab's
 *    login and /login bounced straight to the dashboard. sessionStorage gives:
 *      * new tab / new link  -> logged out (login page always reachable)
 *      * refresh / back-fwd  -> still logged in (survives reloads)
 *      * two tabs            -> two independent accounts (shopper + seller UAT)
 *    setSession()/updateTokens()/clearSession() write storage AND the
 *    in-memory mirror atomically, then notify subscribers.
 *  - ONE-TIME MIGRATION: any session still living in localStorage (written by
 *    older builds) is erased at boot so it can never re-authenticate a tab.
 *    Legacy alias keys are adopted ONLY from sessionStorage.
 *  - AVATAR-SCOPE PURGE (cross-account leak fix): per-account avatar UI state
 *    (active preset, preset cache, gender, editing target) lives in
 *    localStorage, which is per-BROWSER, not per-USER. Without a purge, the
 *    next shopper to log in on the same browser inherits the previous
 *    shopper's avatar. setSession() and clearSession() erase those keys;
 *    guest keys live in sessionStorage and are untouched.
 *  - COMMERCE-SCOPE PURGE (cross-account order/cart leak fix): the order
 *    history, last-order, cart and checkout handoff mirrors are written by the
 *    pages as GLOBAL localStorage keys (offline first-paint cache only — the
 *    Django backend remains the source of truth and already scopes orders and
 *    carts per user). Without a purge, the next account to log in on this
 *    browser inherits the previous account's Order History rows and cart badge.
 *    setSession() and clearSession() therefore erase those mirrors too; the
 *    pages rebuild them from the server on their next sync.
 *  - HISTORY EPOCH (back/forward "random pages" fix): setSession() stamps a
 *    per-tab epoch; SessionBootGuard stamps each protected history entry with
 *    it (history.state.ffEpoch). Entries lacking the current epoch were created
 *    BEFORE this login and are bounced on Back/Forward.
 *  - getAccessToken() is safe to call on every request (read per request,
 *    never captured in a module-level constant at import time).
 * Service rule: no React imports, nothing rendered from here.
 * Traceability: RT-01 / FR-1.6 (login/logout session integrity),
 *               FR-6.7 / FR-6.8 (order history must show ONLY the owner's orders).
 */
const STORAGE_KEY = 'fitfusion.session.v1';

/* NEW: per-tab login boundary used by SessionBootGuard's history-epoch check. */
const HISTORY_EPOCH_KEY = 'fitfusion.history.epoch';

/* Legacy keys older builds wrote. Read-only adoption (sessionStorage only). */
const LEGACY_ACCESS_KEYS = ['access_token', 'accessToken', 'access'];
const LEGACY_REFRESH_KEYS = ['refresh_token', 'refreshToken', 'refresh'];
const LEGACY_USER_KEYS = [
  'fitfusion-current-user',
  'currentUser',
  'user',
  'sellerAccount',
  'registeredAccount',
];

/* Per-account avatar UI state that must NOT survive an account switch. */
const AVATAR_SCOPE_KEYS = [
  'fitfusion-avatar-preset',
  'fitfusion-avatar-presets',
  'fitfusion-avatar-gender',
  'fitfusion-editing-avatar-preset',
];

/* Per-account commerce mirrors (offline first-paint caches) that must NOT
   survive an account switch. Product-level image map is intentionally kept
   (it maps catalog ids to images, contains no personal data). */
const COMMERCE_SCOPE_KEYS = [
  'fitfusion-orders',
  'fitfusion-last-order',
  'fitfusion-cart',
  'fitfusion-cart-items',
  'fitfusion-shopping-cart',
  'cartItems',
  'fitfusion-checkout-items',
  'fitfusion-selected-items',
  'fitfusion-product-ratings',
];

let memory = null;          // in-memory mirror of the stored session
let hydrated = false;       // whether memory was loaded from storage yet
const listeners = new Set();

/* ---------------------------------------------------------------------------
   PER-TAB STORAGE (sessionStorage). All session reads/writes go through here.
--------------------------------------------------------------------------- */
function safeGet(key) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStorage(session) {
  try {
    if (session) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // private-mode / quota errors: the memory mirror still works this load
  }
}

/**
 * ONE-TIME MIGRATION / "login bypass" kill-switch: erase any session copy still
 * living in localStorage (written by older builds). localStorage is shared by
 * every tab, so leaving it behind lets a "fresh" tab inherit another tab's
 * login and bounce /login straight to the dashboard. Called once at boot.
 */
function purgeLocalStorageSession() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    [...LEGACY_ACCESS_KEYS, ...LEGACY_REFRESH_KEYS, ...LEGACY_USER_KEYS].forEach(
      (key) => window.localStorage.removeItem(key),
    );
  } catch {
    // ignore storage failures during cleanup
  }
}

/** NEW: erase the previous account's avatar state (dashboard/studio/presets). */
function purgeAvatarScope() {
  try {
    AVATAR_SCOPE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore storage failures during cleanup
  }
}

/** NEW: erase the previous account's commerce mirrors (orders/cart/checkout).
    The server is the source of truth; this only drops the offline cache so a
    new login can never paint another user's orders or cart count. */
function purgeCommerceScope() {
  try {
    COMMERCE_SCOPE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore storage failures during cleanup
  }
}

/* ---------------------------------------------------------------------------
   HISTORY EPOCH helpers (back/forward "random pages" fix).
   sessionStorage is per-TAB: exactly the scope of one browsing history stack.
--------------------------------------------------------------------------- */
/** Current login epoch for this tab, or null when not logged in. */
export function getHistoryEpoch() {
  try {
    return window.sessionStorage.getItem(HISTORY_EPOCH_KEY);
  } catch {
    return null;
  }
}

/** Called by setSession(): start a new epoch for this tab. */
function stampHistoryEpoch() {
  const epoch = String(Date.now());
  try {
    window.sessionStorage.setItem(HISTORY_EPOCH_KEY, epoch);
  } catch {
    // ignore storage failures during cleanup
  }
  return epoch;
}

/** Called by clearSession(): no epoch => guard never bounces a logged-out tab. */
function clearHistoryEpoch() {
  try {
    window.sessionStorage.removeItem(HISTORY_EPOCH_KEY);
  } catch {
    // ignore storage failures during cleanup
  }
}

function normalize(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const access = parsed.access || parsed.accessToken || parsed.access_token;
  if (!access) return null;
  return {
    access: String(access),
    refresh: String(parsed.refresh || parsed.refreshToken || parsed.refresh_token || ''),
    user: parsed.user || parsed.currentUser || null,
  };
}

/** Adopt tokens left by older code IN THIS TAB (sessionStorage only). */
function adoptLegacy() {
  const access = LEGACY_ACCESS_KEYS.map(safeGet).find(Boolean);
  if (access) {
    const refresh = LEGACY_REFRESH_KEYS.map(safeGet).find(Boolean) || '';
    const user = LEGACY_USER_KEYS.map((key) => safeJson(safeGet(key))).find(Boolean);
    const session = { access: String(access), refresh: String(refresh), user };
    writeStorage(session);
    return session;
  }
  return null;
}

function readStorage() {
  const direct = normalize(safeJson(safeGet(STORAGE_KEY)));
  if (direct) return direct;
  return adoptLegacy();
}

function emit() {
  listeners.forEach((fn) => {
    try {
      fn(memory);
    } catch {
      // a broken subscriber must not break the session store
    }
  });
}

/** Current session object {access, refresh, user} or null. */
export function getSession() {
  if (!hydrated) {
    memory = readStorage();
    hydrated = true;
  }
  return memory;
}

export function getAccessToken() {
  const s = getSession();
  return s && s.access ? s.access : null;
}

export function getRefreshToken() {
  const s = getSession();
  return s && s.refresh ? s.refresh : null;
}

/**
 * Called by login()/register(): persist FIRST, then navigate. Atomic.
 * Purges the previous account's avatar-scoped AND commerce-scoped localStorage
 * keys and stamps a fresh history epoch for the back/forward guard.
 */
export function setSession({ access, refresh, user }) {
  purgeAvatarScope();
  purgeCommerceScope();
  stampHistoryEpoch();
  memory = normalize({ access, refresh, user });
  writeStorage(memory);
  emit();
  return memory;
}

/** Called by a 401 auto-refresh path: replace tokens atomically.
 *  NOTE: deliberately does NOT purge any scope and does NOT re-stamp the
 *  epoch (same identity, same login). */
export function updateTokens(access, refresh) {
  const current = getSession();
  if (!current) return null;
  memory = {
    access: String(access || current.access),
    refresh: refresh ? String(refresh) : current.refresh,
    user: current.user,
  };
  writeStorage(memory);
  emit();
  return memory;
}

/** Logout / boot-guard reset: erase the per-tab canonical copy, any sessionStorage
 *  legacy aliases, the history epoch, and every localStorage scope mirror plus
 *  localStorage leftovers from older builds. */
export function clearSession() {
  memory = null;
  hydrated = true;
  clearHistoryEpoch();
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    [...LEGACY_ACCESS_KEYS, ...LEGACY_REFRESH_KEYS, ...LEGACY_USER_KEYS].forEach(
      (key) => window.sessionStorage.removeItem(key),
    );
  } catch {
    // ignore storage failures during cleanup
  }
  purgeLocalStorageSession(); // belt-and-braces: kill any localStorage residue
  purgeAvatarScope();
  purgeCommerceScope();
  emit();
}

/** React contexts subscribe here instead of caching tokens themselves. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Decode a JWT payload WITHOUT verification (boot guard / UI hints only). */
export function decodeClaims(token) {
  try {
    if (!token || !token.includes('.')) return null;
    const segment = token.split('.')[1];
    const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
    return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// Boot-time migration: drop the cross-tab localStorage session once.
// (sessionStorage has no cross-tab 'storage' events, so no sync listener needed.)
if (typeof window !== 'undefined') {
  purgeLocalStorageSession();
}

export default {
  getSession,
  getAccessToken,
  getRefreshToken,
  setSession,
  updateTokens,
  clearSession,
  subscribe,
  decodeClaims,
  getHistoryEpoch,
};