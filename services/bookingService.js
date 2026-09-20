const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const AvailabilityService = require('./availabilityService');
const { BOOKING_STATUS, VENUE_STATUS } = require('../utils/constants');
const { calculateDurationHours, timeToMinutes } = require('../utils/helpers');

/**
 * Service to manage booking lifecycle and business rule enforcement
 */
class BookingService {
  /**
   * Validates and creates a new pending booking request.
   * Calculates duration and totalAmount on the server.
   */
  static async createBookingRequest({
    organiserId,
    venueId,
    eventName,
    eventDescription,
    expectedAttendees,
    bookingDate,
    startTime,
    endTime
  }) {
    // 1. Fetch Venue
    const venue = await Venue.findById(venueId);
    if (!venue) {
      throw new Error('Selected venue does not exist');
    }
    if (venue.status !== VENUE_STATUS.ACTIVE) {
      throw new Error('This venue is currently inactive and cannot accept bookings');
    }

    // 2. Validate attendee capacity
    const attendees = Number(expectedAttendees);
    if (isNaN(attendees) || attendees <= 0) {
      throw new Error('Expected attendees must be a positive number');
    }
    if (attendees > venue.capacity) {
      throw new Error(`Expected attendees (${attendees}) exceeds venue capacity (${venue.capacity})`);
    }

    // 3. Validate times
    const startMins = timeToMinutes(startTime);
    const endMins = timeToMinutes(endTime);
    if (endMins <= startMins) {
      throw new Error('End time must be later than start time');
    }

    // 4. Validate booking date is not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestedDate = new Date(bookingDate);
    if (requestedDate < today) {
      throw new Error('Booking date cannot be in the past');
    }

    // 5. Server-side Conflict Check
    const availability = await AvailabilityService.checkVenueAvailability(
      venueId,
      bookingDate,
      startTime,
      endTime,
      null,
      true // pending bookings also count as conflicts for initial request
    );

    if (!availability.available) {
      const err = new Error(availability.reason || 'The requested venue and time slot is not available');
      err.isConflict = true;
      err.conflictType = availability.conflictType;
      throw err;
    }

    // 6. Calculate duration and total amount server-side
    const durationHours = calculateDurationHours(startTime, endTime);
    const totalAmount = Math.round(durationHours * venue.hourlyRate);

    // 7. Create booking record
    const booking = new Booking({
      organiser: organiserId,
      venue: venueId,
      eventName,
      eventDescription,
      expectedAttendees: attendees,
      bookingDate,
      startTime,
      endTime,
      durationHours,
      totalAmount,
      status: BOOKING_STATUS.PENDING
    });

    return await booking.save();
  }

  /**
   * Approves a pending booking.
   * Performs an immediate re-check for conflicts to prevent race conditions.
   */
  static async approveBooking(bookingId, adminUserId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      throw new Error(`Cannot approve booking with status: "${booking.status}". Only pending bookings can be approved.`);
    }

    // Recheck availability against APPROVED bookings and BLOCKS
    const availability = await AvailabilityService.checkVenueAvailability(
      booking.venue,
      booking.bookingDate,
      booking.startTime,
      booking.endTime,
      booking._id,
      false // Only check against already approved bookings and blocks
    );

    if (!availability.available) {
      throw new Error(`Cannot approve booking: ${availability.reason}`);
    }

    booking.status = BOOKING_STATUS.APPROVED;
    booking.approvedBy = adminUserId;
    booking.approvedAt = new Date();

    return await booking.save();
  }

  /**
   * Rejects a pending booking with optional remarks.
   */
  static async rejectBooking(bookingId, adminRemarks = '') {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BOOKING_STATUS.PENDING) {
      throw new Error(`Cannot reject booking with status: "${booking.status}". Only pending bookings can be rejected.`);
    }

    booking.status = BOOKING_STATUS.REJECTED;
    booking.adminRemarks = adminRemarks || 'Booking request was rejected by venue administration.';

    return await booking.save();
  }

  /**
   * Marks an approved event as completed.
   */
  static async completeBooking(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.status !== BOOKING_STATUS.APPROVED) {
      throw new Error(`Only approved events can be marked as completed. Current status: "${booking.status}".`);
    }

    booking.status = BOOKING_STATUS.COMPLETED;
    booking.completedAt = new Date();

    return await booking.save();
  }

  /**
   * Cancels a pending or approved booking.
   * Records cancelledAt and cancellationReason.
   */
  static async cancelBooking(bookingId, userId, userRole, reason = '') {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Authorization check: Organisers can only cancel their own bookings
    if (userRole !== 'admin' && booking.organiser.toString() !== userId.toString()) {
      throw new Error('Unauthorized to cancel this booking');
    }

    // Check eligible statuses
    if (![BOOKING_STATUS.PENDING, BOOKING_STATUS.APPROVED].includes(booking.status)) {
      throw new Error(`Cannot cancel booking with status "${booking.status}". Only pending or approved bookings can be cancelled.`);
    }

    booking.status = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Cancelled by user';

    return await booking.save();
  }
}

module.exports = BookingService;
