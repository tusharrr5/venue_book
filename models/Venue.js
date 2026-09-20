const mongoose = require('mongoose');
const { VENUE_STATUS, FACILITIES } = require('../utils/constants');

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
      unique: true,
      maxlength: [120, 'Venue name cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Venue description is required'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [200, 'Location cannot exceed 200 characters']
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be greater than zero']
    },
    facilities: {
      type: [String],
      default: []
    },
    hourlyRate: {
      type: Number,
      required: [true, 'Hourly rate is required'],
      min: [0, 'Hourly rate cannot be negative']
    },
    status: {
      type: String,
      enum: [VENUE_STATUS.ACTIVE, VENUE_STATUS.INACTIVE],
      default: VENUE_STATUS.ACTIVE
    },
    imageUrl: {
      type: String,
      default: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for searching and filtering
venueSchema.index({ name: 'text', description: 'text', location: 'text' });
venueSchema.index({ status: 1, capacity: 1, hourlyRate: 1 });

module.exports = mongoose.model('Venue', venueSchema);
