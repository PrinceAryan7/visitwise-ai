const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function setup() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        profile_pic TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create places table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS places (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL,
        address TEXT,
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        avg_cost NUMERIC(8,2) DEFAULT 0,
        google_place_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create checkins table
    await pool.query(`
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
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_checkins_place ON checkins(place_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_checkins_time ON checkins(hour_of_day, day_of_week);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id);`);

    console.log('Database setup complete!');
  } catch (err) {
    console.error('Setup error:', err);
  } finally {
    pool.end();
  }
}

setup();