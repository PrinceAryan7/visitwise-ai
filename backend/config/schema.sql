-- =============================================
-- VisitWise AI - PostgreSQL Database Schema
-- Run this file once to create all tables
-- Command: psql -U postgres -d visitwise -f schema.sql
-- =============================================

-- Database create karo (terminal mein run karo)
-- CREATE DATABASE visitwise;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_pic TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Places Table
CREATE TABLE IF NOT EXISTS places (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,     -- mall, cafe, gym, restaurant
  address TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  avg_cost NUMERIC(8,2) DEFAULT 0,
  google_place_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Check-ins Table
CREATE TABLE IF NOT EXISTS checkins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP DEFAULT NOW(),
  checked_out_at TIMESTAMP DEFAULT NULL,
  amount_spent NUMERIC(8,2) DEFAULT NULL,
  day_of_week SMALLINT,
  hour_of_day SMALLINT
);

-- Fast query indexes
CREATE INDEX IF NOT EXISTS idx_checkins_place ON checkins(place_id);
CREATE INDEX IF NOT EXISTS idx_checkins_time  ON checkins(hour_of_day, day_of_week);
CREATE INDEX IF NOT EXISTS idx_checkins_user  ON checkins(user_id);

-- =============================================
-- Sample Data - Testing ke liye
-- =============================================
INSERT INTO places (name, category, address, latitude, longitude, avg_cost)
VALUES
  ('Select CityWalk Mall',    'mall',       'Saket, New Delhi',         28.5279, 77.2170, 750),
  ('Blue Tokai Coffee Roasters','cafe',     'Lodhi Colony, New Delhi',  28.5918, 77.2273, 300),
  ('Gold Gym Sector 29',      'gym',        'Sector 29, Gurugram',      28.4595, 77.0266, 0),
  ('Ambience Mall',           'mall',       'Vasant Kunj, New Delhi',   28.5199, 77.1540, 900),
  ('Third Wave Coffee',       'cafe',       'HSR Layout, Bengaluru',    12.9116, 77.6473, 250),
  ('Anytime Fitness Koramangala','gym',     'Koramangala, Bengaluru',   12.9352, 77.6245, 0),
  ('Phoenix Palassio',        'mall',       'Gomti Nagar, Lucknow',     26.8631, 80.9462, 600),
  ('Chaayos Cyber Hub',       'cafe',       'Cyber Hub, Gurugram',      28.4950, 77.0882, 180)
ON CONFLICT DO NOTHING;

-- Sample checkins for prediction testing
INSERT INTO checkins (user_id, place_id, checked_in_at, checked_out_at, amount_spent, day_of_week, hour_of_day)
SELECT
  1, 1,
  NOW() - (INTERVAL '1 hour' * (random() * 500)::int),
  NOW() - (INTERVAL '1 hour' * (random() * 200)::int),
  (random() * 1000 + 200)::numeric(8,2),
  (random() * 6)::int,
  (8 + random() * 13)::int
FROM generate_series(1, 50)
WHERE EXISTS (SELECT 1 FROM users LIMIT 1);

SELECT 'Schema created successfully!' as status;
