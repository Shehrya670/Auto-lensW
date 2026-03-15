import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import api from '../api';
import { FaCamera } from 'react-icons/fa';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Profile() {
    const { user, loading, refreshMe, updateProfile } = useAuth();
    const toast = useToast();
    const [form, setForm] = useState({ name:'', phone:'', location:'', bio:'' });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [listingCount, setListingCount] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user) {
            setForm({ name: user.name||'', phone: user.phone||'', location: user.location||'', bio: user.bio||'' });
            setAvatarPreview(user.avatar_url ? `${API_BASE}${user.avatar_url}` : null);
        }
    }, [user]);

    useEffect(() => {
        if (!loading) refreshMe();
        api.get('/user/cars').then(r => setListingCount(r.data.count ?? 0)).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    if (loading) return <div className="loading-center"><div className="spinner" /></div>;
    if (!user) return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Profile</h2>
                <p className="auth-subtitle">Log in to view your profile.</p>
            </div>
        </div>
    );

    const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        // Show preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setAvatarPreview(ev.target.result);
        reader.readAsDataURL(file);

        // Upload
        setUploading(true);
        const formData = new FormData();
        formData.append('avatar', file);
        try {
            const res = await api.post('/auth/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                toast.success('Profile photo updated!');
                refreshMe();
            } else {
                toast.error(res.data.message || 'Upload failed');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload failed');
            // Revert preview
            setAvatarPreview(user.avatar_url ? `${API_BASE}${user.avatar_url}` : null);
        }
        setUploading(false);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setSaving(true);
        const res = await updateProfile(form);
        setSaving(false);
        if (res.success) toast.success('Profile updated!');
        else toast.error(res.error || 'Update failed');
    };

    return (
        <div className="profile-page">
            {/* Header card */}
            <div className="profile-header-card">
                <div className="profile-avatar-lg avatar-upload-wrapper" onClick={() => fileInputRef.current?.click()}>
                    {avatarPreview
                        ? <img src={avatarPreview} alt={user.name} onError={() => setAvatarPreview(null)} />
                        : user.name?.[0]?.toUpperCase()
                    }
                    <div className={`avatar-upload-overlay${uploading ? ' uploading' : ''}`}>
                        {uploading
                            ? <div className="spinner-sm" />
                            : <><FaCamera /> <span>Change</span></>
                        }
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                    />
                </div>
                <div className="profile-header-info">
                    <h2>{user.name}</h2>
                    <p>{user.email} · {user.user_type}</p>
                    <div className="profile-stats">
                        <div className="profile-stat">
                            <div className="num">{listingCount ?? '—'}</div>
                            <div className="lbl">Listings</div>
                        </div>
                        <div className="profile-stat">
                            <div className="num">{user.user_type}</div>
                            <div className="lbl">Account</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="sell-card">
                <h2>Edit Profile</h2>
                <p className="subtitle">Update your personal information</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" name="name" value={form.name} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email (read-only)</label>
                            <input className="form-input" value={user.email} readOnly style={{ opacity:0.6 }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" name="phone" value={form.phone} onChange={handleChange} placeholder="+92 300 0000000" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input className="form-input" name="location" value={form.location} onChange={handleChange} placeholder="e.g. Karachi, Lahore" />
                        </div>
                        <div className="form-group form-full">
                            <label className="form-label">Bio</label>
                            <textarea className="form-textarea" name="bio" value={form.bio} onChange={handleChange} rows={3} placeholder="Tell buyers a bit about yourself…" />
                        </div>
                    </div>
                    <button className="btn btn-primary btn-full" type="submit" disabled={saving} style={{ marginTop:'1rem' }}>
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Profile;
