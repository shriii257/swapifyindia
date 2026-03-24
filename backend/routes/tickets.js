const express = require('express');
const router = express.Router();
const {
  getTickets,
  getTicket,
  createTicket,
  deleteTicket
} = require('../controllers/ticketController');
const { protect, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', getTickets);
router.get('/:id', optionalAuth, getTicket);

// Protected routes
router.post('/', protect, upload.single('ticketImage'), createTicket);
router.delete('/:id', protect, deleteTicket);

module.exports = router;