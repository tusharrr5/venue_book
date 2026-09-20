const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const VenueBlock = require('../models/VenueBlock');
const { BOOKING_STATUS, VENUE_STATUS } = require('../utils/constants');
const { isOverlapping, timeToMinutes } = require('../utils/helpers');

/**
 * Service to handle venue availability and conflict detection
 */
class AvailabilityService {
  /**
   * Checks if a venue is available for the given date and time range.
   * Compares against VenueBlocks and active Bookings.
   *
   * @param {string} venueId
   * @param {string} date - "YYYY-MM-DD"
   * @param {string} startTime - "HH:MM"
   * @param {string} endTime - "HH:MM"
   * @param {string|null} excludeBookingId - Optional ID to ignore (for self-updating)
   * @param {boolean} checkPending - Whether to treat 'pending' bookings as conflicts (default true for new booking requests)
   * @returns {Promise<{ available: boolean, reason: string|null, conflictType: string|null, conflictingItem: object|null }>}
   */
  static async checkVenueAvailability(venueId, date, startTime, endTime, excludeBookingId = null, checkPending = true) {
    // 1. Check if venue exists and is active
    const venue = await Venue.findById(venueId);
    if (!venue) {
      return {
        available: false,
        reason: 'Venue not found',
        conflictType: 'not_found',
        conflictingItem: null
      };
    }

    if (venue.status !== VENUE_STATUS.ACTIVE) {
      return {
        available: false,
        reason: 'Venue is currently inactive and cannot be booked',
        conflictType: 'inactive',
        conflictingItem: null
      };
    }

    // 2. Check for maintenance blocks
    const blocks = await VenueBlock.find({ venue: venueId, date });
    for (const block of blocks) {
      if (isOverlapping(startTime, endTime, block.startTime, block.endTime)) {
        return {
          available: false,
          reason: `Venue is blocked for maintenance: "${block.reason}" (${block.startTime} - ${block.endTime})`,
          conflictType: 'block',
          conflictingItem: block
        };
      }
    }

    // 3. Check for conflicting bookings
    const queryStatuses = checkPending
      ? [BOOKING_STATUS.APPROVED, BOOKING_STATUS.PENDING]
      : [BOOKING_STATUS.APPROVED];

    const bookingQuery = {
      venue: venueId,
      bookingDate: date,
      status: { $in: queryStatuses }
    };

    if (excludeBookingId) {
      bookingQuery._id = { $ne: excludeBookingId };
    }

    const bookings = await Booking.find(bookingQuery);
    for (const booking of bookings) {
      if (isOverlapping(startTime, endTime, booking.startTime, booking.endTime)) {
        const isApproved = booking.status === BOOKING_STATUS.APPROVED;
        return {
          available: false,
          reason: isApproved
            ? `Venue is already booked from ${booking.startTime} to ${booking.endTime}`
            : `There is another pending booking request from ${booking.startTime} to ${booking.endTime}`,
          conflictType: 'booking',
          conflictingItem: booking
        };
      }
    }

    return {
      available: true,
      reason: null,
      conflictType: null,
      conflictingItem: null
    };
  }

  /**
   * Retrieves non-confidential schedule for a venue on a specific date.
   * Useful for showing booked/blocked intervals to organisers without leaking private event data.
   *
   * @param {string} venueId
   * @param {string} date - "YYYY-MM-DD"
   * @returns {Promise<Array<{ startTime: string, endTime: string, type: 'booked'|'maintenance' }>>}
   */
  static async getVenueSchedule(venueId, date) {
    const [bookings, blocks] = await Promise.all([
      Booking.find({
        venue: venueId,
        bookingDate: date,
        status: BOOKING_STATUS.APPROVED
      }).select('startTime endTime status'),
      VenueBlock.find({ venue: venueId, date }).select('startTime endTime reason')
    ]);

    const schedule = [];

    bookings.forEach((b) => {
      schedule.push({
        startTime: b.startTime,
        endTime: b.endTime,
        type: 'booked',
        label: 'Booked'
      });
    });

    blocks.forEach((blk) => {
      schedule.push({
        startTime: blk.startTime,
        endTime: blk.endTime,
        type: 'maintenance',
        label: `Maintenance (${blk.reason})`
      });
    });

    // Sort by startTime
    schedule.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return schedule;
  }

  /**
   * Checks if a proposed maintenance block will collide with any existing approved or pending bookings.
   *
   * @param {string} venueId
   * @param {string} date
   * @param {string} startTime
   * @param {string} endTime
   * @returns {Promise<Array<object>>} conflicting bookings if any
   */
  static async checkBlockConflicts(venueId, date, startTime, endTime) {
    const bookings = await Booking.find({
      venue: venueId,
      bookingDate: date,
      status: { $in: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.PENDING] }
    }).populate('organiser', 'name email');

    const conflicts = [];
    for (const b of bookings) {
      if (isOverlapping(startTime, endTime, b.startTime, b.endTime)) {
        conflicts.push(b);
      }
    }

    return conflicts;
  }
}

module.exports = AvailabilityService;
