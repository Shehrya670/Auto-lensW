import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaEye, FaEyeSlash, FaShoppingCart, FaTag, FaStore } from 'react-icons/fa';

const getStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
};
const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const strengthColor = ['', '#ef4444', '#f59e0b', '#eab308', '#22c55e', '#16a34a'];

const USER_TYPES = [
    { value: 'buyer',  icon: <FaShoppingCart />, label: 'Buyer' },
    { value: 'seller', icon: <FaTag />,          label: 'Seller' },
    { value: 'dealer', icon: <FaStore />,         label: 'Dealer' },
];

function Signup() {
    const [formData, setFormData] = useState({ name:'', email:'', password:'', confirmPassword:'', phone:'', user_type:'buyer' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const { signup } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleChange = e => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    };

    const validate = () => {
        const e = {};
        if (!formData.name.trim()) e.name = 'Name is required';
        if (!formData.email.trim()) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = 'Invalid email';
        if (!formData.password) e.password = 'Password is required';
        else if (formData.password.length < 6) e.password = 'At least 6 characters';
        else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(formData.password)) e.password = 'Must include a letter and number';
        if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
        if (formData.phone && !/^\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) e.phone = 'Invalid phone number';
        return e;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setLoading(true);
        const { confirmPassword, ...signupData } = formData;
        const result = await signup(signupData);
        setLoading(false);
        if (result.success) {
            const redirectTo = searchParams.get('redirect') || '/';
            navigate(redirectTo, { replace: true });
        }
        else setErrors({ general: result.error });
    };

    const strength = getStrength(formData.password);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Create Account</h2>
                <p className="auth-subtitle">Join Auto Lens — it's free</p>

                {errors.general && <div className="alert alert-error">{errors.general}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label"><FaUser style={{marginRight:'0.3rem'}}/>Full Name</label>
                        <div className="input-wrapper">
                            <input className={`form-input with-icon-left${errors.name?' error':''}`} type="text" name="name" value={formData.name} onChange={handleChange} placeholder="John Doe" />
                            <FaUser className="input-icon-left" />
                        </div>
                        {errors.name && <span className="error-text">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label"><FaEnvelope style={{marginRight:'0.3rem'}}/>Email</label>
                        <div className="input-wrapper">
                            <input className={`form-input with-icon-left${errors.email?' error':''}`} type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" />
                            <FaEnvelope className="input-icon-left" />
                        </div>
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label"><FaPhone style={{marginRight:'0.3rem'}}/>Phone (optional)</label>
                        <div className="input-wrapper">
                            <input className={`form-input with-icon-left${errors.phone?' error':''}`} type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+92 300 0000000" />
                            <FaPhone className="input-icon-left" />
                        </div>
                        {errors.phone && <span className="error-text">{errors.phone}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">I want to</label>
                        <div className="user-type-grid">
                            {USER_TYPES.map(t => (
                                <label key={t.value} className={`user-type-card${formData.user_type===t.value?' selected':''}`}>
                                    <input type="radio" name="user_type" value={t.value} checked={formData.user_type===t.value} onChange={handleChange} />
                                    <div className="user-type-icon">{t.icon}</div>
                                    <div className="user-type-label">{t.label}</div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label"><FaLock style={{marginRight:'0.3rem'}}/>Password</label>
                        <div className="input-wrapper">
                            <input className={`form-input with-icon-left with-icon-right${errors.password?' error':''}`} type={showPwd?'text':'password'} name="password" value={formData.password} onChange={handleChange} placeholder="Create a password" />
                            <FaLock className="input-icon-left" />
                            <button type="button" className="input-icon-right" onClick={() => setShowPwd(!showPwd)}>
                                {showPwd ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {formData.password && (
                            <>
                                <div className="strength-bar">
                                    <div className="strength-bar-fill" style={{ width:`${(strength/5)*100}%`, background: strengthColor[strength] }} />
                                </div>
                                <div className="strength-text">{strengthLabel[strength]}</div>
                            </>
                        )}
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label"><FaLock style={{marginRight:'0.3rem'}}/>Confirm Password</label>
                        <div className="input-wrapper">
                            <input className={`form-input with-icon-left${errors.confirmPassword?' error':''}`} type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" />
                            <FaLock className="input-icon-left" />
                        </div>
                        {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
                    </div>

                    <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                        {loading ? 'Creating…' : 'Create Account'}
                    </button>
                </form>

                <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
            </div>
        </div>
    );
}

export default Signup;