import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CarCard from './CarCard';
import SkeletonCard from './SkeletonCard';
import api from '../api';
import {
    FaSearch, FaShieldAlt, FaChartLine, FaCar, FaHeart,
    FaArrowRight, FaStar, FaMapMarkerAlt, FaHandshake, FaList
} from 'react-icons/fa';

/* =================================================================
   GUEST LANDING — shown when NOT logged in
   Full-screen hero with car background, value props, call-to-action
   ================================================================= */
function GuestLanding() {
    const [featuredCars, setFeaturedCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        api.get('/cars?limit=4&sort=newest')
            .then(r => setFeaturedCars(r.data.cars || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) navigate(`/cars?search=${encodeURIComponent(searchQuery)}`);
        else navigate('/cars');
    };

    return (
        <div className="landing-guest">
            {/* ── HERO ───────────────────────────────────────── */}
            <section className="hero-section">
                <div className="hero-bg-image" style={{ backgroundImage: "url('/images/hero-cars.jpg')" }} />
                <div className="hero-overlay" />
                <div className="hero-content">
                    <span className="hero-badge">🚗 PAKISTAN'S SMART CAR MARKETPLACE</span>
                    <h1 className="hero-title">
                        Find Your <span className="gradient-text">Perfect Car</span> with Auto Lens
                    </h1>
                    <p className="hero-subtitle">
                        Thousands of verified cars. Transparent prices. Smart recommendations powered by real data.
                    </p>
                    <form className="hero-search" onSubmit={handleSearch}>
                        <div className="hero-search-box">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search by make, model or keyword…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" className="btn btn-primary search-btn">
                                <FaSearch /> Search
                            </button>
                        </div>
                    </form>
                    <div className="hero-cta-row">
                        <Link to="/signup" className="btn btn-primary btn-lg hero-btn">
                            Get Started Free <FaArrowRight />
                        </Link>
                        <Link to="/cars" className="btn btn-outline btn-lg hero-btn">
                            Browse All Cars
                        </Link>
                    </div>
                    <div className="hero-stats">
                        <div className="stat-item"><span className="stat-num">5,000+</span><span className="stat-label">CARS LISTED</span></div>
                        <div className="stat-item"><span className="stat-num">1,200+</span><span className="stat-label">HAPPY SELLERS</span></div>
                        <div className="stat-item"><span className="stat-num">50+</span><span className="stat-label">CITIES</span></div>
                    </div>
                </div>
            </section>

            {/* ── VALUE PROPS ────────────────────────────────── */}
            <section className="features-section">
                <div className="section-wrapper">
                    <h2 className="section-title">Why Choose <span className="gradient-text">Auto Lens?</span></h2>
                    <p className="section-subtitle">We make buying and selling cars effortless</p>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon"><FaShieldAlt /></div>
                            <h3>Verified Listings</h3>
                            <p>Every car listing is checked for accuracy so you get exactly what you see.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><FaChartLine /></div>
                            <h3>Smart Pricing</h3>
                            <p>Data-driven price insights help you negotiate the best deal.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><FaSearch /></div>
                            <h3>Powerful Search</h3>
                            <p>Filter by make, model, year, price, fuel type and more — instantly.</p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon"><FaMapMarkerAlt /></div>
                            <h3>Local & Nationwide</h3>
                            <p>Find cars near you or browse listings across all of Pakistan.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TRUST SECTION with background image ──────── */}
            <section className="trust-section">
                <div className="trust-bg" style={{ backgroundImage: "url('/images/trust-bg.jpg')" }} />
                <div className="trust-overlay" />
                <div className="trust-content">
                    <h2>Trusted by <span className="gradient-text">Thousands</span> of Buyers & Sellers</h2>
                    <p>Join a community of car enthusiasts, dealers, and everyday buyers who trust Auto Lens to connect them with the right car.</p>
                    <div className="trust-cards">
                        <div className="trust-card">
                            <FaStar className="trust-icon" />
                            <h4>4.8 / 5</h4>
                            <p>Average seller rating</p>
                        </div>
                        <div className="trust-card">
                            <FaHandshake className="trust-icon" />
                            <h4>3,200+</h4>
                            <p>Successful deals closed</p>
                        </div>
                        <div className="trust-card">
                            <FaHeart className="trust-icon" />
                            <h4>12,000+</h4>
                            <p>Cars wishlisted</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FEATURED CARS ───────────────────────────────── */}
            <section className="featured-section">
                <div className="section-wrapper">
                    <h2 className="section-title">Latest <span className="gradient-text">Listings</span></h2>
                    <p className="section-subtitle">Fresh arrivals you don't want to miss</p>
                    <div className="car-grid">
                        {loading
                            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                            : featuredCars.map(car => <CarCard key={car.id} car={car} />)
                        }
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <Link to="/cars" className="btn btn-primary btn-lg">View All Cars <FaArrowRight /></Link>
                    </div>
                </div>
            </section>

            {/* ── CTA BANNER ──────────────────────────────────── */}
            <section className="cta-section">
                <div className="cta-bg" style={{ backgroundImage: "url('/images/cta-bg.jpg')" }} />
                <div className="cta-overlay" />
                <div className="cta-content">
                    <h2>Ready to Sell Your Car?</h2>
                    <p>List your car in under 2 minutes and get seen by thousands of potential buyers.</p>
                    <Link to="/signup" className="btn btn-primary btn-lg">Create Free Account <FaArrowRight /></Link>
                </div>
            </section>
        </div>
    );
}

/* =================================================================
   LOGGED-IN DASHBOARD — shown when logged in
   Personalized greeting, quick actions, recent + saved cars
   ================================================================= */
function UserDashboard() {
    const { user } = useAuth();
    const [recentCars, setRecentCars] = useState([]);
    const [favoriteCars, setFavoriteCars] = useState([]);
    const [myListings, setMyListings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getData = async () => {
            try {
                const [recent, favs, mine] = await Promise.allSettled([
                    api.get('/cars?limit=4&sort=newest'),
                    api.get('/favorites'),
                    api.get('/user/cars'),
                ]);
                if (recent.status === 'fulfilled') setRecentCars(recent.value.data.cars || []);
                if (favs.status === 'fulfilled') setFavoriteCars(favs.value.data.favorites || []);
                if (mine.status === 'fulfilled') setMyListings(mine.value.data.cars || []);
            } catch {}
            setLoading(false);
        };
        getData();
    }, []);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="landing-dashboard">
            {/* ── WELCOME BANNER ────────────────────────────── */}
            <section className="dashboard-hero">
                <div className="dashboard-hero-bg" style={{ backgroundImage: "url('/images/hero-dashboard.jpg')" }} />
                <div className="dashboard-hero-overlay" />
                <div className="dashboard-hero-content">
                    <div className="dashboard-greeting">
                        <div className="greeting-avatar">{user?.name?.[0]?.toUpperCase() || '?'}</div>
                        <div>
                            <h1>{greeting}, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>!</h1>
                            <p>Here's what's happening on Auto Lens today</p>
                        </div>
                    </div>

                    <div className="quick-actions">
                        <Link to="/cars" className="quick-action-card">
                            <FaSearch className="qa-icon" />
                            <span>Browse Cars</span>
                        </Link>
                        <Link to="/sell" className="quick-action-card">
                            <FaCar className="qa-icon" />
                            <span>Sell a Car</span>
                        </Link>
                        <Link to="/favorites" className="quick-action-card">
                            <FaHeart className="qa-icon" />
                            <span>Saved ({favoriteCars.length})</span>
                        </Link>
                        <Link to="/my-listings" className="quick-action-card">
                            <FaList className="qa-icon" />
                            <span>My Listings ({myListings.length})</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── SAVED CARS ────────────────────────────────── */}
            {favoriteCars.length > 0 && (
                <section className="dashboard-section">
                    <div className="section-wrapper">
                        <div className="section-header-row">
                            <h2 className="section-title"><FaHeart style={{ color:'#f43f5e', marginRight:'0.5rem' }} />Your Saved Cars</h2>
                            <Link to="/favorites" className="see-all-link">See all <FaArrowRight /></Link>
                        </div>
                        <div className="car-grid">
                            {favoriteCars.slice(0, 4).map(car => <CarCard key={car.id} car={car} />)}
                        </div>
                    </div>
                </section>
            )}

            {/* ── LATEST LISTINGS ───────────────────────────── */}
            <section className="dashboard-section">
                <div className="section-wrapper">
                    <div className="section-header-row">
                        <h2 className="section-title">Latest Listings</h2>
                        <Link to="/cars" className="see-all-link">Browse all <FaArrowRight /></Link>
                    </div>
                    <div className="car-grid">
                        {loading
                            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
                            : recentCars.map(car => <CarCard key={car.id} car={car} />)
                        }
                    </div>
                </div>
            </section>
        </div>
    );
}

/* =================================================================
   ROUTER — switches between the two based on auth state
   ================================================================= */
function LandingPage() {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="loading-center" style={{ minHeight: '80vh' }}>
            <div className="spinner" />
        </div>
    );

    return user ? <UserDashboard /> : <GuestLanding />;
}

export default LandingPage;