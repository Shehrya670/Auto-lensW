import axios from 'axios';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
});

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

export default api;
