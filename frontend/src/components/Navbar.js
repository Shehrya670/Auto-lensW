import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaSignOutAlt, FaUser, FaHeart, FaList, FaChevronDown } from 'react-icons/fa';

function Navbar() {
    const { user, loading, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
        setDropdownOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        setDropdownOpen(false);
        await logout();
        navigate('/');
    };

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    return (
        <>
            <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
                <div className="nav-container">
                    <Link to="/" className="nav-logo">
                        <img src="/images/logo.png" alt="Auto Lens" className="nav-logo-img" />
                        <span>Auto Lens</span>
                    </Link>

                    <div className="nav-menu">
                        <Link to="/cars" className={isActive('/cars')}>Browse Cars</Link>
                        <Link to="/sell" className={isActive('/sell')}>Sell Your Car</Link>
                        {user && <Link to="/favorites" className={isActive('/favorites')}>
                            <FaHeart style={{ marginRight: '0.25rem', fontSize:'0.85rem' }} />Saved
                        </Link>}
                    </div>

                    <div className="nav-auth">
                        {loading ? null : user ? (
                            <div className="nav-user" ref={dropdownRef} onClick={() => setDropdownOpen(!dropdownOpen)}>
                                <div className="user-avatar-sm">{user.name?.[0]?.toUpperCase() || '?'}</div>
                                <span className="user-name">{user.name?.split(' ')[0] || 'Account'}</span>
                                <FaChevronDown style={{ fontSize: '0.65rem', opacity: 0.6, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                <div className={`user-dropdown${dropdownOpen ? ' show' : ''}`} onClick={e => e.stopPropagation()}>
                                    <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}><FaUser /> Profile</Link>
                                    <Link to="/my-listings" className="dropdown-item" onClick={() => setDropdownOpen(false)}><FaList /> My Listings</Link>
                                    <Link to="/favorites" className="dropdown-item" onClick={() => setDropdownOpen(false)}><FaHeart /> Saved Cars</Link>
                                    <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.3rem 0' }} />
                                    <button onClick={handleLogout} className="dropdown-item logout-btn">
                                        <FaSignOutAlt /> Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="btn-outline-nav">Login</Link>
                                <Link to="/signup" className="btn-primary-nav">Sign Up</Link>
                            </>
                        )}
                    </div>

                    <button
                        className={`hamburger${mobileOpen ? ' open' : ''}`}
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle menu"
                    >
                        <span /><span /><span />
                    </button>
                </div>

                <div className={`mobile-menu${mobileOpen ? ' open' : ''}`}>
                    <Link to="/cars" className="nav-link">Browse Cars</Link>
                    <Link to="/sell" className="nav-link">Sell Your Car</Link>
                    {!loading && user ? (
                        <>
                            <Link to="/favorites" className="nav-link">Saved Cars</Link>
                            <Link to="/profile" className="nav-link">Profile</Link>
                            <Link to="/my-listings" className="nav-link">My Listings</Link>
                            <button onClick={handleLogout} className="nav-link" style={{ background:'none', border:'none', color:'#f87171', textAlign:'left', cursor:'pointer', width:'100%', fontFamily:'inherit', fontSize:'inherit' }}>Logout</button>
                        </>
                    ) : !loading ? (
                        <>
                            <Link to="/login" className="nav-link">Login</Link>
                            <Link to="/signup" className="nav-link">Sign Up</Link>
                        </>
                    ) : null}
                </div>
            </nav>
        </>
    );
}

export default Navbar;