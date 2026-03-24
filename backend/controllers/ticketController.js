const Ticket = require('../models/Ticket');

const COMMISSION_RATE = 0.10;

// GET /api/tickets – list with filters & pagination
exports.getTickets = async (req, res) => {
  try {
    const {
      q, city, category, date, minPrice, maxPrice,
      status = 'available', sort = 'createdAt:-1',
      page = 1, limit = 12
    } = req.query;

    const filter = {};

    // Status filter
    if (status) filter.status = status;

    // Text search
    if (q) {
      filter.$or = [
        { eventName: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    // City filter
    if (city) filter.city = { $regex: city, $options: 'i' };

    // Category filter
    if (category) filter.category = category;

    // Date filter
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Sort
    const [sortField, sortDir] = sort.split(':');
    const sortObj = { [sortField]: parseInt(sortDir) || -1 };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Ticket.countDocuments(filter);
    const tickets = await Ticket.find(filter)
      .populate('sellerId', 'name')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      tickets,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch(err) {
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
};

// GET /api/tickets/:id
exports.getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('sellerId', 'name email');

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Don't expose QR (ticketImage) unless buyer
    const ticketObj = ticket.toObject();
    const user = req.user;
    const isBuyer = user && ticket.buyerId && ticket.buyerId.toString() === user._id.toString();
    const isSeller = user && ticket.sellerId._id.toString() === user._id.toString();

    if (!isBuyer && !isSeller && ticketObj.ticketImage) {
      // Keep path reference but flag as hidden
      ticketObj._imageHidden = true;
      // Don't delete ticketImage for listing purposes (blurred preview)
    }

    res.json({ ticket: ticketObj });
  } catch(err) {
    if (err.name === 'CastError') return res.status(404).json({ message: 'Ticket not found' });
    res.status(500).json({ message: 'Failed to fetch ticket' });
  }
};

// POST /api/tickets – create listing
exports.createTicket = async (req, res) => {
  try {
    const { eventName, category, city, date, seat, originalPrice, price, description } = req.body;

    // Validation
    if (!eventName || !category || !city || !date || !seat || !originalPrice || !price) {
      return res.status(400).json({ message: 'All required fields must be filled' });
    }

    if (parseFloat(price) > parseFloat(originalPrice)) {
      return res.status(400).json({ message: 'Selling price cannot exceed original ticket price' });
    }

    const eventDate = new Date(date);
    if (eventDate <= new Date()) {
      return res.status(400).json({ message: 'Event date must be in the future' });
    }

    // Check for duplicate listing by same seller for same event+seat
    const duplicate = await Ticket.findOne({
      sellerId: req.user._id,
      eventName: { $regex: new RegExp(`^${eventName}$`, 'i') },
      seat: { $regex: new RegExp(`^${seat}$`, 'i') },
      status: { $in: ['available', 'reserved'] }
    });
    if (duplicate) {
      return res.status(400).json({ message: 'You already have an active listing for this ticket' });
    }

    const ticketData = {
      eventName,
      category,
      city,
      date: eventDate,
      seat,
      originalPrice: parseFloat(originalPrice),
      price: parseFloat(price),
      description,
      sellerId: req.user._id,
      status: 'available'
    };

    if (req.file) {
      ticketData.ticketImage = `uploads/${req.file.filename}`;
    }

    const ticket = await Ticket.create(ticketData);

    res.status(201).json({
      message: 'Ticket listed successfully',
      ticket
    });
  } catch(err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ message: messages[0] });
    }
    res.status(500).json({ message: 'Failed to list ticket' });
  }
};

// DELETE /api/tickets/:id – remove listing (seller only)
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    if (ticket.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to remove this ticket' });
    }

    if (ticket.status === 'sold') {
      return res.status(400).json({ message: 'Cannot remove a sold ticket' });
    }

    await ticket.deleteOne();
    res.json({ message: 'Ticket removed from marketplace' });
  } catch(err) {
    res.status(500).json({ message: 'Failed to remove ticket' });
  }
};