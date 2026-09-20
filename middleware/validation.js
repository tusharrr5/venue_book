const { body, param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Middleware to check validation results and handle errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
    req.flash('error', errorMessages.join('. '));
    // Provide old input back to the user
    req.flash('oldInput', req.body);
    return res.redirect(req.header('Referer') || '/');
  }
  next();
};

// Validate Mongo ObjectId in params
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      req.flash('error', 'Resource not found or invalid identifier.');
      return res.status(404).render('errors/404', {
        title: '404 - Not Found',
        message: 'The requested resource identifier is invalid or does not exist.'
      });
    }
    next();
  };
};

// Registration validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  validate
];

// Login validation rules
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please enter a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  validate
];

// Venue validation rules
const venueValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Venue name is required')
    .isLength({ max: 120 })
    .withMessage('Venue name cannot exceed 120 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Venue description is required'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('capacity')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer greater than 0'),
  body('hourlyRate')
    .isFloat({ min: 0 })
    .withMessage('Hourly rate cannot be negative'),
  validate
];

// Booking validation rules
const bookingValidation = [
  body('eventName')
    .trim()
    .notEmpty()
    .withMessage('Event name is required')
    .isLength({ max: 150 })
    .withMessage('Event name cannot exceed 150 characters'),
  body('eventDescription')
    .trim()
    .notEmpty()
    .withMessage('Event description is required'),
  body('expectedAttendees')
    .isInt({ min: 1 })
    .withMessage('Expected attendees must be a positive integer'),
  body('bookingDate')
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('Please provide a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(value);
      if (selected < today) {
        throw new Error('Booking date cannot be in the past');
      }
      return true;
    }),
  body('startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:MM format')
    .custom((value, { req }) => {
      if (value <= req.body.startTime) {
        throw new Error('End time must be strictly after start time');
      }
      return true;
    }),
  validate
];

// VenueBlock validation rules
const venueBlockValidation = [
  body('venue')
    .isMongoId()
    .withMessage('Valid venue is required'),
  body('date')
    .isDate({ format: 'YYYY-MM-DD' })
    .withMessage('Please provide a valid date'),
  body('startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:MM format')
    .custom((value, { req }) => {
      if (value <= req.body.startTime) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason for maintenance block is required'),
  validate
];

module.exports = {
  validateObjectId,
  registerValidation,
  loginValidation,
  venueValidation,
  bookingValidation,
  venueBlockValidation
};
