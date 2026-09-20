const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const { BOOKING_STATUS, VENUE_STATUS, OPERATING_HOURS } = require('../utils/constants');
const { getTodayDateString } = require('../utils/helpers');

/**
 * Service to aggregate dashboard metrics, revenue, and venue utilisation
 */
class DashboardService {
  /**
   * Aggregates stats for an Organiser's dashboard
   * @param {string} organiserId
   */
  static async getOrganiserDashboardData(organiserId) {
    const todayStr = getTodayDateString();

    const [
      pendingCount,
      approvedCount,
      upcomingCount,
      completedCount,
      cancelledRejectedCount,
      recentBookings
    ] = await Promise.all([
      Booking.countDocuments({ organiser: organiserId, status: BOOKING_STATUS.PENDING }),
      Booking.countDocuments({ organiser: organiserId, status: BOOKING_STATUS.APPROVED }),
      Booking.countDocuments({
        organiser: organiserId,
        status: BOOKING_STATUS.APPROVED,
        bookingDate: { $gte: todayStr }
      }),
      Booking.countDocuments({ organiser: organiserId, status: BOOKING_STATUS.COMPLETED }),
      Booking.countDocuments({
        organiser: organiserId,
        status: { $in: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] }
      }),
      Booking.find({ organiser: organiserId })
        .populate('venue', 'name location imageUrl')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    return {
      stats: {
        pendingCount,
        approvedCount,
        upcomingCount,
        completedCount,
        cancelledRejectedCount
      },
      recentBookings
    };
  }

  /**
   * Aggregates stats for the Admin dashboard
   */
  static async getAdminDashboardData() {
    const todayStr = getTodayDateString();

    const [
      totalVenues,
      activeVenues,
      pendingRequests,
      todayEvents,
      upcomingEvents,
      completedEventsCount,
      cancelledEventsCount,
      revenueResult,
      recentActivity
    ] = await Promise.all([
      Venue.countDocuments(),
      Venue.countDocuments({ status: VENUE_STATUS.ACTIVE }),
      Booking.find({ status: BOOKING_STATUS.PENDING })
        .populate('venue', 'name')
        .populate('organiser', 'name email')
        .sort({ createdAt: -1 })
        .limit(5),
      Booking.find({
        bookingDate: todayStr,
        status: { $in: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.COMPLETED] }
      })
        .populate('venue', 'name location')
        .populate('organiser', 'name email')
        .sort({ startTime: 1 }),
      Booking.find({
        bookingDate: { $gt: todayStr },
        status: BOOKING_STATUS.APPROVED
      })
        .populate('venue', 'name location')
        .populate('organiser', 'name email')
        .sort({ bookingDate: 1, startTime: 1 })
        .limit(5),
      Booking.countDocuments({ status: BOOKING_STATUS.COMPLETED }),
      Booking.countDocuments({ status: BOOKING_STATUS.CANCELLED }),
      Booking.aggregate([
        { $match: { status: BOOKING_STATUS.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Booking.find()
        .populate('venue', 'name')
        .populate('organiser', 'name')
        .sort({ updatedAt: -1 })
        .limit(8)
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    const pendingCount = await Booking.countDocuments({ status: BOOKING_STATUS.PENDING });
    const upcomingCount = await Booking.countDocuments({
      bookingDate: { $gt: todayStr },
      status: BOOKING_STATUS.APPROVED
    });

    return {
      stats: {
        totalVenues,
        activeVenues,
        todayEventsCount: todayEvents.length,
        pendingCount,
        upcomingCount,
        completedCount: completedEventsCount,
        cancelledCount: cancelledEventsCount,
        totalRevenue
      },
      todayEvents,
      pendingRequests,
      upcomingEvents,
      recentActivity
    };
  }

  /**
   * Generates Revenue analytics and breakdown
   * @param {number} days - Period in days (default 30)
   */
  static async getRevenueAnalytics(days = 30) {
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // 1. Total revenue (completed events)
    const totalRevAgg = await Booking.aggregate([
      { $match: { status: BOOKING_STATUS.COMPLETED } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = totalRevAgg.length > 0 ? totalRevAgg[0].total : 0;

    // 2. Revenue this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthRevAgg = await Booking.aggregate([
      {
        $match: {
          status: BOOKING_STATUS.COMPLETED,
          bookingDate: { $gte: startOfMonth }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const monthRevenue = monthRevAgg.length > 0 ? monthRevAgg[0].total : 0;

    // 3. Revenue by venue
    const venueRevAgg = await Booking.aggregate([
      { $match: { status: BOOKING_STATUS.COMPLETED } },
      {
        $group: {
          _id: '$venue',
          completedBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          totalHours: { $sum: '$durationHours' }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Populate venue details
    const populatedVenueRev = await Venue.populate(venueRevAgg, { path: '_id', select: 'name location hourlyRate' });
    const revenueByVenue = populatedVenueRev.map((item) => ({
      venueId: item._id?._id,
      venueName: item._id ? item._id.name : 'Unknown Venue',
      location: item._id ? item._id.location : '',
      hourlyRate: item._id ? item._id.hourlyRate : 0,
      completedBookings: item.completedBookings,
      totalRevenue: item.totalRevenue,
      totalHours: Number(item.totalHours.toFixed(1))
    }));

    // 4. Recent completed events
    const recentCompleted = await Booking.find({ status: BOOKING_STATUS.COMPLETED })
      .populate('venue', 'name')
      .populate('organiser', 'name')
      .sort({ completedAt: -1, updatedAt: -1 })
      .limit(10);

    return {
      totalRevenue,
      monthRevenue,
      revenueByVenue,
      recentCompleted
    };
  }

  /**
   * Calculates venue utilisation statistics based on:
   * Utilisation % = (Completed/Approved Booked Hours in Period) / (Operating Hours per Day [14] * Days in Period) * 100
   * @param {number} days - Evaluation period (default 30 days)
   */
  static async getVenueUtilisationAnalytics(days = 30) {
    const venues = await Venue.find();
    const operatingHoursPerDay = OPERATING_HOURS.HOURS_PER_DAY; // 14 hours (08:00 to 22:00)
    const totalAvailableHours = operatingHoursPerDay * days;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Aggregate booked hours for approved and completed bookings within the period
    const bookedHoursAgg = await Booking.aggregate([
      {
        $match: {
          status: { $in: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.COMPLETED] },
          bookingDate: { $gte: startDateStr }
        }
      },
      {
        $group: {
          _id: '$venue',
          eventCount: { $sum: 1 },
          bookedHours: { $sum: '$durationHours' }
        }
      }
    ]);

    const bookedHoursMap = {};
    bookedHoursAgg.forEach((item) => {
      bookedHoursMap[item._id.toString()] = {
        eventCount: item.eventCount,
        bookedHours: item.bookedHours
      };
    });

    let totalSystemBookedHours = 0;
    const utilisationData = venues.map((venue) => {
      const stats = bookedHoursMap[venue._id.toString()] || { eventCount: 0, bookedHours: 0 };
      const bookedHours = Number(stats.bookedHours.toFixed(1));
      totalSystemBookedHours += bookedHours;
      const utilisationPercent = Number(((bookedHours / totalAvailableHours) * 100).toFixed(1));

      return {
        venueId: venue._id,
        venueName: venue.name,
        location: venue.location,
        capacity: venue.capacity,
        status: venue.status,
        eventCount: stats.eventCount,
        bookedHours,
        availableHours: totalAvailableHours,
        utilisationPercent: Math.min(utilisationPercent, 100) // Cap at 100% for reporting
      };
    });

    const totalSystemAvailableHours = totalAvailableHours * (venues.length || 1);
    const overallUtilisation = Number(((totalSystemBookedHours / totalSystemAvailableHours) * 100).toFixed(1));

    return {
      days,
      operatingHoursPerDay,
      overallUtilisation: Math.min(overallUtilisation, 100),
      venues: utilisationData
    };
  }
}

module.exports = DashboardService;
