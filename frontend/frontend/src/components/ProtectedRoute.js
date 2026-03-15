import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) return (
        <div className="loading-center" style={{ minHeight: '60vh' }}>
            <div className="spinner" />
        </div>
    );

    if (!user) {
        // Store the page user was trying to visit so we can redirect after login
        return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }

    return children;
}

export default ProtectedRoute;
