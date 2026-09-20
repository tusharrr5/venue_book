const Venue = require('../models/Venue');
const AvailabilityService = require('./../services/availabilityService');
const { FACILITIES, VENUE_STATUS } = require('../utils/constants');
const { getTodayDateString, formatDateDisplay, formatCurrency } = require('../utils/helpers');

/**
 * Controller for Venue discovery and public/organiser views
 */
class VenueController {
  static async index(req, res, next) {
    try {
      const { search, minCapacity, maxCapacity, maxRate } = req.query;
      let facilitiesFilter = req.query.facilities;

      if (facilitiesFilter && !Array.isArray(facilitiesFilter)) {
        facilitiesFilter = [facilitiesFilter];
      }

      const query = { status: VENUE_STATUS.ACTIVE };

      // Text search on name, description, or location
      if (search && search.trim()) {
        query.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { location: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } }
        ];
      }

      // Capacity filter
      if (minCapacity || maxCapacity) {
        query.capacity = {};
        if (minCapacity) query.capacity.$gte = Number(minCapacity);
        if (maxCapacity) query.capacity.$lte = Number(maxCapacity);
      }

      // Max hourly rate filter
      if (maxRate) {
        query.hourlyRate = { $lte: Number(maxRate) };
      }

      // Multi-facility filter (All selected must be present)
      if (facilitiesFilter && facilitiesFilter.length > 0) {
        query.facilities = { $all: facilitiesFilter };
      }

      const venues = await Venue.find(query).sort({ capacity: -1 });

      res.render('venues/index', {
        title: 'Discover Campus Venues - VenueHub',
        venues,
        allFacilities: FACILITIES,
        selectedFacilities: facilitiesFilter || [],
        filters: {
          search: search || '',
          minCapacity: minCapacity || '',
          maxCapacity: maxCapacity || '',
          maxRate: maxRate || ''
        },
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }

  static async show(req, res, next) {
    try {
      const venue = await Venue.findById(req.params.id);
      if (!venue) {
        return res.status(404).render('errors/404', {
          title: 'Venue Not Found',
          message: 'The requested venue does not exist or has been removed.'
        });
      }

      // Check schedule for selected date or today
      const selectedDate = req.query.date || getTodayDateString();
      const schedule = await AvailabilityService.getVenueSchedule(venue._id, selectedDate);

      res.render('venues/show', {
        title: `${venue.name} - Venue Details`,
        venue,
        selectedDate,
        schedule,
        formatDateDisplay,
        formatCurrency
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VenueController;
