import React, { createContext, useState, useContext, useEffect } from 'react';
import api, { setAuthToken } from '../api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Helper: only use localStorage token if user explicitly chose "Remember Me"
const getToken = () => {
    const sessionTok = sessionStorage.getItem('token');
    if (sessionTok) return sessionTok;
    // Only trust localStorage if the rememberMe flag is set
    if (localStorage.getItem('rememberMe') === 'true') {
        return localStorage.getItem('token');
    }
    // Clean up any stale/legacy localStorage token
    localStorage.removeItem('token');
    return null;
};
const clearToken = () => {
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('rememberMe');
};
const saveToken = (token, persist) => {
    if (persist) {
        localStorage.setItem('token', token);
        localStorage.setItem('rememberMe', 'true');
    } else {
        sessionStorage.setItem('token', token);
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load user on initial render
    useEffect(() => {
        const loadUser = async () => {
            const token = getToken();
            
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await api.get('/auth/me');
                setUser(response.data.user);
            } catch (err) {
                console.error('Error loading user:', err);
                clearToken();
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, []);

    // Signup function
    const signup = async (userData) => {
        setError(null);
        try {
            const response = await api.post('/auth/signup', userData);
            
            const { token, user } = response.data;
            
            saveToken(token, false); // signup always uses session storage
            setUser(user);
            
            return { success: true };
        } catch (err) {
            console.error('Signup error:', err);
            const backendMessage =
                err.response?.data?.message ||
                (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
                err.message;
            setError(backendMessage || 'Signup failed');
            return { 
                success: false, 
                error: backendMessage || 'Signup failed' 
            };
        }
    };

    // Login function — rememberMe controls storage type
    const login = async (email, password, rememberMe = false) => {
        setError(null);
        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });
            
            const { token, user } = response.data;
            
            saveToken(token, rememberMe);
            setUser(user);
            
            return { success: true };
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            return { 
                success: false, 
                error: err.response?.data?.message || 'Login failed' 
            };
        }
    };

    // Logout function
    const logout = async () => {
        clearToken();
        setUser(null);

        try {
            await api.post('/auth/logout');
        } catch (err) {
            console.error('Logout error:', err);
        }
    };

    const refreshMe = async () => {
        try {
            const response = await api.get('/auth/me');
            setUser(response.data.user);
            return { success: true, user: response.data.user };
        } catch (err) {
            console.error('refreshMe error:', err);
            return { success: false };
        }
    };

    const updateProfile = async (profile) => {
        setError(null);
        try {
            const response = await api.put('/auth/me', profile);
            setUser(response.data.user);
            return { success: true, user: response.data.user };
        } catch (err) {
            const backendMessage =
                err.response?.data?.message ||
                (err.response?.data?.errors && err.response.data.errors[0]?.msg) ||
                err.message;
            setError(backendMessage || 'Update failed');
            return { success: false, error: backendMessage || 'Update failed' };
        }
    };

    const value = {
        user,
        loading,
        error,
        signup,
        login,
        logout,
        refreshMe,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};