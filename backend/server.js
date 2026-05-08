// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── MIDDLEWARE ───────────────────────────────────────────
// CORS - sabhi origins allow karo (development ke liye)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ──────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/places',   require('./routes/places'));

// ─── HEALTH CHECK ─────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'VisitWise AI Backend chal raha hai!',
    timestamp: new Date().toISOString()
  });
});

// ─── 404 HANDLER ─────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} nahi mila` });
});

// ─── ERROR HANDLER ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ error: 'Kuch gadbad ho gayi. Dobara try karo.' });
});

// ─── START ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   VisitWise AI Backend               ║
║   Running on http://localhost:${PORT}   ║
╚══════════════════════════════════════╝
  `);
});