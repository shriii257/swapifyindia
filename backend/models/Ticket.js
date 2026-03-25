const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: [true, 'Event name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Concerts', 'Sports', 'Movies', 'Comedy Shows', 'Festivals', 'Other Events']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Event date is required']
  },
  seat: {
    type: String,
    required: [true, 'Seat/section is required'],
    trim: true
  },
  originalPrice: {
    type: Number,
    required: [true, 'Original price is required'],
    min: [1, 'Price must be positive']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [1, 'Price must be positive']
  },
  ticketImage: {
    type: String, // stored file path
    default: null
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description too long']
  },
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'sold', 'returned', 'expired'],
    default: 'available'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for search
ticketSchema.index({ eventName: 'text', city: 'text' });
ticketSchema.index({ status: 1, date: 1 });
ticketSchema.index({ sellerId: 1 });
ticketSchema.index({ category: 1 });

// Validate: price cannot exceed originalPrice
ticketSchema.pre('save', function(next) {
  if (this.price > this.originalPrice) {
    return next(new Error('Selling price cannot exceed original ticket price'));
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
