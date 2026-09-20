const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const DashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/auth');
const { isAdmin } = require('../middleware/role');
const {
  venueValidation,
  venueBlockValidation,
  validateObjectId
} = require('../middleware/validation');

// Guard all admin routes with authentication and admin role check
router.use(isAuthenticated, isAdmin);

// Admin Command Center Dashboard
router.get('/', (req, res) => res.redirect('/admin/dashboard'));
router.get('/dashboard', DashboardController.adminDashboard);

// Admin Reports & Utilisation Analytics
router.get('/reports', DashboardController.adminReports);

// Admin Today & Upcoming Events
router.get('/events/today', DashboardController.adminTodayEvents);
router.get('/events/upcoming', DashboardController.adminUpcomingEvents);

// Venue Management CRUD
router.get('/venues', AdminController.listVenues);
router.get('/venues/new', AdminController.getNewVenue);
router.post('/venues', venueValidation, AdminController.postNewVenue);
router.get('/venues/:id/edit', validateObjectId('id'), AdminController.getEditVenue);
router.put('/venues/:id', validateObjectId('id'), venueValidation, AdminController.putEditVenue);
router.post('/venues/:id/toggle-status', validateObjectId('id'), AdminController.toggleVenueStatus);
router.delete('/venues/:id', validateObjectId('id'), AdminController.deleteVenue);

// Booking Requests & Approvals
router.get('/bookings', AdminController.listBookings);
router.get('/bookings/:id', validateObjectId('id'), AdminController.showBooking);
router.post('/bookings/:id/approve', validateObjectId('id'), AdminController.approveBooking);
router.post('/bookings/:id/reject', validateObjectId('id'), AdminController.rejectBooking);
router.post('/bookings/:id/complete', validateObjectId('id'), AdminController.completeBooking);

// Venue Maintenance Blocks
router.get('/blocks', AdminController.listBlocks);
router.post('/blocks', venueBlockValidation, AdminController.postCreateBlock);
router.delete('/blocks/:id', validateObjectId('id'), AdminController.deleteBlock);

module.exports = router;
