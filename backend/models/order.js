const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  paymentId: {
    type: String,
    required: true
  },
  razorpayOrderId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  commission: {
    type: Number,
    required: true
  },
  sellerReceives: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'completed'
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Order', orderSchema);