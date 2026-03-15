import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import api from '../api';
import { FaPlus, FaTrash, FaCheckCircle, FaCar } from 'react-icons/fa';

function MyListings() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        api.get('/user/cars')
            .then(r => setCars(r.data.cars || []))
            .catch(() => toast.error('Failed to load listings'))
            .finally(() => setLoading(false));
    }, [user]); // eslint-disable-line

    if (!user) return (
        <div className="auth-container">
            <div className="auth-card" style={{ textAlign:'center' }}>
                <h2>My Listings</h2>
                <p className="auth-subtitle">Log in to manage your listings.</p>
                <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>Login</button>
            </div>
        </div>
    );

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this listing?')) return;
        try {
            await api.delete(`/cars/${id}`);
            setCars(prev => prev.filter(c => c.id !== id));
            toast.success('Listing deleted');
        } catch {
            toast.error('Failed to delete listing');
        }
    };

    const handleMarkSold = async (id) => {
        try {
            await api.put(`/cars/${id}`, { status: 'sold' });
            setCars(prev => prev.map(c => c.id === id ? { ...c, status: 'sold' } : c));
            toast.success('Marked as sold');
        } catch {
            toast.error('Failed to update listing');
        }
    };

    const getImageUrl = (url) => url
        ? (url.startsWith('http') ? url : `http://localhost:5000${url}`)
        : null;

    const statusClass = { available: 'available', sold: 'sold', pending: 'pending' };

    return (
        <div className="mylistings-page">
            <div className="page-header">
                <h1 className="page-title">My Listings</h1>
                <Link to="/sell" className="btn btn-primary">
                    <FaPlus /> New Listing
                </Link>
            </div>

            {loading ? (
                <div className="loading-center"><div className="spinner" /></div>
            ) : cars.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><FaCar /></div>
                    <h3>No listings yet</h3>
                    <p>Post your first car and start selling today!</p>
                    <Link to="/sell" className="btn btn-primary">Post a Car</Link>
                </div>
            ) : (
                cars.map(car => {
                    const imgUrl = getImageUrl(car.primary_image);
                    return (
                        <div key={car.id} className="listing-card">
                            <div className="listing-thumb">
                                {imgUrl ? (
                                    <img src={imgUrl} alt={car.title} />
                                ) : (
                                    <div className="no-image-placeholder" style={{ height:'100%' }}>
                                        <FaCar style={{ fontSize:'1.5rem', opacity:0.2 }} />
                                    </div>
                                )}
                            </div>
                            <div className="listing-info">
                                <div className="listing-title">{car.title || `${car.year} ${car.make} ${car.model}`}</div>
                                <div className="listing-price">PKR {Number(car.price).toLocaleString()}</div>
                                <div className="listing-meta">
                                    {car.year} • {car.fuel_type} • {car.transmission} • {car.mileage ? `${Number(car.mileage).toLocaleString()} km` : ''}
                                </div>
                                <span className={`status-badge ${statusClass[car.status] || 'available'}`}>
                                    {car.status || 'available'}
                                </span>
                            </div>
                            <div className="listing-actions">
                                <button className="action-btn" onClick={() => navigate(`/cars/${car.id}`)}>View</button>
                                {car.status !== 'sold' && (
                                    <button className="action-btn success" onClick={() => handleMarkSold(car.id)}>
                                        <FaCheckCircle /> Mark Sold
                                    </button>
                                )}
                                <button className="action-btn danger" onClick={() => handleDelete(car.id)}>
                                    <FaTrash /> Delete
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default MyListings;
