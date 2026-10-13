export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getToken = () => localStorage.getItem('access_token');
const getRefreshToken = () => localStorage.getItem('refresh_token');

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
    throw new Error(message);
}

/* ==========================================
   TOKEN REFRESH — recovers expired sessions
========================================== */
async function refreshAccessToken() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        forceLogout('Session expired. Please log in again.');
    }

    const response = await fetch(`${API_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken })
    });

    if (!response.ok) {
        forceLogout('Session expired. Please log in again.');
    }

    const data = await response.json();
    localStorage.setItem('access_token', data.access);
    // CRITICAL: Your backend rotates refresh tokens, so save the new one
    if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
    }
    console.log('[AUTH] Access token refreshed.');
    return data.access;
}

/* ==========================================
   AUTHENTICATED FETCH with auto 401-retry
========================================== */
async function authedFetch(endpoint, options = {}, retryCount = 0) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

    if (response.status === 401 && retryCount === 0) {
        console.log('[API] 401 — refreshing token and retrying...');
        await refreshAccessToken();
        return authedFetch(endpoint, options, retryCount + 1);
    }

    return response;
}

/* ==========================================
   CORE JSON FETCH
========================================== */
export const apiFetch = async (endpoint, options = {}) => {
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    };

    try {
        const response = await authedFetch(endpoint, config);

        const contentType = response.headers.get('content-type');
        let data = null;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        }

        if (!response.ok) {
            throw new Error(JSON.stringify(data));
        }

        return data;
    } catch (error) {
        console.error(`API Error at ${endpoint}:`, error);
        throw error;
    }
};

/* ==========================================
   AUTH API
========================================== */
export const authAPI = {
    register: (userData) => apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    login: (identifier, password) => apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email: identifier, password: password })
    }),
    logout: (refreshToken) => apiFetch('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken })
    }),
    getProfile: () => apiFetch('/profile/', { method: 'GET' })
};

/* ==========================================
   CATALOG API
========================================== */
export const catalogAPI = {
    getAll: () => apiFetch('/catalog/'),

    downloadTemplate: async () => {
        const response = await fetch(`${API_URL}/catalog/download-template/`);
        if (!response.ok) throw new Error(`Template download failed (${response.status})`);
        const blob = await response.blob();
        saveBlob(blob, 'fitfusion_catalog_template.csv');
        return blob;
    },

    downloadPackage: async () => {
        const response = await fetch(`${API_URL}/catalog/download-package/`);
        if (!response.ok) throw new Error(`Package download failed (${response.status})`);
        const blob = await response.blob();
        saveBlob(blob, 'fitfusion_seller_upload_package.zip');
        return blob;
    },

    upload: (formData) =>
        authedFetch('/catalog/upload/', { method: 'POST', body: formData })
            .then(async (res) => {
                const data = await res.json().catch(() => null);
                if (!res.ok) throw new Error(JSON.stringify(data));
                return data;
            }),

    batchReport: (batchId) =>
        apiFetch(`/catalog/batch-report/?batch_id=${encodeURIComponent(batchId)}`),

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

        return authedFetch(`/catalog/my-listings/${itemId}/`, options)
            .then(async (res) => {
                const resData = await res.json().catch(() => null);
                if (!res.ok) throw new Error(JSON.stringify(resData));
                return resData;
            });
    },

    deleteListing: (itemId) =>
        apiFetch(`/catalog/my-listings/${itemId}/`, { method: 'DELETE' }),
};