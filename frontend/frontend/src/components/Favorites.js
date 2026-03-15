import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart } from 'react-icons/fa';
import api from '../api';
import CarCard from './CarCard';
import SkeletonCard from './SkeletonCard';
import { useAuth } from '../context/AuthContext';

function Favorites() {
    const { user } = useAuth();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        api.get('/favorites')
            .then(r => setFavorites(r.data.favorites || []))
            .catch(() => setFavorites([]))
            .finally(() => setLoading(false));
    }, [user]);

    const handleFavoriteChange = (carId, isNowFavorited) => {
        if (!isNowFavorited) {
            setFavorites(prev => prev.filter(c => c.id !== carId));
        }
    };

    if (!user) return (
        <div className="auth-container">
            <div className="auth-card" style={{ textAlign: 'center' }}>
                <FaHeart style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '1rem' }} />
                <h2>Saved Cars</h2>
                <p className="auth-subtitle">Log in to see your saved cars</p>
                <Link to="/login" className="btn btn-primary btn-full" style={{ marginTop: '0.5rem' }}>Login</Link>
            </div>
        </div>
    );

    return (
        <div className="mylistings-page">
            <div className="page-header">
                <h1 className="page-title">
                    <FaHeart style={{ color: '#ef4444', marginRight: '0.5rem' }} />
                    Saved Cars
                </h1>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {loading ? '' : `${favorites.length} saved`}
                </span>
            </div>

            {loading ? (
                <div className="car-grid">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
            ) : favorites.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">❤️</div>
                    <h3>No saved cars yet</h3>
                    <p>Click the heart on any car to save it here.</p>
                    <Link to="/cars" className="btn btn-primary">Browse Cars</Link>
                </div>
            ) : (
                <div className="car-grid">
                    {favorites.map(car => (
                        <CarCard
                            key={car.id}
                            car={car}
                            isFavorited={true}
                            onFavoriteChange={handleFavoriteChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default Favorites;
