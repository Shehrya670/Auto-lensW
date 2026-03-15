import React from 'react';
import { Link } from 'react-router-dom';
import { FaExclamationTriangle, FaHome, FaCar } from 'react-icons/fa';

function NotFound() {
    return (
        <div className="not-found-page">
            <div className="not-found-content">
                <FaExclamationTriangle className="not-found-icon" />
                <h1>404</h1>
                <h2>Page Not Found</h2>
                <p>The page you're looking for doesn't exist or has been moved.</p>
                <div className="not-found-actions">
                    <Link to="/" className="btn btn-primary"><FaHome /> Go Home</Link>
                    <Link to="/cars" className="btn btn-outline"><FaCar /> Browse Cars</Link>
                </div>
            </div>
        </div>
    );
}

export default NotFound;
