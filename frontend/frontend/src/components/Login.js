import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

function Login() {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const handleChange = e => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        const errs = {};
        if (!formData.email.trim()) errs.email = 'Email is required';
        if (!formData.password) errs.password = 'Password is required';
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        const result = await login(formData.email, formData.password, rememberMe);
        setLoading(false);
        if (result.success) {
            // Redirect to intended page or home
            const redirectTo = searchParams.get('redirect') || '/';
            navigate(redirectTo, { replace: true });
        } else {
            setErrors({ general: result.error });
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Welcome Back</h2>
                <p className="auth-subtitle">Sign in to your Auto Lens account</p>

                {errors.general && <div className="alert alert-error">{errors.general}</div>}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label"><FaEnvelope style={{marginRight:'0.3rem'}} />Email</label>
                        <div className="input-wrapper">
                            <input
                                className={`form-input with-icon-left${errors.email ? ' error' : ''}`}
                                type="email" name="email"
                                value={formData.email} onChange={handleChange}
                                placeholder="you@example.com"
                            />
                            <FaEnvelope className="input-icon-left" />
                        </div>
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label className="form-label"><FaLock style={{marginRight:'0.3rem'}} />Password</label>
                        <div className="input-wrapper">
                            <input
                                className={`form-input with-icon-left with-icon-right${errors.password ? ' error' : ''}`}
                                type={showPwd ? 'text' : 'password'} name="password"
                                value={formData.password} onChange={handleChange}
                                placeholder="Your password"
                            />
                            <FaLock className="input-icon-left" />
                            <button type="button" className="input-icon-right" onClick={() => setShowPwd(!showPwd)}>
                                {showPwd ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={e => setRememberMe(e.target.checked)}
                            /> Remember me
                        </label>
                    </div>

                    <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
                        {loading ? 'Signing in…' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/signup">Create one</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;