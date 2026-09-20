const mongoose = require('mongoose');

const venueBlockSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue is required']
    },
    date: {
      type: String, // Stored as "YYYY-MM-DD"
      required: [true, 'Block date is required']
    },
    startTime: {
      type: String, // Stored as "HH:MM"
      required: [true, 'Start time is required']
    },
    endTime: {
      type: String, // Stored as "HH:MM"
      required: [true, 'End time is required']
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      maxlength: [200, 'Reason cannot exceed 200 characters']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

venueBlockSchema.index({ venue: 1, date: 1 });

module.exports = mongoose.model('VenueBlock', venueBlockSchema);
