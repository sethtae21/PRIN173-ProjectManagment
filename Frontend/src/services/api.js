export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/* ==========================================
   RESILIENCE CONFIG
   - Abort hung requests fast (no more 30s spins)
   - Circuit breaker: after a failure, skip network for 20s
   - GET cache + in-flight de-dupe (kills StrictMode double requests)
   ========================================== */
const DEFAULT_TIMEOUT_MS = 10000;
const CIRCUIT_OPEN_MS = 20000;
const GET_CACHE_TTL_MS = 30000;

let backendDownUntil = 0;
const inflightRequests = new Map();
const getCache = new Map();
const ordersMemoryCache = { byId: new Map() };

const getToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/* ==========================================
   SESSION HELPERS
   ========================================== */
function clearAuthStorage() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('fitfusion-current-user');
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('userEmail');
}

function forceLogout(message) {
  console.warn('[AUTH] Session ended:', message);
  clearAuthStorage();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
  throw new ApiError(message, 401);
}

/* ==========================================
   FETCH WITH HARD TIMEOUT
   ========================================== */
function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    window.clearTimeout(timer)
  );
}

/* ==========================================
   TOKEN REFRESH
   ========================================== */
async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    forceLogout('Session expired. Please log in again.');
  }
  const response = await fetchWithTimeout(`${API_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });
  if (!response.ok) {
    forceLogout('Session expired. Please log in again.');
  }
  const data = await response.json();
  localStorage.setItem('access_token', data.access);
  if (data.refresh) {
    localStorage.setItem('refresh_token', data.refresh);
  }
  return data.access;
}

/* ==========================================
   AUTHENTICATED FETCH with auto 401-retry
   ========================================== */
async function authedFetch(endpoint, options = {}, retryCount = 0, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetchWithTimeout(`${API_URL}${endpoint}`, { ...options, headers }, timeoutMs);
  if (response.status === 401 && retryCount === 0) {
    await refreshAccessToken();
    return authedFetch(endpoint, options, retryCount + 1, timeoutMs);
  }
  return response;
}

/* ==========================================
   CIRCUIT BREAKER + CACHE HELPERS
   ========================================== */
function markBackendDown() {
  backendDownUntil = Date.now() + CIRCUIT_OPEN_MS;
}

function markBackendUp() {
  backendDownUntil = 0;
}

export function isBackendKnownDown() {
  return Date.now() < backendDownUntil;
}

function invalidateGetCache(prefix) {
  for (const key of Array.from(getCache.keys())) {
    if (!prefix || key.startsWith(prefix)) getCache.delete(key);
  }
}

export function rememberOrders(list) {
  (Array.isArray(list) ? list : []).forEach((order) => {
    if (order && order.id != null) ordersMemoryCache.byId.set(String(order.id), order);
  });
}

export function getCachedOrder(orderId) {
  return ordersMemoryCache.byId.get(String(orderId)) || null;
}

export function getCachedOrders() {
  return Array.from(ordersMemoryCache.byId.values());
}

/* ==========================================
   CORE JSON FETCH
   ========================================== */
async function performJsonRequest(endpoint, options, timeoutMs) {
  const config = {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  };
  let response;
  try {
    response = await authedFetch(endpoint, config, 0, timeoutMs);
  } catch (networkError) {
    markBackendDown();
    const reason =
      networkError?.name === 'AbortError'
        ? 'Request timed out'
        : networkError?.message || 'Network error';
    throw new ApiError(reason, 0);
  }
  const contentType = response.headers.get('content-type');
  let data = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  }
  if (!response.ok) {
    if (response.status >= 500) markBackendDown();
    const detail = data && (data.detail || data.error || data.message);
    throw new ApiError(
      detail || `Request failed with status ${response.status}`,
      response.status,
      data
    );
  }
  markBackendUp();
  return data;
}

export const apiFetch = async (endpoint, options = {}, config = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;

  /* Mutations: no cache, and invalidate stale GET caches on success */
  if (method !== 'GET') {
    const result = await performJsonRequest(endpoint, options, timeoutMs);
    invalidateGetCache();
    return result;
  }

  /* GETs: circuit breaker → cache → in-flight de-dupe */
  if (isBackendKnownDown()) {
    throw new ApiError('Backend temporarily unavailable; using cached data', 503);
  }
  const useCache = (config.cacheTtlMs ?? GET_CACHE_TTL_MS) > 0;
  if (useCache) {
    const cached = getCache.get(endpoint);
    if (cached && cached.expires > Date.now()) return cached.data;
  }
  const pending = inflightRequests.get(endpoint);
  if (pending) return pending;

  const request = performJsonRequest(endpoint, options, timeoutMs)
    .then((data) => {
      if (useCache) {
        getCache.set(endpoint, {
          data,
          expires: Date.now() + (config.cacheTtlMs ?? GET_CACHE_TTL_MS),
        });
      }
      return data;
    })
    .finally(() => inflightRequests.delete(endpoint));

  inflightRequests.set(endpoint, request);
  return request;
};

/* ==========================================
   AUTH API
   ========================================== */
export const authAPI = {
  register: (userData) =>
    apiFetch('/auth/register/', { method: 'POST', body: JSON.stringify(userData) }),
  login: (identifier, password) =>
    apiFetch('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email: identifier, password }),
    }),
  logout: (refreshToken) =>
    apiFetch('/auth/logout/', { method: 'POST', body: JSON.stringify({ refresh: refreshToken }) }),
  getProfile: () => apiFetch('/profile/'),
  updateProfile: (payload) =>
    apiFetch('/profile/', { method: 'PATCH', body: JSON.stringify(payload) }),
  changePassword: (payload) =>
    apiFetch('/auth/change-password/', { method: 'POST', body: JSON.stringify(payload) }),
  deactivateAccount: (payload) =>
    apiFetch('/auth/deactivate/', { method: 'POST', body: JSON.stringify(payload) }),
};

/* ==========================================
   CATALOG API
   ========================================== */
export const catalogAPI = {
  getAll: () => apiFetch('/catalog/'),
  downloadTemplate: async () => {
    const response = await fetchWithTimeout(
      `${API_URL}/catalog/download-template/`,
      { cache: 'no-store' },
      30000
    );
    if (!response.ok) throw new ApiError(`Template download failed (${response.status})`, response.status);
    const blob = await response.blob();
    saveBlob(blob, 'fitfusion_catalog_template.csv');
    return blob;
  },
  downloadPackage: async () => {
    const response = await fetchWithTimeout(
      `${API_URL}/catalog/download-package/`,
      { cache: 'no-store' },
      30000
    );
    if (!response.ok) throw new ApiError(`Package download failed (${response.status})`, response.status);
    const blob = await response.blob();
    saveBlob(blob, 'fitfusion_seller_upload_package.zip');
    return blob;
  },
  upload: (formData) =>
    authedFetch('/catalog/upload/', { method: 'POST', body: formData }, 0, 90000).then(
      async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          if (res.status >= 500) markBackendDown();
          throw new ApiError(
            data?.error || data?.detail || `Upload failed (${res.status})`,
            res.status,
            data
          );
        }
        markBackendUp();
        invalidateGetCache();
        return data;
      }
    ),
  batchReport: (batchId) =>
    apiFetch(`/catalog/batch-report/?batch_id=${encodeURIComponent(batchId)}`, {}, { cacheTtlMs: 0 }),
  myListings: () => apiFetch('/catalog/my_listings/'),
  getListing: (itemId) => apiFetch(`/catalog/my-listings/${itemId}/`),
  updateListing: (itemId, data) => {
    const options = { method: 'PATCH' };
    if (data instanceof FormData) {
      options.body = data;
    } else {
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(data);
    }
    return authedFetch(`/catalog/my-listings/${itemId}/`, options, 0, 90000).then(
      async (res) => {
        const resData = await res.json().catch(() => null);
        if (!res.ok) {
          throw new ApiError(
            resData?.error || resData?.detail || `Update failed (${res.status})`,
            res.status,
            resData
          );
        }
        markBackendUp();
        invalidateGetCache();
        return resData;
      }
    );
  },
  deleteListing: (itemId) =>
    apiFetch(`/catalog/my-listings/${itemId}/`, { method: 'DELETE' }),
};

/* ==========================================
   SHOPPING CART API
   ========================================== */
export const cartAPI = {
  get: () => apiFetch('/cart/'),
  addItem: (catalogItem, quantity = 1) =>
    apiFetch('/cart/add_item/', {
      method: 'POST',
      body: JSON.stringify({ catalog_item: catalogItem, quantity }),
    }),
  updateQuantity: (catalogItem, quantity) =>
    apiFetch('/cart/update_quantity/', {
      method: 'PATCH',
      body: JSON.stringify({ catalog_item: catalogItem, quantity }),
    }),
  removeItem: (catalogItem) =>
    apiFetch('/cart/remove_item/', {
      method: 'POST',
      body: JSON.stringify({ catalog_item: catalogItem }),
    }),
  removeSelected: (catalogItems) =>
    apiFetch('/cart/remove_selected/', {
      method: 'POST',
      body: JSON.stringify({ catalog_items: catalogItems }),
    }),
};

/* ==========================================
   CHECKOUT AND ORDER API
   ========================================== */
export const checkoutAPI = {
  placeOrder: (payload) =>
    apiFetch('/checkout/', { method: 'POST', body: JSON.stringify(payload) }),
  getOrders: () =>
    apiFetch('/orders/').then((orders) => {
      rememberOrders(orders);
      return orders;
    }),
  getOrder: (orderId) => {
    const cachedOrder = getCachedOrder(orderId);
    if (cachedOrder) return Promise.resolve(cachedOrder);
    return apiFetch(`/orders/${encodeURIComponent(orderId)}/`).then((order) => {
      rememberOrders([order]);
      return order;
    });
  },
};

/* ==========================================
   RECOMMENDATIONS API (FR-7.3 / FR-7.4)
   Guest-accessible (AllowAny per SRS §4.2)
   ========================================== */
export const recommendationsAPI = {
  getRecommendations: (params = {}) => {
    const query = new URLSearchParams({
      undertone: params.undertone || 'neutral',
      height_cm: params.height_cm || 170,
      body_shape: params.body_shape || 'balanced',
      styles: Array.isArray(params.styles) ? params.styles.join(',') : params.styles || '',
      occasions: Array.isArray(params.occasions) ? params.occasions.join(',') : params.occasions || '',
      limit: params.limit || 10,
    }).toString();
    return fetchWithTimeout(`${API_URL}/api/recommendations/?${query}`, {}, DEFAULT_TIMEOUT_MS).then(
      async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new ApiError(data?.error || `Recommendations failed (${res.status})`, res.status, data);
        return data;
      }
    );
  },
};