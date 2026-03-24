const Ticket = require('../models/Ticket');
const Order = require('../models/order');

// GET /api/dashboard/seller
exports.getSellerDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const tickets = await Ticket.find({ sellerId: userId }).sort({ createdAt: -1 });

    const listed = tickets.length;
    const sold = tickets.filter(t => t.status === 'sold').length;
    const active = tickets.filter(t => t.status === 'available').length;

    // Calculate earnings from orders
    const soldTicketIds = tickets.filter(t => t.status === 'sold').map(t => t._id);
    const orders = await Order.find({
      ticketId: { $in: soldTicketIds },
      status: 'completed'
    });
    const earnings = orders.reduce((sum, o) => sum + o.sellerReceives, 0);

    res.json({
      listed,
      sold,
      active,
      earnings,
      tickets
    });
  } catch(err) {
    console.error('Seller dashboard error:', err);
    res.status(500).json({ message: 'Failed to load seller dashboard' });
  }
};

// GET /api/dashboard/buyer
exports.getBuyerDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ buyerId: userId, status: 'completed' })
      .populate({
        path: 'ticketId',
        populate: { path: 'sellerId', select: 'name' }
      })
      .sort({ purchaseDate: -1 });

    res.json({
      totalPurchases: orders.length,
      totalSpent: orders.reduce((sum, o) => sum + o.amount, 0),
      orders
    });
  } catch(err) {
    console.error('Buyer dashboard error:', err);
    res.status(500).json({ message: 'Failed to load buyer dashboard' });
  }
};