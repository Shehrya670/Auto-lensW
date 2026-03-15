import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaPhone, FaEnvelope, FaHeart, FaRegHeart, FaCar, FaGasPump, FaCog, FaTachometerAlt, FaCalendar, FaPalette, FaCheckCircle } from 'react-icons/fa';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

function CarDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [car, setCar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [isFavorited, setIsFavorited] = useState(false);

    useEffect(() => {
        const fetchCar = async () => {
            try {
                const res = await api.get(`/cars/${id}`);
                setCar(res.data.car);
            } catch {
                toast.error('Car not found');
                navigate('/cars');
            } finally {
                setLoading(false);
            }
        };
        fetchCar();
        // Check if favorited
        if (user) {
            api.get('/favorites/ids').then(r => {
                setIsFavorited((r.data.ids || []).includes(parseInt(id)));
            }).catch(() => {});
        }
    }, [id, user]); // eslint-disable-line

    // Keyboard navigation for gallery
    const handleKeyDown = useCallback((e) => {
        if (!car || !car.images || car.images.length <= 1) return;
        if (e.key === 'ArrowRight') setActiveImage(prev => (prev + 1) % car.images.length);
        if (e.key === 'ArrowLeft') setActiveImage(prev => (prev - 1 + car.images.length) % car.images.length);
    }, [car]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const handleFavorite = async () => {
        if (!user) { navigate('/login'); return; }
        try {
            if (isFavorited) {
                await api.delete(`/favorites/${id}`);
                setIsFavorited(false);
                toast.info('Removed from saved cars');
            } else {
                await api.post(`/favorites/${id}`);
                setIsFavorited(true);
                toast.success('Saved to favorites!');
            }
        } catch {
            toast.error('Something went wrong');
        }
    };

    if (loading) return (
        <div className="loading-center">
            <div className="spinner" />
        </div>
    );

    if (!car) return null;

    const images = car.images && car.images.length > 0 ? car.images : [];
    const getImageUrl = (url) => url
        ? (url.startsWith('http') ? url : `http://localhost:5000${url}`)
        : null;

    const sellerInitial = (car.seller_name || 'S')[0].toUpperCase();

    const specs = [
        { icon: <FaCalendar />, label: 'Year', value: car.year },
        { icon: <FaTachometerAlt />, label: 'Mileage', value: car.mileage ? `${Number(car.mileage).toLocaleString()} km` : 'N/A' },
        { icon: <FaGasPump />, label: 'Fuel', value: car.fuel_type },
        { icon: <FaCog />, label: 'Transmission', value: car.transmission },
        { icon: <FaPalette />, label: 'Color', value: car.color },
        { icon: <FaCheckCircle />, label: 'Condition', value: car.condition },
    ];

    return (
        <div className="car-detail-page">
            <button className="back-btn" onClick={() => navigate(-1)}>
                <FaArrowLeft /> Back to listings
            </button>

            <div className="car-detail-grid">
                {/* Left column */}
                <div>
                    {/* Gallery */}
                    <div className="gallery-main">
                        {images.length > 0 ? (
                            <img src={getImageUrl(images[activeImage]?.image_url)} alt={car.title} />
                        ) : (
                            <div className="no-image-placeholder" style={{ height: '100%' }}>
                                <FaCar style={{ fontSize: '4rem', opacity: 0.15 }} />
                                <span>No photos available</span>
                            </div>
                        )}
                    </div>
                    {images.length > 1 && (
                        <div className="gallery-thumbs">
                            {images.map((img, i) => (
                                <div
                                    key={img.id}
                                    className={`gallery-thumb ${i === activeImage ? 'active' : ''}`}
                                    onClick={() => setActiveImage(i)}
                                >
                                    <img src={getImageUrl(img.image_url)} alt={`view ${i+1}`} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Description */}
                    {car.description && (
                        <div className="detail-card" style={{ marginTop: '1rem' }}>
                            <div className="description-section">
                                <h3>About this car</h3>
                                <p>{car.description}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div>
                    <div className="detail-card">
                        {car.condition && (
                            <span className={`condition-badge ${car.condition}`} style={{ marginBottom: '0.75rem', display: 'inline-block' }}>
                                {car.condition}
                            </span>
                        )}
                        <h2>{car.title || `${car.year} ${car.make} ${car.model}`}</h2>
                        <div className="detail-price">PKR {Number(car.price).toLocaleString()}</div>

                        <div className="specs-grid">
                            {specs.filter(s => s.value).map(s => (
                                <div className="spec-item" key={s.label}>
                                    <span className="spec-label">{s.label}</span>
                                    <span className="spec-value">{s.value}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleFavorite}
                            className="contact-btn outline"
                            style={{ marginTop: '1.25rem' }}
                        >
                            {isFavorited ? <><FaHeart /> Saved</> : <><FaRegHeart /> Save Car</>}
                        </button>
                    </div>

                    {/* Seller card */}
                    <div className="seller-card">
                        <h3>Listed by</h3>
                        <div className="seller-info-row">
                            <div className="seller-avatar">{sellerInitial}</div>
                            <div className="seller-name-type">
                                <h4>{car.seller_name}</h4>
                                <span>{car.seller_type || 'Private Seller'}</span>
                            </div>
                        </div>
                        {car.seller_location && (
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                📍 {car.seller_location}
                            </p>
                        )}
                        {car.seller_phone && (
                            <a href={`tel:${car.seller_phone}`}>
                                <button className="contact-btn">
                                    <FaPhone /> Call Seller
                                </button>
                            </a>
                        )}
                        <a href={`mailto:${car.seller_email}`}>
                            <button className="contact-btn outline">
                                <FaEnvelope /> Email Seller
                            </button>
                        </a>
                    </div>

                    <div style={{ fontSize:'0.78rem', color:'var(--text-muted)', textAlign:'center' }}>
                        👁 {car.views || 0} views
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CarDetail;
