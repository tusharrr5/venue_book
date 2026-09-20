/**
 * Automated Test Suite for VenueHub System
 * Validates Authentication, Conflict Detection, RBAC, Race-Free Approvals, and Suggestions.
 */

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/venue_booking_db_test';

const mongoose = require('mongoose');
const assert = require('assert');

const User = require('../models/User');
const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const VenueBlock = require('../models/VenueBlock');

const AvailabilityService = require('../services/availabilityService');
const BookingService = require('../services/bookingService');
const SuggestionService = require('../services/suggestionService');
const DashboardService = require('../services/dashboardService');
const { BOOKING_STATUS, VENUE_STATUS, ROLES } = require('../utils/constants');
const { isOverlapping, timeToMinutes, getTodayDateString } = require('../utils/helpers');

let testAdmin, testOrganiserA, testOrganiserB, testVenue;
let tomorrowStr;

async function runTests() {
  console.log('====================================================');
  console.log('       STARTING VENUEHUB AUTOMATED TEST SUITE       ');
  console.log('====================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[Test DB Connected]:', process.env.MONGODB_URI);

    // Clean test database
    await Promise.all([
      User.deleteMany({}),
      Venue.deleteMany({}),
      Booking.deleteMany({}),
      VenueBlock.deleteMany({})
    ]);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrowStr = tomorrow.toISOString().split('T')[0];

    // ----------------------------------------------------
    // 1. AUTHENTICATION & ROLE TESTS
    // ----------------------------------------------------
    console.log('--- 1. Testing Authentication & User Roles ---');

    testAdmin = new User({
      name: 'System Admin',
      email: 'admin_test@campus.edu',
      password: 'AdminPassword123',
      role: ROLES.ADMIN
    });
    await testAdmin.save();
    assert.strictEqual(testAdmin.role, ROLES.ADMIN, 'Admin role should be admin');
    assert.notStrictEqual(testAdmin.password, 'AdminPassword123', 'Admin password must be hashed with bcrypt');

    testOrganiserA = new User({
      name: 'Organiser Alice',
      email: 'alice@campus.edu',
      password: 'AlicePassword123',
      role: ROLES.ORGANISER
    });
    await testOrganiserA.save();
    assert.strictEqual(testOrganiserA.role, ROLES.ORGANISER, 'User must have organiser role');

    testOrganiserB = new User({
      name: 'Organiser Bob',
      email: 'bob@campus.edu',
      password: 'BobPassword123',
      role: ROLES.ORGANISER
    });
    await testOrganiserB.save();

    // Password comparison test
    const isMatch = await testOrganiserA.comparePassword('AlicePassword123');
    assert.strictEqual(isMatch, true, 'Password comparison should succeed for correct password');
    const isWrongMatch = await testOrganiserA.comparePassword('WrongPassword');
    assert.strictEqual(isWrongMatch, false, 'Password comparison should fail for incorrect password');

    // Duplicate email test
    try {
      const dupUser = new User({
        name: 'Duplicate',
        email: 'alice@campus.edu',
        password: 'Password123'
      });
      await dupUser.save();
      assert.fail('Should have rejected duplicate email');
    } catch (err) {
      assert.ok(err.code === 11000, 'Correctly prevented duplicate email registration');
    }

    console.log('✓ Authentication, hashing, and unique email tests passed.\n');

    // ----------------------------------------------------
    // 2. VENUE CREATION & SPECIFICATION TESTS
    // ----------------------------------------------------
    console.log('--- 2. Testing Venue Specifications ---');

    testVenue = new Venue({
      name: 'Hall of Science',
      description: 'Science lecture theatre',
      location: 'Science Building Floor 1',
      capacity: 100,
      facilities: ['Projector', 'Wi-Fi', 'Air Conditioning', 'Sound System'],
      hourlyRate: 1000,
      status: VENUE_STATUS.ACTIVE
    });
    await testVenue.save();
    assert.strictEqual(testVenue.capacity, 100);
    assert.strictEqual(testVenue.hourlyRate, 1000);

    // Negative rate test
    try {
      const negVenue = new Venue({
        name: 'Invalid Venue',
        description: 'Test',
        location: 'Test',
        capacity: 50,
        hourlyRate: -100
      });
      await negVenue.save();
      assert.fail('Should not allow negative hourly rate');
    } catch (err) {
      assert.ok(err.errors.hourlyRate, 'Correctly rejected negative hourly rate');
    }

    // Zero capacity test
    try {
      const zeroVenue = new Venue({
        name: 'Zero Cap Venue',
        description: 'Test',
        location: 'Test',
        capacity: 0,
        hourlyRate: 500
      });
      await zeroVenue.save();
      assert.fail('Should not allow 0 capacity');
    } catch (err) {
      assert.ok(err.errors.capacity, 'Correctly rejected capacity <= 0');
    }

    console.log('✓ Venue model and validation tests passed.\n');

    // ----------------------------------------------------
    // 3. BOOKING CONFLICT DETECTION & OVERLAP ALGORITHM
    // ----------------------------------------------------
    console.log('--- 3. Testing Overlap Algorithm & Conflict Logic ---');

    // Mathematical overlap rule check
    assert.strictEqual(isOverlapping('10:00', '12:00', '11:00', '13:00'), true, 'Partial forward overlap must be detected');
    assert.strictEqual(isOverlapping('10:00', '12:00', '09:00', '10:30'), true, 'Partial backward overlap must be detected');
    assert.strictEqual(isOverlapping('10:00', '12:00', '10:00', '12:00'), true, 'Exact overlap must be detected');
    assert.strictEqual(isOverlapping('10:00', '12:00', '10:30', '11:30'), true, 'Contained overlap must be detected');

    // Adjacent edge cases (Must NOT be detected as overlaps!)
    assert.strictEqual(isOverlapping('10:00', '12:00', '08:00', '10:00'), false, 'Adjacent ending at start must be allowed');
    assert.strictEqual(isOverlapping('10:00', '12:00', '12:00', '14:00'), false, 'Adjacent starting at end must be allowed');

    // Create base approved booking: 10:00 to 12:00
    const baseBooking = new Booking({
      organiser: testOrganiserA._id,
      venue: testVenue._id,
      eventName: 'Base Event',
      eventDescription: 'First event',
      expectedAttendees: 80,
      bookingDate: tomorrowStr,
      startTime: '10:00',
      endTime: '12:00',
      durationHours: 2,
      totalAmount: 2000,
      status: BOOKING_STATUS.APPROVED,
      approvedBy: testAdmin._id
    });
    await baseBooking.save();

    // Check availability against base booking
    const exactConflict = await AvailabilityService.checkVenueAvailability(
      testVenue._id,
      tomorrowStr,
      '10:00',
      '12:00'
    );
    assert.strictEqual(exactConflict.available, false, 'Exact slot should be unavailable');

    const partialConflict = await AvailabilityService.checkVenueAvailability(
      testVenue._id,
      tomorrowStr,
      '11:00',
      '13:00'
    );
    assert.strictEqual(partialConflict.available, false, 'Partial forward slot should be unavailable');

    const adjacentBefore = await AvailabilityService.checkVenueAvailability(
      testVenue._id,
      tomorrowStr,
      '08:00',
      '10:00'
    );
    assert.strictEqual(adjacentBefore.available, true, 'Adjacent slot before should be available');

    const adjacentAfter = await AvailabilityService.checkVenueAvailability(
      testVenue._id,
      tomorrowStr,
      '12:00',
      '14:00'
    );
    assert.strictEqual(adjacentAfter.available, true, 'Adjacent slot after should be available');

    console.log('✓ Overlap algorithm and slot availability tests passed.\n');

    // ----------------------------------------------------
    // 4. VENUE MAINTENANCE BLOCK TESTS
    // ----------------------------------------------------
    console.log('--- 4. Testing Maintenance Blocks ---');

    const block = new VenueBlock({
      venue: testVenue._id,
      date: tomorrowStr,
      startTime: '15:00',
      endTime: '18:00',
      reason: 'HVAC Air Filter Replacement',
      createdBy: testAdmin._id
    });
    await block.save();

    // Attempt to book during maintenance window
    const blockCheck = await AvailabilityService.checkVenueAvailability(
      testVenue._id,
      tomorrowStr,
      '16:00',
      '17:00'
    );
    assert.strictEqual(blockCheck.available, false, 'Slot during maintenance block must be unavailable');
    assert.strictEqual(blockCheck.conflictType, 'block', 'Conflict type must be block');

    console.log('✓ Maintenance block blocking tests passed.\n');

    // ----------------------------------------------------
    // 5. BOOKING SERVICE BUSINESS RULES & VALIDATION
    // ----------------------------------------------------
    console.log('--- 5. Testing Booking Creation Business Rules ---');

    // 1. Capacity Exceeded
    try {
      await BookingService.createBookingRequest({
        organiserId: testOrganiserA._id,
        venueId: testVenue._id,
        eventName: 'Too Big Event',
        eventDescription: 'Exceeds capacity',
        expectedAttendees: 150, // Venue capacity is 100
        bookingDate: tomorrowStr,
        startTime: '12:00',
        endTime: '14:00'
      });
      assert.fail('Should reject booking exceeding venue capacity');
    } catch (err) {
      assert.ok(err.message.includes('exceeds venue capacity'), 'Correctly rejected capacity > venue.capacity');
    }

    // 2. End time before start time
    try {
      await BookingService.createBookingRequest({
        organiserId: testOrganiserA._id,
        venueId: testVenue._id,
        eventName: 'Time Travel Event',
        eventDescription: 'End before start',
        expectedAttendees: 50,
        bookingDate: tomorrowStr,
        startTime: '14:00',
        endTime: '12:00'
      });
      assert.fail('Should reject end time <= start time');
    } catch (err) {
      assert.ok(err.message.includes('later than start time'), 'Correctly rejected invalid time order');
    }

    // 3. Past Date
    try {
      await BookingService.createBookingRequest({
        organiserId: testOrganiserA._id,
        venueId: testVenue._id,
        eventName: 'Past Event',
        eventDescription: 'Yesterday event',
        expectedAttendees: 50,
        bookingDate: '2020-01-01',
        startTime: '10:00',
        endTime: '12:00'
      });
      assert.fail('Should reject past date booking');
    } catch (err) {
      assert.ok(err.message.includes('past'), 'Correctly rejected booking date in the past');
    }

    // 4. Server-side price calculation
    const validBooking = await BookingService.createBookingRequest({
      organiserId: testOrganiserA._id,
      venueId: testVenue._id,
      eventName: 'Valid Workshop',
      eventDescription: 'A valid workshop',
      expectedAttendees: 50,
      bookingDate: tomorrowStr,
      startTime: '12:00',
      endTime: '15:00' // 3 hours * 1000 = 3000
    });
    assert.strictEqual(validBooking.durationHours, 3, 'Duration should be 3 hours');
    assert.strictEqual(validBooking.totalAmount, 3000, 'Total amount must be calculated server-side');
    assert.strictEqual(validBooking.status, BOOKING_STATUS.PENDING, 'Initial status must be pending');

    console.log('✓ Booking business rules & server-side price calculation tests passed.\n');

    // ----------------------------------------------------
    // 6. ADMIN APPROVAL & RACE CONDITION PREVENTION
    // ----------------------------------------------------
    console.log('--- 6. Testing Race Condition Prevention on Approval ---');

    // Create two pending bookings for the SAME date and time slot: 18:00 to 20:00
    const pendingBooking1 = new Booking({
      organiser: testOrganiserA._id,
      venue: testVenue._id,
      eventName: 'Race Candidate 1',
      eventDescription: 'Request 1',
      expectedAttendees: 50,
      bookingDate: tomorrowStr,
      startTime: '18:00',
      endTime: '20:00',
      durationHours: 2,
      totalAmount: 2000,
      status: BOOKING_STATUS.PENDING
    });
    await pendingBooking1.save();

    const pendingBooking2 = new Booking({
      organiser: testOrganiserB._id,
      venue: testVenue._id,
      eventName: 'Race Candidate 2',
      eventDescription: 'Request 2 (Conflicting)',
      expectedAttendees: 60,
      bookingDate: tomorrowStr,
      startTime: '18:00',
      endTime: '20:00',
      durationHours: 2,
      totalAmount: 2000,
      status: BOOKING_STATUS.PENDING
    });
    await pendingBooking2.save();

    // Admin approves Booking 1
    const approved1 = await BookingService.approveBooking(pendingBooking1._id, testAdmin._id);
    assert.strictEqual(approved1.status, BOOKING_STATUS.APPROVED, 'First booking must be approved');
    assert.strictEqual(approved1.approvedBy.toString(), testAdmin._id.toString());

    // Admin attempts to approve Booking 2 (must fail because Booking 1 is now approved for that slot!)
    try {
      await BookingService.approveBooking(pendingBooking2._id, testAdmin._id);
      assert.fail('Should not approve conflicting second booking!');
    } catch (err) {
      assert.ok(
        err.message.includes('already booked') || err.message.includes('Cannot approve booking'),
        'Correctly prevented approving second conflicting booking'
      );
    }

    console.log('✓ Race condition prevention during approval verified.\n');

    // ----------------------------------------------------
    // 7. EVENT COMPLETION & REVENUE ANALYTICS
    // ----------------------------------------------------
    console.log('--- 7. Testing Event Completion & Revenue Analytics ---');

    // Mark approved1 as completed
    const completedBooking = await BookingService.completeBooking(approved1._id);
    assert.strictEqual(completedBooking.status, BOOKING_STATUS.COMPLETED);
    assert.ok(completedBooking.completedAt, 'completedAt timestamp must be set');

    // Disallow completing pending or rejected bookings
    try {
      await BookingService.completeBooking(pendingBooking2._id);
      assert.fail('Should disallow completing a pending booking');
    } catch (err) {
      assert.ok(err.message.includes('Only approved events'), 'Correctly disallows completing non-approved bookings');
    }

    // Revenue calculation
    const revenueAnalytics = await DashboardService.getRevenueAnalytics(30);
    assert.ok(revenueAnalytics.totalRevenue >= 2000, 'Revenue analytics must aggregate completed amounts');

    // Utilisation calculation
    const utilisationAnalytics = await DashboardService.getVenueUtilisationAnalytics(30);
    assert.ok(utilisationAnalytics.venues.length > 0, 'Utilisation must return venue metrics');
    assert.strictEqual(utilisationAnalytics.operatingHoursPerDay, 14, 'Utilisation must use 14 hours operating window');

    console.log('✓ Event completion and analytics calculations verified.\n');

    // ----------------------------------------------------
    // 8. ORGANISER ISOLATION & AUTHORIZATION
    // ----------------------------------------------------
    console.log('--- 8. Testing Organiser Isolation & Authorization ---');

    // Organiser B attempts to cancel Organiser A's booking
    try {
      await BookingService.cancelBooking(
        validBooking._id,
        testOrganiserB._id,
        ROLES.ORGANISER,
        'Malicious cancel attempt'
      );
      assert.fail('Organiser B should not be able to cancel Organiser A booking');
    } catch (err) {
      assert.ok(err.message.includes('Unauthorized'), 'Correctly prevented cross-user cancellation');
    }

    // Organiser A cancels own booking
    const cancelledBooking = await BookingService.cancelBooking(
      validBooking._id,
      testOrganiserA._id,
      ROLES.ORGANISER,
      'Change of plans'
    );
    assert.strictEqual(cancelledBooking.status, BOOKING_STATUS.CANCELLED);
    assert.strictEqual(cancelledBooking.cancellationReason, 'Change of plans');

    // Cancelled booking should now FREE the slot: 12:00 to 15:00
    const freedSlot = await AvailabilityService.checkVenueAvailability(
      testVenue._id,
      tomorrowStr,
      '12:00',
      '15:00'
    );
    assert.strictEqual(freedSlot.available, true, 'Cancelled booking must free up the venue slot');

    console.log('✓ Organiser isolation and slot release on cancellation verified.\n');

    // ----------------------------------------------------
    // 9. ALTERNATIVE SUGGESTION ENGINE
    // ----------------------------------------------------
    console.log('--- 9. Testing Alternative Suggestion Engine ---');

    // Create a second active venue
    const altVenue = new Venue({
      name: 'Hall of Innovation',
      description: 'Alternative Hall',
      location: 'Science Complex West',
      capacity: 120,
      facilities: ['Projector', 'Wi-Fi'],
      hourlyRate: 1200,
      status: VENUE_STATUS.ACTIVE
    });
    await altVenue.save();

    // Query alternative venues for a time that is booked on testVenue (10:00 to 12:00)
    const suggestedVenues = await SuggestionService.suggestAlternativeVenues({
      currentVenueId: testVenue._id,
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '12:00',
      expectedAttendees: 75,
      requiredFacilities: ['Projector', 'Wi-Fi']
    });

    assert.ok(suggestedVenues.length > 0, 'Should suggest alternative venues');
    assert.strictEqual(suggestedVenues[0]._id.toString(), altVenue._id.toString(), 'Should suggest available altVenue');

    // Query alternative time slots on testVenue on tomorrowStr
    const suggestedSlots = await SuggestionService.suggestAlternativeTimeSlots({
      venueId: testVenue._id,
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '12:00'
    });

    assert.ok(suggestedSlots.length > 0, 'Should suggest alternative available time slots on same venue');
    console.log(`✓ Suggestion engine returned ${suggestedVenues.length} alternative venue(s) and ${suggestedSlots.length} slot(s).\n`);

    console.log('====================================================');
    console.log('     ALL TEST SUITE CHECKS PASSED SUCCESSFULLY!     ');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILURE:', error);
    process.exit(1);
  }
}

runTests();
