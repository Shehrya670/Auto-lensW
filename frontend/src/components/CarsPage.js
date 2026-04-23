import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import api from '../api';
import CarCard from './CarCard';
import SkeletonCard from './SkeletonCard';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';

const MAKES = ['Toyota','Honda','Suzuki','BMW','Mercedes','Audi','Hyundai','Kia','Ford','Nissan','Mitsubishi','Volkswagen','Mazda','Tesla','Other'];
const FUEL_TYPES = ['petrol','diesel','electric','hybrid','cng'];
const TRANSMISSIONS = ['automatic','manual'];
const CONDITIONS = ['new','used'];
const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'mileage', label: 'Lowest Mileage' },
];

const CURRENT_YEAR = new Date().getFullYear();

function CarsPage() {
    const location = useLocation();
    const { user } = useAuth();
    const [cars, setCars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [favIds, setFavIds] = useState(new Set());
    const [searchQ, setSearchQ] = useState('');
    const [sort, setSort] = useState('newest');
    const [showMobileFilters, setShowMobileFilters] = useState(false);
    const debounceRef = useRef(null);

    const [filters, setFilters] = useState({
        make: '', minPrice: '', maxPrice: '',
        minYear: '', maxYear: '', fuel_type: '', transmission: '', condition: '',
    });

    // Load favorite IDs
    useEffect(() => {
        if (!user) return;
        api.get('/favorites/ids').then(r => setFavIds(new Set(r.data.ids || []))).catch(() => {});
    }, [user]);

    // Check URL for initial search query
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const q = params.get('q');
        if (q) setSearchQ(q);
    }, [location.search]);

    const fetchCars = useCallback(async (q, f, s) => {
        setLoading(true);
        try {
            const params = { ...f, sort: s };
            if (q) params.q = q;
            // Use search if there's a text query, otherwise use cars endpoint
            const endpoint = q ? '/search' : '/cars';
            const res = await api.get(endpoint, { params });
            setCars(res.data.cars || res.data.results || []);
        } catch {
            setCars([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced fetch when search text changes
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchCars(searchQ, filters, sort), 350);
        return () => clearTimeout(debounceRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQ]);

    // Immediate fetch when filters or sort change
    useEffect(() => {
        fetchCars(searchQ, filters, sort);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, sort]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const clearFilters = () => {
        setFilters({ make:'', minPrice:'', maxPrice:'', minYear:'', maxYear:'', fuel_type:'', transmission:'', condition:'' });
        setSearchQ('');
    };

    const handleFavoriteChange = (carId, nowFavorited) => {
        setFavIds(prev => {
            const next = new Set(prev);
            if (nowFavorited) next.add(carId); else next.delete(carId);
            return next;
        });
    };

    const Sidebar = () => (
        <aside className="filters-sidebar">
            <div className="filters-header">
                <span className="filters-title">Filters</span>
                <button className="clear-filters" onClick={clearFilters}>Clear all</button>
            </div>

            <div className="filter-group">
                <label className="filter-label">Make</label>
                <select className="filter-select" name="make" value={filters.make} onChange={handleFilterChange}>
                    <option value="">All Makes</option>
                    {MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            <div className="filter-group">
                <label className="filter-label">Year Range</label>
                <div className="price-range">
                    <input className="filter-input" type="number" name="minYear" placeholder="From" min="1990" max={CURRENT_YEAR} value={filters.minYear} onChange={handleFilterChange} />
                    <span>–</span>
                    <input className="filter-input" type="number" name="maxYear" placeholder="To" min="1990" max={CURRENT_YEAR} value={filters.maxYear} onChange={handleFilterChange} />
                </div>
            </div>

            <div className="filter-group">
                <label className="filter-label">Price (PKR)</label>
                <div className="price-range">
                    <input className="filter-input" type="number" name="minPrice" placeholder="Min" value={filters.minPrice} onChange={handleFilterChange} />
                    <span>–</span>
                    <input className="filter-input" type="number" name="maxPrice" placeholder="Max" value={filters.maxPrice} onChange={handleFilterChange} />
                </div>
            </div>

            <div className="filter-group">
                <label className="filter-label">Fuel Type</label>
                <select className="filter-select" name="fuel_type" value={filters.fuel_type} onChange={handleFilterChange}>
                    <option value="">Any</option>
                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
                </select>
            </div>

            <div className="filter-group">
                <label className="filter-label">Transmission</label>
                <select className="filter-select" name="transmission" value={filters.transmission} onChange={handleFilterChange}>
                    <option value="">Any</option>
                    {TRANSMISSIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
            </div>

            <div className="filter-group">
                <label className="filter-label">Condition</label>
                <select className="filter-select" name="condition" value={filters.condition} onChange={handleFilterChange}>
                    <option value="">Any</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
            </div>
        </aside>
    );

    return (
        <div>
            {/* Mobile filter toggle */}
            <div style={{ display:'none' }} className="mobile-filter-toggle">
                <button className="btn btn-secondary" onClick={() => setShowMobileFilters(!showMobileFilters)}>
                    <FaFilter /> Filters
                </button>
            </div>

            <div className="cars-page-layout">
                <Sidebar />

                <main className="cars-main">
                    <div className="search-toolbar">
                        <div className="search-box">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search by make, model or keyword…"
                                value={searchQ}
                                onChange={e => setSearchQ(e.target.value)}
                            />
                            {searchQ && (
                                <button className="input-icon-right" onClick={() => setSearchQ('')} style={{right:'0.75rem'}}>
                                    <FaTimes />
                                </button>
                            )}
                        </div>
                        <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
                            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </div>

                    {!loading && (
                        <p className="results-count">
                            {cars.length === 0 ? 'No cars found' : `${cars.length} car${cars.length === 1 ? '' : 's'} found`}
                        </p>
                    )}

                    {loading ? (
                        <div className="car-grid">
                            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
                        </div>
                    ) : cars.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">🚗</div>
                            <h3>No cars found</h3>
                            <p>Try adjusting your filters or search query.</p>
                            <button className="btn btn-primary" onClick={clearFilters}>Clear Filters</button>
                        </div>
                    ) : (
                        <div className="car-grid">
                            {cars.map(car => (
                                <CarCard
                                    key={car.id}
                                    car={car}
                                    isFavorited={favIds.has(car.id)}
                                    onFavoriteChange={handleFavoriteChange}
                                />
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default CarsPage;
