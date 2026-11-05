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
 *  - ONE canonical storage key (STORAGE_KEY). setSession()/updateTokens()/
 *    clearSession() write storage AND the in-memory mirror atomically, then
 *    notify subscribers.
 *  - LEGACY ADOPTION: on first read, tokens left behind by older code under
 *    other localStorage keys (access_token, refresh_token, fitfusion-current-user,
 *    sellerAccount, registeredAccount) are adopted into the canonical key, so
 *    the boot guard works immediately without refactoring every page first.
 *    clearSession() erases the legacy keys too, so a logout can never be revived
 *    by an old key.
 *  - AVATAR-SCOPE PURGE (cross-account leak fix): per-account avatar UI state
 *    (active preset, preset cache, gender, editing target) lives in
 *    localStorage, which is per-BROWSER, not per-USER. Without a purge, the
 *    next shopper to log in on the same browser inherits the previous
 *    shopper's avatar (dein's "axa" on karosu's dashboard/studio).
 *    setSession() and clearSession() therefore erase those keys; guest keys
 *    live in sessionStorage and are untouched.
 *  - COMMERCE-SCOPE PURGE (cross-account order/cart leak fix): the order
 *    history, last-order, cart and checkout handoff mirrors are written by the
 *    pages as GLOBAL localStorage keys (offline first-paint cache only — the
 *    Django backend remains the source of truth and already scopes orders and
 *    carts per user). Without a purge, the next account to log in on this
 *    browser inherits the previous account's Order History rows and cart badge.
 *    setSession() and clearSession() therefore erase those mirrors too; the
 *    pages rebuild them from the server on their next sync.
 *  - getAccessToken() is safe to call on every request (read per request,
 *    never captured in a module-level constant at import time).
 *  - Cross-tab safety: a 'storage' event refreshes the mirror in other tabs.
 * Service rule: no React imports, nothing rendered from here.
 * Traceability: RT-01 / FR-1.6 (login/logout session integrity),
 *               FR-6.7 / FR-6.8 (order history must show ONLY the owner's orders).
 */
const STORAGE_KEY = 'fitfusion.session.v1';

/* Legacy keys your existing code writes to. Read-only adoption; erased on logout. */
const LEGACY_ACCESS_KEYS = ['access_token', 'accessToken', 'access'];
const LEGACY_REFRESH_KEYS = ['refresh_token', 'refreshToken', 'refresh'];
const LEGACY_USER_KEYS = [
  'fitfusion-current-user',
  'currentUser',
  'user',
  'sellerAccount',
  'registeredAccount',
];

/* NEW: per-account avatar UI state that must NOT survive an account switch. */
const AVATAR_SCOPE_KEYS = [
  'fitfusion-avatar-preset',
  'fitfusion-avatar-presets',
  'fitfusion-avatar-gender',
  'fitfusion-editing-avatar-preset',
];

/* NEW: per-account commerce mirrors (offline first-paint caches) that must NOT
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

function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // private-mode / quota errors: the memory mirror still works this load
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

/** Adopt tokens left by older code into the canonical key (one-time). */
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
 * CHANGED: a new identity also purges the previous account's avatar-scoped
 * AND commerce-scoped localStorage keys so no page can resurrect another
 * shopper's avatar, order history, last order, cart or rating UI memory.
 */
export function setSession({ access, refresh, user }) {
  purgeAvatarScope();
  purgeCommerceScope();
  memory = normalize({ access, refresh, user });
  writeStorage(memory);
  emit();
  return memory;
}

/** Called by a 401 auto-refresh path: replace tokens atomically.
 *  NOTE: deliberately does NOT purge any scope (same identity). */
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

/** Logout / boot-guard reset: erase canonical AND legacy copies together,
 *  plus every avatar-scoped and commerce-scoped mirror. */
export function clearSession() {
  memory = null;
  hydrated = true;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    [...LEGACY_ACCESS_KEYS, ...LEGACY_REFRESH_KEYS, ...LEGACY_USER_KEYS].forEach(
      (key) => window.localStorage.removeItem(key)
    );
  } catch {
    // ignore storage failures during cleanup
  }
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

// Cross-tab sync: another tab writing/clearing the canonical key updates us.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    memory = readStorage();
    hydrated = true;
    emit();
  });
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
};