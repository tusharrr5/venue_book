const Venue = require('../models/Venue');
const AvailabilityService = require('./availabilityService');
const { VENUE_STATUS, OPERATING_HOURS } = require('../utils/constants');
const { timeToMinutes, minutesToTime, calculateDurationHours } = require('../utils/helpers');

/**
 * Service to suggest alternative venues and time slots when a requested slot is unavailable
 */
class SuggestionService {
  /**
   * Suggests alternative venues that are available for the requested slot
   * and meet capacity & facility requirements.
   *
   * @param {object} params
   * @param {string} params.currentVenueId
   * @param {string} params.date - "YYYY-MM-DD"
   * @param {string} params.startTime - "HH:MM"
   * @param {string} params.endTime - "HH:MM"
   * @param {number} params.expectedAttendees
   * @param {Array<string>} [params.requiredFacilities=[]]
   * @returns {Promise<Array<object>>} Ranked list of alternative venues
   */
  static async suggestAlternativeVenues({
    currentVenueId,
    date,
    startTime,
    endTime,
    expectedAttendees,
    requiredFacilities = []
  }) {
    const attendees = Number(expectedAttendees) || 1;

    // Find candidate venues
    const candidateQuery = {
      _id: { $ne: currentVenueId },
      status: VENUE_STATUS.ACTIVE,
      capacity: { $gte: attendees }
    };

    if (requiredFacilities.length > 0) {
      candidateQuery.facilities = { $all: requiredFacilities };
    }

    const candidates = await Venue.find(candidateQuery);
    const availableAlternatives = [];

    for (const venue of candidates) {
      const check = await AvailabilityService.checkVenueAvailability(
        venue._id,
        date,
        startTime,
        endTime,
        null,
        true
      );

      if (check.available) {
        // Calculate ranking score
        const capacityDiff = venue.capacity - attendees;
        const facilityScore = venue.facilities.filter((f) => requiredFacilities.includes(f)).length;
        const durationHours = calculateDurationHours(startTime, endTime);
        const estimatedAmount = Math.round(durationHours * venue.hourlyRate);

        availableAlternatives.push({
          venue,
          capacityDiff,
          facilityScore,
          estimatedAmount
        });
      }
    }

    // Sort by: 1. Smallest excess capacity, 2. Facility count (desc), 3. Hourly rate (asc)
    availableAlternatives.sort((a, b) => {
      if (a.capacityDiff !== b.capacityDiff) return a.capacityDiff - b.capacityDiff;
      if (b.facilityScore !== a.facilityScore) return b.facilityScore - a.facilityScore;
      return a.venue.hourlyRate - b.venue.hourlyRate;
    });

    return availableAlternatives.slice(0, 5).map((item) => ({
      ...item.venue.toObject(),
      estimatedAmount: item.estimatedAmount,
      capacityDiff: item.capacityDiff
    }));
  }

  /**
   * Suggests alternative time slots for the SAME venue on the requested date.
   *
   * @param {object} params
   * @param {string} params.venueId
   * @param {string} params.date - "YYYY-MM-DD"
   * @param {string} params.startTime - "HH:MM"
   * @param {string} params.endTime - "HH:MM"
   * @returns {Promise<Array<{ startTime: string, endTime: string, label: string }>>}
   */
  static async suggestAlternativeTimeSlots({ venueId, date, startTime, endTime }) {
    const durationMinutes = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (durationMinutes <= 0) return [];

    const opStartMins = timeToMinutes(OPERATING_HOURS.START); // 08:00 (480)
    const opEndMins = timeToMinutes(OPERATING_HOURS.END);     // 22:00 (1320)
    const requestedStartMins = timeToMinutes(startTime);

    const candidateSlots = [];

    // Check slots starting at 1-hour intervals across the operating hours
    for (let currentStart = opStartMins; currentStart + durationMinutes <= opEndMins; currentStart += 60) {
      // Don't test the exact requested slot
      if (currentStart === requestedStartMins) continue;

      const currentEnd = currentStart + durationMinutes;
      const slotStart = minutesToTime(currentStart);
      const slotEnd = minutesToTime(currentEnd);

      const check = await AvailabilityService.checkVenueAvailability(
        venueId,
        date,
        slotStart,
        slotEnd,
        null,
        true
      );

      if (check.available) {
        // Compute distance from original requested time for relevance ranking
        const distanceFromOriginal = Math.abs(currentStart - requestedStartMins);
        candidateSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          distanceFromOriginal,
          durationHours: Number((durationMinutes / 60).toFixed(2))
        });
      }
    }

    // Sort by closest to original requested time
    candidateSlots.sort((a, b) => a.distanceFromOriginal - b.distanceFromOriginal);

    return candidateSlots.slice(0, 4).map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      durationHours: slot.durationHours
    }));
  }
}

module.exports = SuggestionService;
