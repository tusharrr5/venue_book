/**
 * Helper utility functions for time, date, currency and overlap calculations
 */

/**
 * Converts "HH:MM" 24-hour string to minutes from midnight
 * @param {string} timeStr - e.g. "09:30"
 * @returns {number} minutes from midnight - e.g. 570
 */
const timeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
};

/**
 * Converts minutes from midnight to "HH:MM" 24-hour string
 * @param {number} minutes - e.g. 570
 * @returns {string} - e.g. "09:30"
 */
const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Calculates duration in hours between two HH:MM strings
 * @param {string} startTime 
 * @param {string} endTime 
 * @returns {number} hours (e.g. 2.5)
 */
const calculateDurationHours = (startTime, endTime) => {
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  if (endMins <= startMins) return 0;
  return Number(((endMins - startMins) / 60).toFixed(2));
};

/**
 * Checks if two time intervals overlap on the same date
 * Standard overlap rule: newStart < existingEnd AND newEnd > existingStart
 * @param {string} startA - "HH:MM"
 * @param {string} endA - "HH:MM"
 * @param {string} startB - "HH:MM"
 * @param {string} endB - "HH:MM"
 * @returns {boolean}
 */
const isOverlapping = (startA, endA, startB, endB) => {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);

  return aStart < bEnd && aEnd > bStart;
};

/**
 * Normalizes a date string or Date object to YYYY-MM-DD
 * @param {Date|string} date 
 * @returns {string} e.g. "2026-09-24"
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a date for display: "24 Sep 2026"
 * @param {Date|string} date 
 * @returns {string}
 */
const formatDateDisplay = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

/**
 * Format currency in Indian Rupees ₹
 * @param {number} amount 
 * @returns {string} e.g. "₹2,500"
 */
const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
};

/**
 * Returns today's date formatted as YYYY-MM-DD
 * @returns {string}
 */
const getTodayDateString = () => {
  return formatDate(new Date());
};

module.exports = {
  timeToMinutes,
  minutesToTime,
  calculateDurationHours,
  isOverlapping,
  formatDate,
  formatDateDisplay,
  formatCurrency,
  getTodayDateString
};
