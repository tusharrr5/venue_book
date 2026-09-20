const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('../utils/constants');

const bookingSchema = new mongoose.Schema(
  {
    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organiser is required']
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue is required']
    },
    eventName: {
      type: String,
      required: [true, 'Event name is required'],
      trim: true,
      maxlength: [150, 'Event name cannot exceed 150 characters']
    },
    eventDescription: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
      maxlength: [1000, 'Event description cannot exceed 1000 characters']
    },
    expectedAttendees: {
      type: Number,
      required: [true, 'Expected attendees is required'],
      min: [1, 'Expected attendees must be at least 1']
    },
    bookingDate: {
      type: String, // Stored as normalized "YYYY-MM-DD"
      required: [true, 'Booking date is required']
    },
    startTime: {
      type: String, // Stored as "HH:MM" 24-hour format
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String, // Stored as "HH:MM" 24-hour format
      required: [true, 'End time is required']
    },
    durationHours: {
      type: Number,
      required: [true, 'Duration in hours is required'],
      min: [0.1, 'Duration must be positive']
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative']
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING
    },
    adminRemarks: {
      type: String,
      default: ''
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Crucial compound indexes for conflict detection and fast dashboard queries
bookingSchema.index({ venue: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ organiser: 1, createdAt: -1 });
bookingSchema.index({ bookingDate: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
