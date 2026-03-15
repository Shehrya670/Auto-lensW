import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaCar } from 'react-icons/fa';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                <div className="footer-brand">
                    <h3>🚗 Auto Lens</h3>
                    <p>Your trusted car marketplace with smart features and verified listings across Pakistan.</p>
                    <div className="social-links">
                        <button className="social-btn" aria-label="Facebook"><FaFacebook /></button>
                        <button className="social-btn" aria-label="Twitter"><FaTwitter /></button>
                        <button className="social-btn" aria-label="Instagram"><FaInstagram /></button>
                        <button className="social-btn" aria-label="LinkedIn"><FaLinkedin /></button>
                    </div>
                </div>

                <div className="footer-col">
                    <h4>Marketplace</h4>
                    <ul>
                        <li><Link to="/cars">Browse Cars</Link></li>
                        <li><Link to="/sell">Sell Your Car</Link></li>
                        <li><Link to="/favorites">Saved Cars</Link></li>
                        <li><Link to="/my-listings">My Listings</Link></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Support</h4>
                    <ul>
                        <li><a href="#help">Help Center</a></li>
                        <li><a href="#contact">Contact Us</a></li>
                        <li><a href="#faq">FAQ</a></li>
                        <li><a href="#safety">Safety Tips</a></li>
                    </ul>
                </div>

                <div className="footer-col">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="#privacy">Privacy Policy</a></li>
                        <li><a href="#terms">Terms of Service</a></li>
                    </ul>
                </div>
            </div>
            <div className="footer-bottom">
                <p>© {new Date().getFullYear()} Auto Lens. All rights reserved.</p>
            </div>
        </footer>
    );
}

export default Footer;