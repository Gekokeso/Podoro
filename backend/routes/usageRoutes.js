// backend/routes/usageRoutes.js
const express = require('express');
const router = express.Router();
const { addUsage, getUsageByDate } = require('../controllers/usageController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addUsage);
router.get('/:date', protect, getUsageByDate);

module.exports = router;