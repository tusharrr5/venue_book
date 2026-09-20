const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middleware/auth');

// Public Landing Page
router.get('/', DashboardController.home);

// Organiser Dashboard
router.get('/dashboard', isAuthenticated, DashboardController.organiserDashboard);

module.exports = router;
