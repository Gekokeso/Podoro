const express = require('express');
const router = express.Router();
const { getSites, createSite, updateSite, deleteSite } = require('../controllers/sitesController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getSites).post(protect, createSite);
router.route('/:id').put(protect, updateSite).delete(protect, deleteSite);

module.exports = router;