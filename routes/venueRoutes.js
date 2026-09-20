const express = require('express');
const router = express.Router();
const VenueController = require('../controllers/venueController');
const { validateObjectId } = require('../middleware/validation');

// Venue discovery
router.get('/venues', VenueController.index);

// Venue details
router.get('/venues/:id', validateObjectId('id'), VenueController.show);

module.exports = router;
