import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import api from '../api';
import { FaCar, FaCloudUploadAlt, FaTimes } from 'react-icons/fa';

const MAKES = ['Toyota','Honda','Suzuki','BMW','Mercedes','Audi','Hyundai','Kia','Ford','Nissan','Mitsubishi','Volkswagen','Mazda','Tesla','Other'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 36 }, (_, i) => CURRENT_YEAR - i);

function SellCar() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    const [formData, setFormData] = useState({
        title: '', make: '', model: '', year: '', price: '',
        mileage: '', fuel_type: '', transmission: '', color: '', description: '', condition: 'used',
    });
    const [images, setImages] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    if (!user) return (
        <div className="auth-container">
            <div className="auth-card" style={{ textAlign: 'center' }}>
                <FaCar style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }} />
                <h2>Sell Your Car</h2>
                <p className="auth-subtitle">You need to be logged in to post a listing.</p>
                <button className="btn btn-primary btn-full" onClick={() => navigate('/login')}>Login to Continue</button>
            </div>
        </div>
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
        // Auto-generate title
        if (['year', 'make', 'model'].includes(name)) {
            const updated = { ...formData, [name]: value };
            if (updated.year && updated.make && updated.model) {
                setFormData(prev => ({ ...prev, [name]: value, title: `${updated.year} ${updated.make} ${updated.model}` }));
                return;
            }
        }
    };

    const handleImages = (files) => {
        const newFiles = Array.from(files).slice(0, 10 - images.length);
        setImages(prev => [...prev, ...newFiles]);
        newFiles.forEach(f => {
            const reader = new FileReader();
            reader.onload = e => setPreviews(prev => [...prev, e.target.result]);
            reader.readAsDataURL(f);
        });
    };

    const removeImage = (idx) => {
        setImages(prev => prev.filter((_, i) => i !== idx));
        setPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    const validate = () => {
        const e = {};
        if (!formData.make) e.make = 'Make is required';
        if (!formData.model) e.model = 'Model is required';
        if (!formData.year) e.year = 'Year is required';
        if (!formData.price || formData.price <= 0) e.price = 'Valid price is required';
        if (!formData.fuel_type) e.fuel_type = 'Fuel type is required';
        if (!formData.transmission) e.transmission = 'Transmission is required';
        return e;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                year: parseInt(formData.year),
                price: parseFloat(formData.price),
                mileage: formData.mileage ? parseInt(formData.mileage) : undefined,
            };
            const res = await api.post('/cars', payload);
            const carId = res.data.car.id;

            // Upload images if any
            if (images.length > 0) {
                const fd = new FormData();
                images.forEach(f => fd.append('images', f));
                await api.post(`/cars/${carId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            }

            toast.success('Listing created successfully!');
            navigate(`/cars/${carId}`);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create listing');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sell-page">
            <div className="sell-card">
                <h2>Post Your Car</h2>
                <p className="subtitle">Fill in the details below to list your car for sale</p>

                <form onSubmit={handleSubmit}>
                    <p className="form-section-title">Vehicle Information</p>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Make *</label>
                            <select className={`form-select${errors.make ? ' error' : ''}`} name="make" value={formData.make} onChange={handleChange}>
                                <option value="">Select Make</option>
                                {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            {errors.make && <span className="error-text">{errors.make}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Model *</label>
                            <input className={`form-input${errors.model ? ' error' : ''}`} name="model" placeholder="e.g. Camry, Civic" value={formData.model} onChange={handleChange} />
                            {errors.model && <span className="error-text">{errors.model}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Year *</label>
                            <select className={`form-select${errors.year ? ' error' : ''}`} name="year" value={formData.year} onChange={handleChange}>
                                <option value="">Select Year</option>
                                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            {errors.year && <span className="error-text">{errors.year}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Color</label>
                            <input className="form-input" name="color" placeholder="e.g. White, Black" value={formData.color} onChange={handleChange} />
                        </div>
                    </div>

                    <p className="form-section-title">Specs</p>
                    <div className="form-grid cols-3">
                        <div className="form-group">
                            <label className="form-label">Fuel Type *</label>
                            <select className={`form-select${errors.fuel_type ? ' error' : ''}`} name="fuel_type" value={formData.fuel_type} onChange={handleChange}>
                                <option value="">Select</option>
                                {['petrol','diesel','electric','hybrid','cng'].map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                            </select>
                            {errors.fuel_type && <span className="error-text">{errors.fuel_type}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Transmission *</label>
                            <select className={`form-select${errors.transmission ? ' error' : ''}`} name="transmission" value={formData.transmission} onChange={handleChange}>
                                <option value="">Select</option>
                                <option value="automatic">Automatic</option>
                                <option value="manual">Manual</option>
                            </select>
                            {errors.transmission && <span className="error-text">{errors.transmission}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Condition</label>
                            <select className="form-select" name="condition" value={formData.condition} onChange={handleChange}>
                                <option value="used">Used</option>
                                <option value="new">New</option>
                            </select>
                        </div>
                    </div>

                    <p className="form-section-title">Pricing</p>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Price (PKR) *</label>
                            <input className={`form-input${errors.price ? ' error' : ''}`} type="number" name="price" placeholder="e.g. 2500000" value={formData.price} onChange={handleChange} />
                            {errors.price && <span className="error-text">{errors.price}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mileage (km)</label>
                            <input className="form-input" type="number" name="mileage" placeholder="e.g. 45000" value={formData.mileage} onChange={handleChange} />
                        </div>
                    </div>

                    <p className="form-section-title">Description</p>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">Listing Title</label>
                        <input className="form-input" name="title" placeholder="Auto-generated or customize" value={formData.title} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" name="description" rows="4" placeholder="Describe the car's condition, features, history…" value={formData.description} onChange={handleChange} />
                    </div>

                    <p className="form-section-title">Photos</p>
                    <label className="upload-area" htmlFor="car-images">
                        <input id="car-images" type="file" accept="image/*" multiple onChange={e => handleImages(e.target.files)} />
                        <div className="upload-icon"><FaCloudUploadAlt /></div>
                        <p><span>Click to upload</span> or drag & drop photos here</p>
                        <p style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>Up to 10 images, max 8MB each</p>
                    </label>
                    {previews.length > 0 && (
                        <div className="image-previews">
                            {previews.map((src, i) => (
                                <div key={i} className="image-preview-item">
                                    <img src={src} alt={`preview ${i+1}`} />
                                    <button type="button" className="remove-image" onClick={() => removeImage(i)}><FaTimes /></button>
                                </div>
                            ))}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: '1.5rem' }} disabled={loading}>
                        {loading ? 'Posting…' : '🚀 Post Listing'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default SellCar;
