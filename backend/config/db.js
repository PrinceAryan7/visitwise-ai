const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'visitwise',
  password: 'Prince@2004',
  port: 5432,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ PostgreSQL connected successfully!');
    release();
  }
});

module.exports = pool;