// ============================================================================
// FitFusion AI — frontend API client (PURE JAVASCRIPT — NO JSX IN THIS FILE)
//
// KAN-FIX (upload page stuck at "Still processing"): the batch report is
// server-side ASYNC state. Caching it froze the first "processing" snapshot,
// so the poller never saw the completed report (Django log shows a single
// GET /catalog/batch-report/). getCachedBatchReport() now ALWAYS fetches fresh
// and purges any stale cached entry; name kept for page compatibility.
//
// KAN-FIX (dashboard 401 storm): storage-agnostic token discovery (canonical
// keys -> aliases -> JWT scan classified by SimpleJWT token_type), single-flight
// silent refresh + one retry on 401, and clearSession()+redirect to /login when
// no recoverable session exists.
//
// KAN-FIX (signup 400): performJsonRequest parses the DRF error body and throws
// ApiError{status,data}; register() normalizes legacy payload key aliases.
// ============================================================================

const API_BASE = (
  import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

const ACCESS_KEY = 'fitfusion_access';
const REFRESH_KEY = 'fitfusion_refresh';
const USER_KEY = 'fitfusion_user';
const ACCESS_ALIASES = ['fitfusion_access', 'access', 'accessToken', 'access_token', 'token', 'jwt', 'auth_token'];
const REFRESH_ALIASES = ['fitfusion_refresh', 'refresh', 'refreshToken', 'refresh_token'];
const SESSION_BLOB_KEYS = ['user', 'currentUser', 'session', 'auth', 'fitfusion_session', USER_KEY];

// ----------------------------------------------------------------------------
// JWT inspection helpers (decode ONLY — verification is server-side)
// ----------------------------------------------------------------------------
function looksLikeJwt(value) {
  if (typeof value !== 'string') return false;
  const parts = value.split('.');
  return parts.length === 3 && parts[0].length > 5 && parts[1].length > 5;
}

function jwtClaims(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function jwtFromValue(value, kind, depth = 0) {
  if (depth > 3 || value == null) return null;
  if (typeof value === 'string') {
    if (looksLikeJwt(value)) {
      const claims = jwtClaims(value);
      if (claims && claims.token_type) return claims.token_type === kind ? value : null;
      return kind === 'access' ? value : null;
    }
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { return jwtFromValue(JSON.parse(trimmed), kind, depth + 1); } catch { return null; }
    }
    return null;
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const token = jwtFromValue(entry, kind, depth + 1);
      if (token) return token;
    }
    return null;
  }
  if (typeof value === 'object') {
    const preferred = kind === 'access'
      ? ['access', 'accessToken', 'access_token', 'token']
      : ['refresh', 'refreshToken', 'refresh_token'];
    for (const key of preferred) {
      if (value[key]) {
        const token = jwtFromValue(value[key], kind, depth + 1);
        if (token) return token;
      }
    }
    if (value.tokens) {
      const token = jwtFromValue(value.tokens, kind, depth + 1);
      if (token) return token;
    }
    for (const nested of Object.values(value)) {
      const token = jwtFromValue(nested, kind, depth + 1);
      if (token) return token;
    }
  }
  return null;
}

function eachStore() {
  const stores = [];
  try { stores.push(localStorage); } catch { /* disabled */ }
  try { stores.push(sessionStorage); } catch { /* disabled */ }
  return stores;
}

function findToken(kind) {
  const canon = kind === 'access' ? ACCESS_KEY : REFRESH_KEY;
  const aliases = kind === 'access' ? ACCESS_ALIASES : REFRESH_ALIASES;
  for (const store of eachStore()) {
    try {
      const direct = store.getItem(canon);
      if (direct && looksLikeJwt(direct)) return direct;
      for (const alias of aliases) {
        const raw = store.getItem(alias);
        if (!raw) continue;
        const token = jwtFromValue(raw, kind);
        if (token) {
          try { localStorage.setItem(canon, token); } catch { /* ignore */ }
          return token;
        }
      }
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key === canon || aliases.includes(key)) continue;
        const token = jwtFromValue(store.getItem(key), kind);
        if (token) {
          try { localStorage.setItem(canon, token); } catch { /* ignore */ }
          return token;
        }
      }
    } catch { /* ignore */ }
  }
  return null;
}

// ----------------------------------------------------------------------------
// Session helpers
// ----------------------------------------------------------------------------
export function getAccessToken() { return findToken('access'); }
export function getRefreshToken() { return findToken('refresh'); }
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
}
export function setSession(tokens, user) {
  const access = tokens?.access || tokens?.tokens?.access || null;
  const refresh = tokens?.refresh || tokens?.tokens?.refresh || null;
  try {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch { /* ignore */ }
  invalidateCache('*');
}
export function clearSession() {
  const kill = new Set([...SESSION_BLOB_KEYS, ACCESS_KEY, REFRESH_KEY, ...ACCESS_ALIASES, ...REFRESH_ALIASES]);
  for (const store of eachStore()) {
    try {
      const removals = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        const raw = store.getItem(key) || '';
        if (kill.has(key) || looksLikeJwt(raw)) removals.push(key);
      }
      removals.forEach((k) => store.removeItem(k));
    } catch { /* ignore */ }
  }
  invalidateCache('*');
}

// ----------------------------------------------------------------------------
// Error type carrying the backend's field-level validation report
// ----------------------------------------------------------------------------
export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data || null;
  }
  fieldMessages() {
    if (!this.data || typeof this.data !== 'object') return [this.message];
    const messages = [];
    const walk = (node, prefix) => {
      if (Array.isArray(node)) { node.forEach((n) => walk(n, prefix)); return; }
      if (node && typeof node === 'object') {
        Object.entries(node).forEach(([k, v]) => walk(v, prefix ? `${prefix} ${k}` : k));
        return;
      }
      const label = prefix && prefix !== 'non_field_errors' ? `${prefix}: ` : '';
      messages.push(`${label}${String(node)}`);
    };
    walk(this.data, '');
    return messages.length ? messages : [this.message];
  }
}

export function extractMessage(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.message === 'string') return data.message;
  if (typeof data.error === 'string') return data.error;
  const lines = [];
  Object.entries(data).forEach(([k, v]) => {
    (Array.isArray(v) ? v : [v]).forEach((m) => {
      if (typeof m === 'string') {
        lines.push(k === 'non_field_errors' ? m : `${k.replace(/_/g, ' ')}: ${m}`);
      }
    });
  });
  return lines.join(' | ');
}

// ----------------------------------------------------------------------------
// Single-flight silent refresh (rotation-aware, FR-1.6 / CustomTokenRefreshView)
// ----------------------------------------------------------------------------
let refreshPromise = null;
function tryRefreshAccessToken() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refresh = findToken('refresh');
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.access) localStorage.setItem(ACCESS_KEY, data.access);
      if (data.refresh) localStorage.setItem(REFRESH_KEY, data.refresh);
      return Boolean(data.access);
    } catch {
      return false;
    }
  })().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path.startsWith('/login') || path.startsWith('/signup')) return;
  window.location.assign('/login');
}

// ----------------------------------------------------------------------------
// Core request pipeline
// ----------------------------------------------------------------------------
export async function performJsonRequest(method, path, body, options = {}) {
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  const auth = options.auth !== false;
  const token = auth ? (options.token ?? findToken('access')) : null;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const url = `${API_BASE}${path}`;
  let response;
  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch (networkError) {
    console.error(`NETWORK ${method} ${url}`, networkError);
    throw new ApiError(
      'Cannot reach the FitFusion backend (is Django running on 127.0.0.1:8000?).',
      0, null,
    );
  }

  if (auth && response.status === 401 && !options._retry) {
    const refreshed = await tryRefreshAccessToken();
    if (refreshed) {
      return performJsonRequest(method, path, body, { ...options, _retry: true });
    }
    clearSession();
    redirectToLogin();
  }

  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { detail: text }; }
  }

  if (!response.ok) {
    console.error(`${method} ${url} -> ${response.status}`, data);
    throw new ApiError(
      extractMessage(data) || `Request failed with status ${response.status}`,
      response.status, data,
    );
  }
  return data;
}

/** Compatibility wrapper: apiFetch(path, {method, body, ...}) */
export async function apiFetch(path, options = {}) {
  const { method = 'GET', body, ...rest } = options;
  return performJsonRequest(method, path, body, rest);
}

// ----------------------------------------------------------------------------
// In-memory GET cache (names restored from the ORIGINAL api.js)
// NOTE: only for stable resources. Async server state (batch reports) must
// NEVER be cached — see getCachedBatchReport below.
// ----------------------------------------------------------------------------
const cache = new Map();

export function invalidateCache(key) {
  if (key === undefined || key === null || key === '*' || key === true) cache.clear();
  else if (Array.isArray(key)) key.forEach((k) => cache.delete(k));
  else cache.delete(key);
}
export const clearCache = invalidateCache;

export async function cachedGet(key, path, { force = false, ...options } = {}) {
  if (force) cache.delete(key);
  if (cache.has(key)) return cache.get(key);
  const promise = performJsonRequest('GET', path, undefined, options).catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, promise);
  const data = await promise;
  cache.set(key, data);
  return data;
}

const thenInvalidate = (promise, keys) =>
  promise.then((d) => { invalidateCache(keys); return d; });

// ---- orders (FR-6.7 / FR-6.8) ----
export function getCachedOrders(force = false) {
  return cachedGet('orders', '/orders/', { force });
}
export function getCachedOrder(orderId, force = false) {
  return cachedGet(`orders:${orderId}`, `/orders/${orderId}/`, { force });
}
export const getCachedOrderHistory = getCachedOrders;
export const getCachedOrderDetails = getCachedOrder;

// ---- cart (FR-6.2) ----
export function getCachedCart(force = false) {
  return cachedGet('cart', '/cart/', { force });
}
export async function getCachedCartItems(force = false) {
  const cart = await getCachedCart(force);
  return cart?.items || [];
}

// ---- profile / account (FR-1.2) ----
export function getCachedProfile(force = false) {
  return cachedGet('profile', '/profile/', { force });
}
export async function getCachedUser(force = false) {
  const data = await getCachedProfile(force);
  return data?.user || data;
}
export const getCachedAccount = getCachedProfile;

// ---- catalog (FR-3.x) ----
export function getCachedCatalog(params = {}, force = false) {
  const qs = new URLSearchParams(params).toString();
  return cachedGet(`catalog:${qs}`, `/catalog/${qs ? `?${qs}` : ''}`, { force, auth: false });
}
export const getCachedCatalogItems = getCachedCatalog;
export function getCachedCatalogItem(itemId, force = false) {
  return cachedGet(`catalog:item:${itemId}`, `/catalog/${itemId}/`, { force, auth: false });
}
export const getCachedProduct = getCachedCatalogItem;
export function getCachedStoreItems(storeName, force = false) {
  return getCachedCatalog({ store: storeName }, force);
}

// ---- seller listings / batch reports (FR-4.3, FR-4.8) ----
export function getCachedMyListings(force = false) {
  return cachedGet('catalog:my-listings', '/catalog/my_listings/', { force });
}
export function getCachedListing(itemId, force = false) {
  return cachedGet(`catalog:listing:${itemId}`, `/catalog/my-listings/${itemId}/`, { force });
}

/**
 * KAN-FIX: batch report is ASYNC server state (processing -> complete).
 * Always fetch fresh and purge any frozen entry; the `force` parameter is
 * accepted only for call-site compatibility and ignored.
 */
export function getCachedBatchReport(batchId, force = true) {
  const key = `catalog:batch:${batchId}`;
  invalidateCache(key);
  return performJsonRequest(
    'GET',
    `/catalog/batch-report/?batch_id=${encodeURIComponent(batchId)}`,
  );
}

// ---- presets / outfits (FR-2.8, FR-5.5) ----
export function getCachedPresets(force = false) {
  return cachedGet('presets', '/presets/', { force });
}
export function getCachedPreset(presetId, force = false) {
  return cachedGet(`presets:${presetId}`, `/presets/${presetId}/`, { force });
}
export function getCachedOutfits(force = false) {
  return cachedGet('outfits', '/outfits/', { force });
}
export function getCachedOutfit(outfitId, force = false) {
  return cachedGet(`outfits:${outfitId}`, `/outfits/${outfitId}/`, { force });
}

// ---- recommendations / ratings (FR-7.x) ----
export function getCachedRecommendations(params = {}, force = false) {
  const qs = new URLSearchParams(params).toString();
  return cachedGet(`recs:${qs}`, `/api/recommendations/${qs ? `?${qs}` : ''}`, { force, auth: false });
}
export function getCachedRatingSummary(targetType, targetId, force = false) {
  return cachedGet(
    `ratings:${targetType}:${targetId}`,
    `/ratings/summary/?target_type=${targetType}&target_id=${targetId}`,
    { force, auth: false },
  );
}
export function getCachedMyRatings(force = false) {
  return cachedGet('ratings:mine', '/ratings/mine/', { force });
}

// ----------------------------------------------------------------------------
// Auth API — mirrors Backend/accounts/urls.py + auth_serializers.py
// ----------------------------------------------------------------------------
export const authApi = {
  register(rawPayload) {
    const p = { ...rawPayload };
    if (!p.password_confirm) {
      p.password_confirm = p.confirm_password || p.confirmPassword ||
        p.password2 || p.password_confirm2 || p.password;
    }
    if (!p.full_name) {
      p.full_name = [p.first_name, p.last_name].filter(Boolean).join(' ') ||
        p.name || p.username || '';
    }
    if (!p.email && typeof p.username === 'string' && p.username.includes('@')) p.email = p.username;
    if (p.email) p.email = String(p.email).trim().toLowerCase();
    if (!p.role) p.role = 'shopper';
    if (!p.store_name && p.storeName) p.store_name = p.storeName;
    return performJsonRequest('POST', '/auth/register/', p, { auth: false });
  },
  registerSeller(payload) { return this.register({ ...payload, role: 'seller' }); },
  registerShopper(payload) { return this.register({ ...payload, role: 'shopper' }); },
  login(email, password) {
    return performJsonRequest('POST', '/auth/login/', { email, password }, { auth: false })
      .then((d) => {
        if (d?.tokens) setSession(d.tokens, d.user);
        return d;
      });
  },
  logout(refresh) {
    const refreshRaw = refresh ?? getRefreshToken();
    return performJsonRequest('POST', '/auth/logout/', { refresh: refreshRaw })
      .finally(() => clearSession());
  },
  refresh(refresh) {
    return performJsonRequest('POST', '/auth/token/refresh/', { refresh }, { auth: false });
  },
  profile() { return getCachedProfile(); },
  getProfile() { return getCachedProfile(); },
  updateProfile(patch) {
    return thenInvalidate(performJsonRequest('PATCH', '/profile/', patch), ['profile']);
  },
  changePassword(old_password, new_password, new_password_confirm) {
    return performJsonRequest('POST', '/auth/change-password/', {
      old_password, new_password, new_password_confirm,
    });
  },
  deleteAccount(refresh) {
    return performJsonRequest('DELETE', '/profile/', { refresh })
      .finally(() => clearSession());
  },
};

// Standalone function aliases (pages may import these directly)
export const login = (email, password) => authApi.login(email, password);
export const logout = (refresh) => authApi.logout(refresh);
export const register = (payload) => authApi.register(payload);
export const registerSeller = (payload) => authApi.registerSeller(payload);
export const registerShopper = (payload) => authApi.registerShopper(payload);
export const refreshTokens = (refresh) => authApi.refresh(refresh);
export const getProfile = () => authApi.getProfile();
export const updateProfile = (patch) => authApi.updateProfile(patch);
export const changePassword = (o, n, c) => authApi.changePassword(o, n, c);
export const deleteAccount = (refresh) => authApi.deleteAccount(refresh);

// ----------------------------------------------------------------------------
// Catalog / Seller API — mirrors Backend/catalog/urls.py
// ----------------------------------------------------------------------------
export const catalogApi = {
  list(params = {}) { return getCachedCatalog(params); },
  get(id) { return getCachedCatalogItem(id); },
  downloadTemplate() { return `${API_BASE}/catalog/download-template/`; },
  downloadPackage() { return `${API_BASE}/catalog/download-package/`; },
  upload(formData) {
    return thenInvalidate(
      performJsonRequest('POST', '/catalog/upload/', formData),
      ['catalog', 'catalog:my-listings'],
    );
  },
  batchReport(batchId) { return getCachedBatchReport(batchId); }, // always fresh
  myListings() { return getCachedMyListings(); },
  my_listings() { return getCachedMyListings(); },
  getListing(id) { return getCachedListing(id); },
  updateListing(id, payload) {
    return thenInvalidate(
      performJsonRequest('PATCH', `/catalog/my-listings/${id}/`, payload),
      ['catalog', 'catalog:my-listings', `catalog:listing:${id}`],
    );
  },
  deleteListing(id) {
    return thenInvalidate(
      performJsonRequest('DELETE', `/catalog/my-listings/${id}/`),
      ['catalog', 'catalog:my-listings', `catalog:listing:${id}`],
    );
  },
};

// ----------------------------------------------------------------------------
// Presets / outfits
// ----------------------------------------------------------------------------
export const presetsApi = {
  list: () => getCachedPresets(),
  get: (id) => getCachedPreset(id),
  create: (p) => thenInvalidate(performJsonRequest('POST', '/presets/', p), ['presets']),
  update: (id, p) => thenInvalidate(performJsonRequest('PATCH', `/presets/${id}/`, p), ['presets', `presets:${id}`]),
  remove: (id) => thenInvalidate(performJsonRequest('DELETE', `/presets/${id}/`), ['presets', `presets:${id}`]),
};

export const outfitsApi = {
  list: () => getCachedOutfits(),
  get: (id) => getCachedOutfit(id),
  create: (p) => thenInvalidate(performJsonRequest('POST', '/outfits/', p), ['outfits']),
  update: (id, p) => thenInvalidate(performJsonRequest('PATCH', `/outfits/${id}/`, p), ['outfits', `outfits:${id}`]),
  remove: (id) => thenInvalidate(performJsonRequest('DELETE', `/outfits/${id}/`), ['outfits', `outfits:${id}`]),
};

// ----------------------------------------------------------------------------
// Commerce — mirrors Backend/commerce/urls.py (mutations bust the cache)
// ----------------------------------------------------------------------------
export const cartApi = {
  get: () => getCachedCart(),
  items: () => getCachedCartItems(),
  add: (catalog_item, quantity = 1) =>
    thenInvalidate(performJsonRequest('POST', '/cart/add_item/', { catalog_item, quantity }), ['cart']),
  updateQuantity: (catalog_item, quantity) =>
    thenInvalidate(performJsonRequest('PATCH', '/cart/update_quantity/', { catalog_item, quantity }), ['cart']),
  remove: (catalog_item) =>
    thenInvalidate(performJsonRequest('DELETE', '/cart/remove_item/', { catalog_item }), ['cart']),
  removeSelected: (catalog_items) =>
    thenInvalidate(performJsonRequest('POST', '/cart/remove_selected/', { catalog_items }), ['cart']),
  clear: () => thenInvalidate(performJsonRequest('DELETE', '/cart/clear/'), ['cart']),
};

export const checkoutApi = {
  checkout: (payload) =>
    thenInvalidate(performJsonRequest('POST', '/checkout/', payload), ['cart', 'orders']),
};

export const ordersApi = {
  list: () => getCachedOrders(),
  get: (id) => getCachedOrder(id),
};

// ----------------------------------------------------------------------------
// Recommendations & ratings
// ----------------------------------------------------------------------------
export const recommendationsApi = { get: (params = {}) => getCachedRecommendations(params) };

export const ratingsApi = {
  submit: (payload) => performJsonRequest('POST', '/ratings/', payload),
  summary: (t, id) => getCachedRatingSummary(t, id),
  mine: () => getCachedMyRatings(),
  clearGuestSession: () =>
    performJsonRequest('POST', '/ratings/guest-session/clear/', undefined, { auth: false }),
};

// ----------------------------------------------------------------------------
// ALIASES — backward compatibility (keep BOTH spellings forever)
// ----------------------------------------------------------------------------
export const authAPI = authApi;
export const catalogAPI = catalogApi;
export const presetsAPI = presetsApi;
export const outfitsAPI = outfitsApi;
export const cartAPI = cartApi;
export const checkoutAPI = checkoutApi;
export const ordersAPI = ordersApi;
export const recommendationsAPI = recommendationsApi;
export const ratingsAPI = ratingsApi;
export const BASE_URL = API_BASE;
export const API_URL = API_BASE;

export default {
  apiFetch, performJsonRequest, ApiError, extractMessage,
  cachedGet, invalidateCache, clearCache,
  getCachedOrders, getCachedOrder, getCachedOrderHistory, getCachedOrderDetails,
  getCachedCart, getCachedCartItems, getCachedProfile, getCachedUser, getCachedAccount,
  getCachedCatalog, getCachedCatalogItems, getCachedCatalogItem, getCachedProduct,
  getCachedStoreItems, getCachedMyListings, getCachedListing, getCachedBatchReport,
  getCachedPresets, getCachedPreset, getCachedOutfits, getCachedOutfit,
  getCachedRecommendations, getCachedRatingSummary, getCachedMyRatings,
  authApi, authAPI, catalogApi, catalogAPI, presetsApi, presetsAPI,
  outfitsApi, outfitsAPI, cartApi, cartAPI, checkoutApi, checkoutAPI,
  ordersApi, ordersAPI, recommendationsApi, recommendationsAPI,
  ratingsApi, ratingsAPI,
  login, logout, register, registerSeller, registerShopper, refreshTokens,
  getProfile, updateProfile, changePassword, deleteAccount,
  getAccessToken, getRefreshToken, getStoredUser, setSession, clearSession,
  BASE_URL, API_URL,
};