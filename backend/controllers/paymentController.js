const Razorpay = require('razorpay');
const crypto = require('crypto');
const Ticket = require('../models/Ticket');
const Order = require('../models/order');

const COMMISSION_RATE = 0.10;

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// POST /api/payments/create-order
exports.createOrder = async (req, res) => {
  try {
    const { ticketId } = req.body;
    if (!ticketId) return res.status(400).json({ message: 'Ticket ID is required' });

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.status !== 'available') return res.status(400).json({ message: 'Ticket is no longer available' });
    if (ticket.sellerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot buy your own ticket' });
    }

    const amountInPaise = Math.round(ticket.price * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `ticket_${ticketId}_${Date.now()}`,
      notes: {
        ticketId: ticketId.toString(),
        buyerId: req.user._id.toString(),
        eventName: ticket.eventName
      }
    });

    // Reserve the ticket temporarily
    await Ticket.findByIdAndUpdate(ticketId, { status: 'reserved' });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID
    });
  } catch(err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

// POST /api/payments/verify
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      ticketId
    } = req.body;

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Revert ticket status back to available on failed verification
      await Ticket.findByIdAndUpdate(ticketId, { status: 'available' });
      return res.status(400).json({ message: 'Payment verification failed. Invalid signature.' });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const commission = Math.round(ticket.price * COMMISSION_RATE);
    const sellerReceives = ticket.price - commission;

    // Update ticket
    await Ticket.findByIdAndUpdate(ticketId, {
      status: 'sold',
      buyerId: req.user._id
    });

    // Create order record
    const order = await Order.create({
      buyerId: req.user._id,
      ticketId: ticket._id,
      paymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      amount: ticket.price,
      commission,
      sellerReceives,
      status: 'completed'
    });

    res.json({
      message: 'Payment successful! Ticket is now yours.',
      orderId: order._id,
      ticketImage: ticket.ticketImage,
      commission,
      sellerReceives
    });
  } catch(err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ message: 'Payment verification failed' });
  }
};

// POST /api/payments/cancel-reserve  (cleanup if user dismisses Razorpay)
exports.cancelReserve = async (req, res) => {
  try {
    const { ticketId } = req.body;
    const ticket = await Ticket.findById(ticketId);
    if (ticket && ticket.status === 'reserved') {
      await Ticket.findByIdAndUpdate(ticketId, { status: 'available' });
    }
    res.json({ message: 'Reservation cancelled' });
  } catch(err) {
    res.status(500).json({ message: 'Failed to cancel reservation' });
  }
};