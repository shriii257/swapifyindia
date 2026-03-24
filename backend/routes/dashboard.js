const express = require('express');
const router = express.Router();
const { getSellerDashboard, getBuyerDashboard } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/seller', protect, getSellerDashboard);
router.get('/buyer', protect, getBuyerDashboard);

module.exports = router;