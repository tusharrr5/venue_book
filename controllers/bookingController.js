const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const BookingService = require('../services/bookingService');
const SuggestionService = require('../services/suggestionService');
const { BOOKING_STATUS, VENUE_STATUS } = require('../utils/constants');
const {
  formatDate,
  formatDateDisplay,
  formatCurrency,
  getTodayDateString,
  timeToMinutes
} = require('../utils/helpers');

/**
 * Controller for Booking operations (Create, List, View, Cancel)
 */
class BookingController {
  static async getNewBooking(req, res, next) {
    try {
      const venue = await Venue.findById(req.params.venueId);
      if (!venue) {
        req.flash('error', 'Venue not found.');
        return res.redirect('/venues');
      }

      if (venue.status !== VENUE_STATUS.ACTIVE) {
        req.flash('error', 'This venue is currently inactive and cannot accept bookings.');
        return res.redirect('/venues');
      }

      const prefillDate = req.query.date || getTodayDateString();
      const prefillStart = req.query.startTime || '10:00';
      const prefillEnd = req.query.endTime || '12:00';

      res.render('bookings/new', {
        title: `Book ${venue.name} - VenueHub`,
        venue,
        todayDate: getTodayDateString(),
        prefillDate,
        prefillStart,
        prefillEnd,
        oldInput: req.flash('oldInput')[0] || {},
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async postNewBooking(req, res, next) {
    try {
      const { venueId, eventName, eventDescription, expectedAttendees, bookingDate, startTime, endTime } = req.body;
      const organiserId = req.session.user._id;

      try {
        const booking = await BookingService.createBookingRequest({
          organiserId,
          venueId,
          eventName,
          eventDescription,
          expectedAttendees,
          bookingDate,
          startTime,
          endTime
        });

        req.flash('success', `Booking request for "${booking.eventName}" submitted successfully! Status: Pending Approval.`);
        return res.redirect(`/bookings/${booking._id}`);
      } catch (err) {
        // If it's a conflict or unavailability error, suggest alternatives
        if (err.isConflict || err.message.includes('booked') || err.message.includes('blocked') || err.message.includes('pending')) {
          const currentVenue = await Venue.findById(venueId);

          const [alternativeVenues, alternativeSlots] = await Promise.all([
            SuggestionService.suggestAlternativeVenues({
              currentVenueId: venueId,
              date: bookingDate,
              startTime,
              endTime,
              expectedAttendees: Number(expectedAttendees),
              requiredFacilities: currentVenue ? currentVenue.facilities : []
            }),
            SuggestionService.suggestAlternativeTimeSlots({
              venueId,
              date: bookingDate,
              startTime,
              endTime
            })
          ]);

          return res.status(409).render('bookings/unavailable', {
            title: 'Slot Unavailable - Suggestions Available',
            currentVenue,
            conflictReason: err.message,
            requestDetails: {
              eventName,
              eventDescription,
              expectedAttendees,
              bookingDate,
              startTime,
              endTime
            },
            alternativeVenues,
            alternativeSlots,
            formatDateDisplay,
            formatCurrency
          });
        }

        req.flash('error', err.message);
        req.flash('oldInput', req.body);
        return res.redirect(`/bookings/new/${venueId}`);
      }
    } catch (error) {
      next(error);
    }
  }

  static async myBookings(req, res, next) {
    try {
      const organiserId = req.session.user._id;
      const { status } = req.query;

      const filter = { organiser: organiserId };
      if (status && Object.values(BOOKING_STATUS).includes(status)) {
        filter.status = status;
      }

      const bookings = await Booking.find(filter)
        .populate('venue', 'name location imageUrl hourlyRate')
        .sort({ createdAt: -1 });

      res.render('bookings/myBookings', {
        title: 'My Bookings - VenueHub',
        bookings,
        currentStatusFilter: status || 'all',
        allStatuses: Object.values(BOOKING_STATUS),
        formatDateDisplay,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async show(req, res, next) {
    try {
      const booking = await Booking.findById(req.params.id)
        .populate('venue')
        .populate('organiser', 'name email')
        .populate('approvedBy', 'name');

      if (!booking) {
        return res.status(404).render('errors/404', {
          title: 'Booking Not Found',
          message: 'The requested booking does not exist.'
        });
      }

      // Strict Authorization check: Organisers can only view their own bookings
      const isOwner = booking.organiser._id.toString() === req.session.user._id.toString();
      const isAdminUser = req.session.user.role === 'admin';

      if (!isOwner && !isAdminUser) {
        return res.status(403).render('errors/403', {
          title: '403 Forbidden - Access Denied',
          message: 'You are not authorized to view this booking.'
        });
      }

      res.render('bookings/show', {
        title: `Booking Details: ${booking.eventName}`,
        booking,
        isOwner,
        formatDateDisplay,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelBooking(req, res, next) {
    try {
      const { reason } = req.body;
      const bookingId = req.params.id;
      const userId = req.session.user._id;
      const userRole = req.session.user.role;

      await BookingService.cancelBooking(bookingId, userId, userRole, reason);

      req.flash('success', 'Booking has been cancelled successfully.');
      res.redirect(userRole === 'admin' ? `/admin/bookings/${bookingId}` : `/bookings/${bookingId}`);
    } catch (error) {
      req.flash('error', error.message);
      res.redirect(req.header('Referer') || '/bookings');
    }
  }
}

module.exports = BookingController;
