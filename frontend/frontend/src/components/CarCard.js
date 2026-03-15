import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaGasPump, FaCog, FaTachometerAlt, FaCar } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { useToast } from './Toast';

function CarCard({ car, isFavorited = false, onFavoriteChange }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const handleFavoriteClick = async (e) => {
        e.stopPropagation();
        if (!user) { navigate('/login'); return; }
        try {
            if (isFavorited) {
                await api.delete(`/favorites/${car.id}`);
                toast.info('Removed from saved cars');
            } else {
                await api.post(`/favorites/${car.id}`);
                toast.success('Saved to favorites!');
            }
            if (onFavoriteChange) onFavoriteChange(car.id, !isFavorited);
        } catch {
            toast.error('Something went wrong');
        }
    };

    const handleCardClick = () => {
        // Track recently viewed in localStorage
        const key = 'recentlyViewed';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = [car.id, ...existing.filter(id => id !== car.id)].slice(0, 10);
        localStorage.setItem(key, JSON.stringify(updated));
        navigate(`/cars/${car.id}`);
    };

    const imageUrl = car.primary_image
        ? (car.primary_image.startsWith('http') ? car.primary_image : `http://localhost:5000${car.primary_image}`)
        : null;

    return (
        <div className="car-card" onClick={handleCardClick}>
            <div className="car-card-image">
                {imageUrl ? (
                    <img src={imageUrl} alt={car.title} loading="lazy" />
                ) : (
                    <div className="no-image-placeholder">
                        <FaCar style={{ fontSize: '2.5rem', opacity: 0.2 }} />
                        <span>No photo</span>
                    </div>
                )}
                {car.condition && (
                    <span className={`condition-badge ${car.condition}`}>{car.condition}</span>
                )}
                <button
                    className={`fav-btn ${isFavorited ? 'active' : ''}`}
                    onClick={handleFavoriteClick}
                    title={isFavorited ? 'Remove from saved' : 'Save car'}
                >
                    {isFavorited ? <FaHeart /> : <FaRegHeart />}
                </button>
            </div>

            <div className="car-card-body">
                <div className="car-card-title">
                    {car.title || `${car.year} ${car.make} ${car.model}`}
                </div>
                <div className="car-price">
                    PKR {Number(car.price).toLocaleString()}
                </div>
                <div className="car-chips">
                    {car.year && <span className="chip">{car.year}</span>}
                    {car.fuel_type && <span className="chip"><FaGasPump style={{fontSize:'0.7rem'}}/> {car.fuel_type}</span>}
                    {car.transmission && <span className="chip"><FaCog style={{fontSize:'0.7rem'}}/> {car.transmission}</span>}
                    {car.mileage && <span className="chip"><FaTachometerAlt style={{fontSize:'0.7rem'}}/> {Number(car.mileage).toLocaleString()} km</span>}
                </div>
                <div className="car-card-footer">
                    <span className="seller-info">{car.seller_name || 'Private'} • {car.color || ''}</span>
                    <button className="view-btn">View →</button>
                </div>
            </div>
        </div>
    );
}

export default CarCard;
