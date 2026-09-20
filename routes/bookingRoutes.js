const express = require('express');
const router = express.Router();
const BookingController = require('../controllers/bookingController');
const { isAuthenticated } = require('../middleware/auth');
const { bookingValidation, validateObjectId } = require('../middleware/validation');

// All booking routes require authentication
router.use(isAuthenticated);

// Organiser's booking history
router.get('/bookings', BookingController.myBookings);

// Booking creation form
router.get('/bookings/new/:venueId', validateObjectId('venueId'), BookingController.getNewBooking);

// Submit booking request
router.post('/bookings', bookingValidation, BookingController.postNewBooking);

// View specific booking
router.get('/bookings/:id', validateObjectId('id'), BookingController.show);

// Cancel booking
router.post('/bookings/:id/cancel', validateObjectId('id'), BookingController.cancelBooking);

module.exports = router;
