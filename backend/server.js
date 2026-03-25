const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const app = express();

// ── MIDDLEWARE ──
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── DATABASE ──
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ── ROUTES ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'SwapifyIndia API' });
});

// ✅ ROOT ROUTE (ADDED)
// ── SERVE FRONTEND ──
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Handle all frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ── CRON: Return unsold tickets 2 hours before event ──
cron.schedule('*/15 * * * *', async () => {
  try {
    const Ticket = require('./models/Ticket');
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const expiredTickets = await Ticket.find({
      status: 'available',
      date: { $lte: twoHoursFromNow, $gt: now }
    });

    if (expiredTickets.length > 0) {
      await Ticket.updateMany(
        { _id: { $in: expiredTickets.map(t => t._id) } },
        { status: 'returned' }
      );
      console.log(`🔄 Returned ${expiredTickets.length} unsold ticket(s) to sellers`);
    }

    // Mark truly expired tickets
    await Ticket.updateMany(
      { status: { $in: ['available', 'returned'] }, date: { $lt: now } },
      { status: 'expired' }
    );
  } catch(err) {
    console.error('Cron error:', err.message);
  }
});

// ── ERROR HANDLER ──
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 SwapifyIndia API running on port ${PORT}`);
});

module.exports = app;
