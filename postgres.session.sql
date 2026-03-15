-- Connect to your database
\c auto_lens;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    user_type VARCHAR(20) DEFAULT 'buyer',
    avatar_url TEXT,
    location VARCHAR(100),
    bio TEXT,
    email_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);

-- ============================================
-- 2. CARS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cars (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    mileage INTEGER,
    fuel_type VARCHAR(20), -- 'petrol', 'diesel', 'electric', 'hybrid'
    transmission VARCHAR(20), -- 'manual', 'automatic'
    color VARCHAR(30),
    description TEXT,
    condition VARCHAR(20), -- 'new', 'used'
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'sold', 'pending'
    views INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for car searches
CREATE INDEX IF NOT EXISTS idx_cars_user_id ON cars(user_id);
CREATE INDEX IF NOT EXISTS idx_cars_make_model ON cars(make, model);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price);
CREATE INDEX IF NOT EXISTS idx_cars_year ON cars(year);
CREATE INDEX IF NOT EXISTS idx_cars_status ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_fuel_type ON cars(fuel_type);
CREATE INDEX IF NOT EXISTS idx_cars_transmission ON cars(transmission);
CREATE INDEX IF NOT EXISTS idx_cars_created_at ON cars(created_at DESC);

-- ============================================
-- 3. CAR IMAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS car_images (
    id SERIAL PRIMARY KEY,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_car_images_car_id ON car_images(car_id);
CREATE INDEX IF NOT EXISTS idx_car_images_primary ON car_images(car_id, is_primary);

-- ============================================
-- 4. USER SESSIONS TABLE (for tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500),
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);

-- ============================================
-- 5. USER FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_favorites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, car_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);

-- ============================================
-- 6. CAR VIEW HISTORY TABLE (for recommendations)
-- ============================================
CREATE TABLE IF NOT EXISTS car_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_car_views_user_id ON car_views(user_id);
CREATE INDEX IF NOT EXISTS idx_car_views_car_id ON car_views(car_id);
CREATE INDEX IF NOT EXISTS idx_car_views_viewed_at ON car_views(viewed_at DESC);

-- ============================================
-- 7. MESSAGES TABLE (for buyer-seller communication)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    car_id INTEGER REFERENCES cars(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_car_id ON messages(car_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- ============================================
-- 8. REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(reviewer_id, reviewee_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);

-- ============================================
-- INSERT SAMPLE DATA (for testing)
-- ============================================

-- Insert sample users (password is 'password123' hashed with bcrypt)
INSERT INTO users (name, email, password, phone, user_type, email_verified) VALUES
('John Doe', 'john@example.com', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8sW6xNcNwZJfJrW', '+1234567890', 'seller', true),
('Jane Smith', 'jane@example.com', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8sW6xNcNwZJfJrW', '+0987654321', 'buyer', true),
('Auto Dealer Inc', 'dealer@example.com', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8sW6xNcNwZJfJrW', '+1122334455', 'dealer', true);

-- Insert sample cars
INSERT INTO cars (user_id, title, make, model, year, price, mileage, fuel_type, transmission, color, description, condition) VALUES
(1, '2020 Toyota Camry LE', 'Toyota', 'Camry', 2020, 22000.00, 35000, 'petrol', 'automatic', 'Silver', 'Excellent condition, one owner, regular maintenance', 'used'),
(1, '2019 Honda Civic LX', 'Honda', 'Civic', 2019, 18500.00, 42000, 'petrol', 'automatic', 'White', 'Clean title, well maintained', 'used'),
(3, '2022 Tesla Model 3', 'Tesla', 'Model 3', 2022, 45000.00, 15000, 'electric', 'automatic', 'Red', 'Long range, autopilot, like new', 'used'),
(3, '2023 BMW X5', 'BMW', 'X5', 2023, 65000.00, 5000, 'petrol', 'automatic', 'Black', 'Luxury package, premium sound', 'new');

-- Insert sample car images
INSERT INTO car_images (car_id, image_url, is_primary) VALUES
(1, '/images/camry-1.jpg', true),
(1, '/images/camry-2.jpg', false),
(2, '/images/civic-1.jpg', true),
(3, '/images/tesla-1.jpg', true),
(4, '/images/bmw-1.jpg', true);

-- Insert sample favorites
INSERT INTO user_favorites (user_id, car_id) VALUES
(2, 1),
(2, 3);

-- Insert sample car views (for recommendations)
INSERT INTO car_views (user_id, car_id, viewed_at) VALUES
(2, 1, NOW() - INTERVAL '2 days'),
(2, 2, NOW() - INTERVAL '1 day'),
(2, 3, NOW());

-- ============================================
-- CREATE TRIGGER FUNCTION for updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFY THE SETUP
-- ============================================

-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Count records in each table
SELECT 'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'cars', COUNT(*) FROM cars
UNION ALL
SELECT 'car_images', COUNT(*) FROM car_images
UNION ALL
SELECT 'user_favorites', COUNT(*) FROM user_favorites
UNION ALL
SELECT 'car_views', COUNT(*) FROM car_views;