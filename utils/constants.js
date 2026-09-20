const FACILITIES = [
  'Projector',
  'Wi-Fi',
  'Air Conditioning',
  'Sound System',
  'Stage',
  'Microphones',
  'Parking',
  'Whiteboard',
  'Seating',
  'Generator / Power Backup'
];

const BOOKING_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

const VENUE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

const BLOCK_REASONS = [
  'Maintenance',
  'Renovation',
  'Private event',
  'Cleaning',
  'Equipment repair',
  'Administrative block'
];

const ROLES = {
  ORGANISER: 'organiser',
  ADMIN: 'admin'
};

const OPERATING_HOURS = {
  START: '08:00',
  END: '22:00',
  HOURS_PER_DAY: 14
};

module.exports = {
  FACILITIES,
  BOOKING_STATUS,
  VENUE_STATUS,
  BLOCK_REASONS,
  ROLES,
  OPERATING_HOURS
};
