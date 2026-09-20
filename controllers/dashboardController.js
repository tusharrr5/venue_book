const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const DashboardService = require('../services/dashboardService');
const { BOOKING_STATUS, VENUE_STATUS } = require('../utils/constants');
const { formatDateDisplay, formatCurrency, getTodayDateString } = require('../utils/helpers');

/**
 * Controller for Landing Page, Dashboards, and Reports
 */
class DashboardController {
  static async home(req, res, next) {
    try {
      const [featuredVenues, venueCount, completedEventCount] = await Promise.all([
        Venue.find({ status: VENUE_STATUS.ACTIVE }).limit(6),
        Venue.countDocuments({ status: VENUE_STATUS.ACTIVE }),
        Booking.countDocuments({ status: BOOKING_STATUS.COMPLETED })
      ]);

      res.render('home', {
        title: 'VenueHub - Campus Event & Venue Booking Management',
        featuredVenues,
        stats: {
          venueCount,
          completedEventCount
        },
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async organiserDashboard(req, res, next) {
    try {
      const organiserId = req.session.user._id;
      const data = await DashboardService.getOrganiserDashboardData(organiserId);

      res.render('organiser/dashboard', {
        title: 'Organiser Dashboard - VenueHub',
        stats: data.stats,
        recentBookings: data.recentBookings,
        formatDateDisplay,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminDashboard(req, res, next) {
    try {
      const data = await DashboardService.getAdminDashboardData();

      res.render('admin/dashboard', {
        title: 'Admin Command Center - VenueHub',
        stats: data.stats,
        todayEvents: data.todayEvents,
        pendingRequests: data.pendingRequests,
        upcomingEvents: data.upcomingEvents,
        recentActivity: data.recentActivity,
        formatDateDisplay,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminReports(req, res, next) {
    try {
      const days = Number(req.query.days) || 30;

      const [revenueData, utilisationData] = await Promise.all([
        DashboardService.getRevenueAnalytics(days),
        DashboardService.getVenueUtilisationAnalytics(days)
      ]);

      res.render('admin/reports/index', {
        title: 'Analytics & Utilisation Reports - Admin',
        selectedDays: days,
        revenue: revenueData,
        utilisation: utilisationData,
        formatDateDisplay,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminTodayEvents(req, res, next) {
    try {
      const todayStr = getTodayDateString();
      const events = await Booking.find({
        bookingDate: todayStr,
        status: { $in: [BOOKING_STATUS.APPROVED, BOOKING_STATUS.COMPLETED] }
      })
        .populate('venue', 'name location')
        .populate('organiser', 'name email')
        .sort({ startTime: 1 });

      res.render('admin/events/today', {
        title: "Today's Events Schedule - Admin",
        events,
        todayStr,
        formatDateDisplay
      });
    } catch (error) {
      next(error);
    }
  }

  static async adminUpcomingEvents(req, res, next) {
    try {
      const todayStr = getTodayDateString();
      const { venueId, date, organiser } = req.query;

      const query = {
        bookingDate: { $gt: todayStr },
        status: BOOKING_STATUS.APPROVED
      };

      if (venueId) query.venue = venueId;
      if (date) query.bookingDate = date;

      let events = await Booking.find(query)
        .populate('venue', 'name location')
        .populate('organiser', 'name email')
        .sort({ bookingDate: 1, startTime: 1 });

      if (organiser && organiser.trim()) {
        const regex = new RegExp(organiser.trim(), 'i');
        events = events.filter((e) => e.organiser && (regex.test(e.organiser.name) || regex.test(e.organiser.email)));
      }

      const venues = await Venue.find().select('name');

      res.render('admin/events/upcoming', {
        title: 'Upcoming Approved Events - Admin',
        events,
        venues,
        filters: {
          venueId: venueId || '',
          date: date || '',
          organiser: organiser || ''
        },
        formatDateDisplay
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DashboardController;
