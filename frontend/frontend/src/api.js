import axios from 'axios';

const isProduction = process.env.NODE_ENV === 'production';
const configuredApiUrl = process.env.REACT_APP_API_URL?.trim();
const defaultDevApiUrl = 'http://localhost:5000/api';
const apiUrl = configuredApiUrl || (isProduction ? '/api' : defaultDevApiUrl);

const api = axios.create({
    baseURL: apiUrl,
    withCredentials: true,
    timeout: 15000,
});

const BASE_URL = configuredApiUrl
    ? configuredApiUrl.replace(/\/api$/, '')
    : (isProduction ? window.location.origin : 'http://localhost:5000');

if (isProduction && !configuredApiUrl) {
    // This supports same-origin proxy deployments and avoids localhost fallback in production.
    // For split frontend/backend domains, set REACT_APP_API_URL in hosting provider settings.
    // eslint-disable-next-line no-console
    console.warn('REACT_APP_API_URL is not set; frontend will call same-origin /api');
}

// Helper: only use localStorage token if rememberMe was checked
const getToken = () => {
    const sessionTok = sessionStorage.getItem('token');
    if (sessionTok) return sessionTok;
    if (localStorage.getItem('rememberMe') === 'true') return localStorage.getItem('token');
    return null;
};
const clearToken = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
};

// Attach JWT token on every request
api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers['x-auth-token'] = token;
    }
    return config;
});

// On 401, clear stored token (session expired)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            clearToken();
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const setAuthToken = (token) => {
    if (token) api.defaults.headers.common['x-auth-token'] = token;
    else delete api.defaults.headers.common['x-auth-token'];
};

export { BASE_URL };
export default api;
