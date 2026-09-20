const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const VenueBlock = require('../models/VenueBlock');
const BookingService = require('../services/bookingService');
const AvailabilityService = require('../services/availabilityService');
const { BOOKING_STATUS, VENUE_STATUS, FACILITIES, BLOCK_REASONS } = require('../utils/constants');
const { formatDateDisplay, formatCurrency, getTodayDateString } = require('../utils/helpers');

/**
 * Controller for Admin operations (Venues CRUD, Blocks, Booking approvals/rejections, Completion)
 */
class AdminController {
  // ==================== VENUE MANAGEMENT ====================

  static async listVenues(req, res, next) {
    try {
      const venues = await Venue.find().sort({ createdAt: -1 });
      res.render('admin/venues/index', {
        title: 'Manage Venues - Admin',
        venues,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static getNewVenue(req, res) {
    res.render('admin/venues/new', {
      title: 'Add New Venue - Admin',
      allFacilities: FACILITIES,
      oldInput: req.flash('oldInput')[0] || {}
    });
  }

  static async postNewVenue(req, res, next) {
    try {
      const { name, description, location, capacity, hourlyRate, imageUrl } = req.body;
      let facilities = req.body.facilities || [];
      if (!Array.isArray(facilities)) {
        facilities = [facilities];
      }

      const venue = new Venue({
        name: name.trim(),
        description: description.trim(),
        location: location.trim(),
        capacity: Number(capacity),
        hourlyRate: Number(hourlyRate),
        facilities,
        imageUrl: imageUrl && imageUrl.trim() ? imageUrl.trim() : undefined,
        status: VENUE_STATUS.ACTIVE
      });

      await venue.save();
      req.flash('success', `Venue "${venue.name}" created successfully!`);
      res.redirect('/admin/venues');
    } catch (error) {
      if (error.code === 11000) {
        req.flash('error', 'A venue with this name already exists.');
        req.flash('oldInput', req.body);
        return res.redirect('/admin/venues/new');
      }
      next(error);
    }
  }

  static async getEditVenue(req, res, next) {
    try {
      const venue = await Venue.findById(req.params.id);
      if (!venue) {
        req.flash('error', 'Venue not found.');
        return res.redirect('/admin/venues');
      }

      res.render('admin/venues/edit', {
        title: `Edit ${venue.name} - Admin`,
        venue,
        allFacilities: FACILITIES
      });
    } catch (error) {
      next(error);
    }
  }

  static async putEditVenue(req, res, next) {
    try {
      const { name, description, location, capacity, hourlyRate, imageUrl, status } = req.body;
      let facilities = req.body.facilities || [];
      if (!Array.isArray(facilities)) {
        facilities = [facilities];
      }

      const venue = await Venue.findById(req.params.id);
      if (!venue) {
        req.flash('error', 'Venue not found.');
        return res.redirect('/admin/venues');
      }

      venue.name = name.trim();
      venue.description = description.trim();
      venue.location = location.trim();
      venue.capacity = Number(capacity);
      venue.hourlyRate = Number(hourlyRate);
      venue.facilities = facilities;
      if (imageUrl && imageUrl.trim()) venue.imageUrl = imageUrl.trim();
      if (status && Object.values(VENUE_STATUS).includes(status)) venue.status = status;

      await venue.save();
      req.flash('success', `Venue "${venue.name}" updated successfully.`);
      res.redirect('/admin/venues');
    } catch (error) {
      next(error);
    }
  }

  static async toggleVenueStatus(req, res, next) {
    try {
      const venue = await Venue.findById(req.params.id);
      if (!venue) {
        req.flash('error', 'Venue not found.');
        return res.redirect('/admin/venues');
      }

      venue.status = venue.status === VENUE_STATUS.ACTIVE ? VENUE_STATUS.INACTIVE : VENUE_STATUS.ACTIVE;
      await venue.save();

      req.flash('success', `Venue "${venue.name}" is now ${venue.status}.`);
      res.redirect('/admin/venues');
    } catch (error) {
      next(error);
    }
  }

  static async deleteVenue(req, res, next) {
    try {
      const venueId = req.params.id;
      // Check if venue has historical bookings
      const bookingCount = await Booking.countDocuments({ venue: venueId });

      if (bookingCount > 0) {
        // Safe soft-delete / deactivation instead of destroying historical records
        await Venue.findByIdAndUpdate(venueId, { status: VENUE_STATUS.INACTIVE });
        req.flash('warning', `Venue has ${bookingCount} associated bookings. It has been deactivated instead of deleted to preserve historical data.`);
        return res.redirect('/admin/venues');
      }

      await Venue.findByIdAndDelete(venueId);
      req.flash('success', 'Venue deleted permanently.');
      res.redirect('/admin/venues');
    } catch (error) {
      next(error);
    }
  }

  // ==================== BOOKING APPROVAL MANAGEMENT ====================

  static async listBookings(req, res, next) {
    try {
      const { status, venueId, date } = req.query;
      const filter = {};

      if (status && Object.values(BOOKING_STATUS).includes(status)) {
        filter.status = status;
      }
      if (venueId) {
        filter.venue = venueId;
      }
      if (date) {
        filter.bookingDate = date;
      }

      const [bookings, venues] = await Promise.all([
        Booking.find(filter)
          .populate('venue', 'name location')
          .populate('organiser', 'name email')
          .sort({ createdAt: -1 }),
        Venue.find().select('name')
      ]);

      res.render('admin/bookings/index', {
        title: 'Booking Requests & Approvals - Admin',
        bookings,
        venues,
        allStatuses: Object.values(BOOKING_STATUS),
        filters: {
          status: status || 'all',
          venueId: venueId || '',
          date: date || ''
        },
        formatDateDisplay,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async showBooking(req, res, next) {
    try {
      const booking = await Booking.findById(req.params.id)
        .populate('venue')
        .populate('organiser', 'name email')
        .populate('approvedBy', 'name email');

      if (!booking) {
        req.flash('error', 'Booking not found.');
        return res.redirect('/admin/bookings');
      }

      // Check for overlapping bookings if booking is still pending
      let conflicts = [];
      if (booking.status === BOOKING_STATUS.PENDING) {
        const check = await AvailabilityService.checkVenueAvailability(
          booking.venue._id,
          booking.bookingDate,
          booking.startTime,
          booking.endTime,
          booking._id,
          false
        );
        if (!check.available) {
          conflicts.push(check.reason);
        }
      }

      res.render('admin/bookings/show', {
        title: `Review: ${booking.eventName} - Admin`,
        booking,
        conflicts,
        formatDateDisplay,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveBooking(req, res, next) {
    try {
      const bookingId = req.params.id;
      const adminId = req.session.user._id;

      await BookingService.approveBooking(bookingId, adminId);
      req.flash('success', 'Booking approved successfully! The venue slot is now confirmed.');
      res.redirect(`/admin/bookings/${bookingId}`);
    } catch (error) {
      req.flash('error', error.message);
      res.redirect(`/admin/bookings/${req.params.id}`);
    }
  }

  static async rejectBooking(req, res, next) {
    try {
      const bookingId = req.params.id;
      const { remarks } = req.body;

      await BookingService.rejectBooking(bookingId, remarks);
      req.flash('info', 'Booking request has been rejected.');
      res.redirect(`/admin/bookings/${bookingId}`);
    } catch (error) {
      req.flash('error', error.message);
      res.redirect(`/admin/bookings/${req.params.id}`);
    }
  }

  static async completeBooking(req, res, next) {
    try {
      const bookingId = req.params.id;

      await BookingService.completeBooking(bookingId);
      req.flash('success', 'Event marked as completed. Revenue and utilisation have been updated.');
      res.redirect(`/admin/bookings/${bookingId}`);
    } catch (error) {
      req.flash('error', error.message);
      res.redirect(`/admin/bookings/${req.params.id}`);
    }
  }

  // ==================== VENUE MAINTENANCE BLOCKS ====================

  static async listBlocks(req, res, next) {
    try {
      const [blocks, venues] = await Promise.all([
        VenueBlock.find()
          .populate('venue', 'name location')
          .populate('createdBy', 'name')
          .sort({ date: -1, startTime: 1 }),
        Venue.find({ status: VENUE_STATUS.ACTIVE }).select('name')
      ]);

      res.render('admin/blocks/index', {
        title: 'Venue Maintenance Blocks - Admin',
        blocks,
        venues,
        blockReasons: BLOCK_REASONS,
        todayDate: getTodayDateString(),
        formatDateDisplay
      });
    } catch (error) {
      next(error);
    }
  }

  static async postCreateBlock(req, res, next) {
    try {
      const { venue, date, startTime, endTime, reason } = req.body;
      const createdBy = req.session.user._id;

      // Check if this block conflicts with existing bookings and warn admin
      const conflicts = await AvailabilityService.checkBlockConflicts(venue, date, startTime, endTime);
      if (conflicts.length > 0) {
        const conflictNames = conflicts.map((c) => `"${c.eventName}" (${c.status})`).join(', ');
        req.flash(
          'warning',
          `Block created, but notice: There are ${conflicts.length} conflicting booking(s) during this period: ${conflictNames}. Please review them in Booking Requests.`
        );
      } else {
        req.flash('success', 'Venue maintenance block scheduled successfully.');
      }

      const block = new VenueBlock({
        venue,
        date,
        startTime,
        endTime,
        reason,
        createdBy
      });

      await block.save();
      res.redirect('/admin/blocks');
    } catch (error) {
      req.flash('error', error.message);
      res.redirect('/admin/blocks');
    }
  }

  static async deleteBlock(req, res, next) {
    try {
      await VenueBlock.findByIdAndDelete(req.params.id);
      req.flash('success', 'Maintenance block removed.');
      res.redirect('/admin/blocks');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;
