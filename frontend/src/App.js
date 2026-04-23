import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import Signup from './components/Signup';
import Login from './components/Login';
import CarsPage from './components/CarsPage';
import CarDetail from './components/CarDetail';
import SellCar from './components/SellCar';
import MyListings from './components/MyListings';
import Profile from './components/Profile';
import Favorites from './components/Favorites';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './components/NotFound';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <div className="App">
            <Navbar />
            <main style={{ flex: 1 }}>
              <Routes>
                <Route path="/"             element={<LandingPage />} />
                <Route path="/signup"       element={<Signup />} />
                <Route path="/login"        element={<Login />} />
                <Route path="/cars"         element={<CarsPage />} />
                <Route path="/cars/:id"     element={<CarDetail />} />
                <Route path="/sell"         element={<ProtectedRoute><SellCar /></ProtectedRoute>} />
                <Route path="/my-listings"  element={<ProtectedRoute><MyListings /></ProtectedRoute>} />
                <Route path="/profile"      element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/favorites"    element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                <Route path="*"             element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;