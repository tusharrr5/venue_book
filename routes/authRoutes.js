const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const AuthController = require('../controllers/authController');
const { isGuest, isAuthenticated } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');

// Rate limiter for authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 25, // limit each IP to 25 requests per windowMs
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
});

// Login
router.get('/login', isGuest, AuthController.getLogin);
router.post('/login', isGuest, authLimiter, loginValidation, AuthController.postLogin);

// Register
router.get('/register', isGuest, AuthController.getRegister);
router.post('/register', isGuest, authLimiter, registerValidation, AuthController.postRegister);

// Logout
router.post('/logout', isAuthenticated, AuthController.postLogout);

module.exports = router;
