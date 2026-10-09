export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getToken = () => localStorage.getItem('access_token');

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
        }

        const contentType = response.headers.get("content-type");
        let data = null;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        }

        if (!response.ok) {
            // Throw the whole data object so the component can parse specific field errors
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
        body: JSON.stringify({ username: identifier, password: password })
    })
};

export const catalogAPI = {
    getAll: () => apiFetch('/catalog/'),
    upload: (formData) => {
        const token = getToken();
        return fetch(`${API_URL}/catalog/upload/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        }).then(res => res.json());
    }
};