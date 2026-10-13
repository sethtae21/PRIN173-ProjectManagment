export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getToken = () => localStorage.getItem('access_token');

/* ==========================================
   BLOB DOWNLOAD HELPER
   Saves a binary response (CSV / ZIP) as a file
   without leaving the SPA and without building
   any file content on the frontend.
========================================== */
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

export const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const token = getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { ...options, headers };

    try {
        const response = await fetch(url, config);
        
        if (response.status === 401) {
            console.warn('Token invalid or expired.');
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
        }

        const contentType = response.headers.get("content-type");
        let data = null;
        if (contentType && contentType.includes("application/json")) {
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

export const authAPI = {
    register: (userData) => apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    login: (identifier, password) => apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ 
            email: identifier,
            password: password 
        })
    }),
    logout: (refreshToken) => apiFetch('/auth/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken })
    }),
    getProfile: () => apiFetch('/profile/', {
        method: 'GET'
    })
};

export const catalogAPI = {
    getAll: () => apiFetch('/catalog/'),

    // FR-4.1: CSV template is generated and served by the BACKEND only.
    downloadTemplate: async () => {
        const response = await fetch(`${API_URL}/catalog/download-template/`);
        if (!response.ok) {
            throw new Error(`Template download failed (${response.status})`);
        }
        const blob = await response.blob();
        saveBlob(blob, 'fitfusion_catalog_template.csv');
        return blob;
    },

    // FR-4.1 instruction sheet: ZIP package (template CSV + seller guidelines)
    downloadPackage: async () => {
        const response = await fetch(`${API_URL}/catalog/download-package/`);
        if (!response.ok) {
            throw new Error(`Package download failed (${response.status})`);
        }
        const blob = await response.blob();
        saveBlob(blob, 'fitfusion_seller_upload_package.zip');
        return blob;
    },

    // Phase 2: CSV + three-view images upload (FR-4.2)
    upload: (formData) => {
        const token = getToken();
        return fetch(`${API_URL}/catalog/upload/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        }).then(async (res) => {
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(JSON.stringify(data));
            }
            return data;
        });
    },

    // Phase 2: validation report polling (FR-4.8)
    batchReport: (batchId) =>
        apiFetch(`/catalog/batch-report/?batch_id=${encodeURIComponent(batchId)}`),

    // Phase 2: seller listings (FR-4.3)
    myListings: () => apiFetch('/catalog/my_listings/'),

    // Delete a specific listing (FR-4.6)
    deleteListing: (itemId) => apiFetch(`/catalog/my-listings/${itemId}/`, {
        method: 'DELETE'
    }),
};