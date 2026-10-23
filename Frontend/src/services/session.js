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
 *  - getAccessToken() is safe to call on every request (read per request,
 *    never captured in a module-level constant at import time).
 *  - Cross-tab safety: a 'storage' event refreshes the mirror in other tabs.
 * Service rule: no React imports, nothing rendered from here.
 * Traceability: RT-01 / FR-1.6 (login/logout session integrity).
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

/** Called by login()/register(): persist FIRST, then navigate. Atomic. */
export function setSession({ access, refresh, user }) {
  memory = normalize({ access, refresh, user });
  writeStorage(memory);
  emit();
  return memory;
}

/** Called by a 401 auto-refresh path: replace tokens atomically. */
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

/** Logout / boot-guard reset: erase canonical AND legacy copies together. */
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