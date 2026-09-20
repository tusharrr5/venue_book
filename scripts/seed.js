require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Booking = require('../models/Booking');
const VenueBlock = require('../models/VenueBlock');
const { ROLES, BOOKING_STATUS, VENUE_STATUS, FACILITIES } = require('../utils/constants');
const { getTodayDateString, calculateDurationHours } = require('../utils/helpers');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/venue_booking_db';
    console.log(`[Seed Script]: Connecting to ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('[Seed Script]: Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Venue.deleteMany({}),
      Booking.deleteMany({}),
      VenueBlock.deleteMany({})
    ]);

    console.log('[Seed Script]: Seeding Users...');
    // Note: User.save triggers the pre-save hook to hash password with bcrypt!
    const adminUser = new User({
      name: 'Campus Administrator',
      email: 'admin@campus.edu',
      password: 'Admin@123',
      role: ROLES.ADMIN
    });
    await adminUser.save();

    const organiser1 = new User({
      name: 'Computer Science Society',
      email: 'csclub@campus.edu',
      password: 'Organiser@123',
      role: ROLES.ORGANISER
    });
    await organiser1.save();

    const organiser2 = new User({
      name: 'Cultural & Music Committee',
      email: 'music@campus.edu',
      password: 'Organiser@123',
      role: ROLES.ORGANISER
    });
    await organiser2.save();

    const organiser3 = new User({
      name: 'Campus Sports Union',
      email: 'sports@campus.edu',
      password: 'Organiser@123',
      role: ROLES.ORGANISER
    });
    await organiser3.save();

    console.log('[Seed Script]: Seeding Venues...');
    const venuesData = [
      {
        name: 'Main Auditorium',
        description: 'Premier campus auditorium equipped with acoustic treatment, stage lighting, high-fidelity sound, and tiered balcony seating. Ideal for convocation ceremonies, keynote summits, and grand cultural fests.',
        location: 'Central Administrative Complex, North Wing',
        capacity: 800,
        facilities: [
          'Projector',
          'Wi-Fi',
          'Air Conditioning',
          'Sound System',
          'Stage',
          'Microphones',
          'Parking',
          'Seating',
          'Generator / Power Backup'
        ],
        hourlyRate: 5000,
        status: VENUE_STATUS.ACTIVE,
        imageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Seminar Hall A',
        description: 'Modern academic seminar room with tiered executive seating, dual high-definition laser projectors, and collar microphones. Suited for guest lectures, faculty seminars, and academic defenses.',
        location: 'Science & Technology Block, 2nd Floor',
        capacity: 150,
        facilities: [
          'Projector',
          'Wi-Fi',
          'Air Conditioning',
          'Sound System',
          'Microphones',
          'Whiteboard',
          'Seating'
        ],
        hourlyRate: 1500,
        status: VENUE_STATUS.ACTIVE,
        imageUrl: 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Seminar Hall B',
        description: 'Spacious lecture and conference hall with flexible theatre seating, surround audio, and robust Wi-Fi connectivity for interactive workshops.',
        location: 'Management Studies Block, Ground Floor',
        capacity: 180,
        facilities: [
          'Projector',
          'Wi-Fi',
          'Air Conditioning',
          'Sound System',
          'Whiteboard',
          'Seating'
        ],
        hourlyRate: 1800,
        status: VENUE_STATUS.ACTIVE,
        imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Innovation & Robotics Lab',
        description: 'Collaborative makerspace equipped with high-speed internet, workbench power drops, presentation displays, and whiteboards for hackathons and technical sprints.',
        location: 'Engineering Hub, 3rd Floor',
        capacity: 60,
        facilities: [
          'Wi-Fi',
          'Projector',
          'Air Conditioning',
          'Whiteboard',
          'Generator / Power Backup'
        ],
        hourlyRate: 1000,
        status: VENUE_STATUS.ACTIVE,
        imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Executive Conference Room',
        description: 'Premium boardroom featuring executive leather seating, video-conferencing smart screen, and conference calling equipment.',
        location: 'Senate Building, 4th Floor',
        capacity: 35,
        facilities: [
          'Projector',
          'Wi-Fi',
          'Air Conditioning',
          'Whiteboard',
          'Seating'
        ],
        hourlyRate: 800,
        status: VENUE_STATUS.ACTIVE,
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Open Air Amphitheatre',
        description: 'Large outdoor amphitheatre surrounded by lush green lawns with an elevated concrete performance stage. Ideal for university festivals, musical concerts, and street plays.',
        location: 'Student Activity Center Grounds',
        capacity: 1200,
        facilities: [
          'Stage',
          'Sound System',
          'Microphones',
          'Parking',
          'Generator / Power Backup',
          'Seating'
        ],
        hourlyRate: 3500,
        status: VENUE_STATUS.ACTIVE,
        imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Multipurpose Exhibition Hall',
        description: 'Expansive open floor suitable for science fairs, project exhibitions, campus placement drives, and blood donation camps.',
        location: 'East Campus Sports & Arts Complex',
        capacity: 350,
        facilities: [
          'Sound System',
          'Stage',
          'Air Conditioning',
          'Parking',
          'Seating',
          'Generator / Power Backup'
        ],
        hourlyRate: 2500,
        status: VENUE_STATUS.ACTIVE,
        imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'
      },
      {
        name: 'Indoor Sports Arena',
        description: 'Wooden floor multipurpose sports arena suitable for badminton, basketball, table tennis, and indoor sports tournaments.',
        location: 'Physical Education Center',
        capacity: 500,
        facilities: [
          'Parking',
          'Seating',
          'Generator / Power Backup',
          'Sound System'
        ],
        hourlyRate: 2000,
        status: VENUE_STATUS.INACTIVE, // example inactive venue for testing
        imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80'
      }
    ];

    const venues = await Venue.insertMany(venuesData);
    const [auditorium, hallA, hallB, innovationLab, confRoom, amphitheatre, multiHall] = venues;

    console.log('[Seed Script]: Seeding Bookings & Blocks...');
    const today = new Date();
    const todayStr = getTodayDateString();

    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const dayAfter = new Date();
    dayAfter.setDate(today.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];

    const pastDate1 = new Date();
    pastDate1.setDate(today.getDate() - 5);
    const pastDate1Str = pastDate1.toISOString().split('T')[0];

    const pastDate2 = new Date();
    pastDate2.setDate(today.getDate() - 12);
    const pastDate2Str = pastDate2.toISOString().split('T')[0];

    const bookingsData = [
      // 1. Completed Bookings in the past (Generates revenue & utilisation!)
      {
        organiser: organiser1._id,
        venue: auditorium._id,
        eventName: 'National Tech Symposium 2026',
        eventDescription: 'Keynotes from distinguished AI researchers and panel discussions.',
        expectedAttendees: 650,
        bookingDate: pastDate2Str,
        startTime: '09:00',
        endTime: '17:00',
        durationHours: 8,
        totalAmount: 8 * auditorium.hourlyRate, // 40,000
        status: BOOKING_STATUS.COMPLETED,
        approvedBy: adminUser._id,
        approvedAt: new Date(pastDate2.getTime() - 86400000 * 3),
        completedAt: new Date(pastDate2.getTime() + 3600000 * 18)
      },
      {
        organiser: organiser2._id,
        venue: hallA._id,
        eventName: 'Inter-College Debate Championship',
        eventDescription: 'Annual parliamentary debate tournament across 16 colleges.',
        expectedAttendees: 120,
        bookingDate: pastDate1Str,
        startTime: '10:00',
        endTime: '14:00',
        durationHours: 4,
        totalAmount: 4 * hallA.hourlyRate, // 6,000
        status: BOOKING_STATUS.COMPLETED,
        approvedBy: adminUser._id,
        approvedAt: new Date(pastDate1.getTime() - 86400000 * 2),
        completedAt: new Date(pastDate1.getTime() + 3600000 * 15)
      },
      {
        organiser: organiser1._id,
        venue: innovationLab._id,
        eventName: 'Autonomous Drones Hackathon',
        eventDescription: '24-hour rapid prototyping hackathon on embedded systems.',
        expectedAttendees: 50,
        bookingDate: pastDate1Str,
        startTime: '09:00',
        endTime: '15:00',
        durationHours: 6,
        totalAmount: 6 * innovationLab.hourlyRate, // 6,000
        status: BOOKING_STATUS.COMPLETED,
        approvedBy: adminUser._id,
        approvedAt: new Date(pastDate1.getTime() - 86400000 * 2),
        completedAt: new Date(pastDate1.getTime() + 3600000 * 16)
      },

      // 2. Today's Events (Approved & Scheduled)
      {
        organiser: organiser1._id,
        venue: hallA._id,
        eventName: 'AI/ML Campus Workshop',
        eventDescription: 'Hands-on coding workshop exploring transformer architectures.',
        expectedAttendees: 140,
        bookingDate: todayStr,
        startTime: '10:00',
        endTime: '13:00',
        durationHours: 3,
        totalAmount: 3 * hallA.hourlyRate, // 4,500
        status: BOOKING_STATUS.APPROVED,
        approvedBy: adminUser._id,
        approvedAt: new Date()
      },
      {
        organiser: organiser2._id,
        venue: multiHall._id,
        eventName: 'Campus Classical Music Recital',
        eventDescription: 'Evening classical instrumental fusion concert featuring student artists.',
        expectedAttendees: 250,
        bookingDate: todayStr,
        startTime: '16:00',
        endTime: '19:00',
        durationHours: 3,
        totalAmount: 3 * multiHall.hourlyRate, // 7,500
        status: BOOKING_STATUS.APPROVED,
        approvedBy: adminUser._id,
        approvedAt: new Date()
      },

      // 3. Upcoming Approved Bookings
      {
        organiser: organiser3._id,
        venue: amphitheatre._id,
        eventName: 'University Cultural Night',
        eventDescription: 'Music festival and live stage performances by campus bands.',
        expectedAttendees: 900,
        bookingDate: tomorrowStr,
        startTime: '17:00',
        endTime: '21:00',
        durationHours: 4,
        totalAmount: 4 * amphitheatre.hourlyRate, // 14,000
        status: BOOKING_STATUS.APPROVED,
        approvedBy: adminUser._id,
        approvedAt: new Date()
      },
      {
        organiser: organiser1._id,
        venue: confRoom._id,
        eventName: 'Tech Society Executive Committee Meeting',
        eventDescription: 'Semester roadmap planning and budget approvals.',
        expectedAttendees: 25,
        bookingDate: dayAfterStr,
        startTime: '14:00',
        endTime: '16:00',
        durationHours: 2,
        totalAmount: 2 * confRoom.hourlyRate, // 1,600
        status: BOOKING_STATUS.APPROVED,
        approvedBy: adminUser._id,
        approvedAt: new Date()
      },

      // 4. Pending Booking Requests (For Admin Review testing)
      {
        organiser: organiser2._id,
        venue: hallB._id,
        eventName: 'Acoustic Jam Session & Auditions',
        eventDescription: 'Auditions for upcoming campus annual musical production.',
        expectedAttendees: 90,
        bookingDate: tomorrowStr,
        startTime: '11:00',
        endTime: '14:00',
        durationHours: 3,
        totalAmount: 3 * hallB.hourlyRate, // 5,400
        status: BOOKING_STATUS.PENDING
      },
      {
        organiser: organiser1._id,
        venue: auditorium._id,
        eventName: 'Cybersecurity Global Awareness Day',
        eventDescription: 'Ethical hacking demonstrations and guest keynote.',
        expectedAttendees: 500,
        bookingDate: dayAfterStr,
        startTime: '10:00',
        endTime: '13:00',
        durationHours: 3,
        totalAmount: 3 * auditorium.hourlyRate, // 15,000
        status: BOOKING_STATUS.PENDING
      },

      // 5. Cancelled & Rejected Bookings
      {
        organiser: organiser3._id,
        venue: hallA._id,
        eventName: 'Intramural Chess Championship',
        eventDescription: 'Indoor chess competition.',
        expectedAttendees: 60,
        bookingDate: pastDate1Str,
        startTime: '15:00',
        endTime: '18:00',
        durationHours: 3,
        totalAmount: 3 * hallA.hourlyRate,
        status: BOOKING_STATUS.CANCELLED,
        cancelledAt: new Date(pastDate1.getTime() - 86400000),
        cancellationReason: 'Rescheduled due to college exams.'
      },
      {
        organiser: organiser2._id,
        venue: confRoom._id,
        eventName: 'Private Movie Screening',
        eventDescription: 'Informal student movie night.',
        expectedAttendees: 30,
        bookingDate: pastDate2Str,
        startTime: '18:00',
        endTime: '21:00',
        durationHours: 3,
        totalAmount: 3 * confRoom.hourlyRate,
        status: BOOKING_STATUS.REJECTED,
        adminRemarks: 'Conference room cannot be booked for non-academic screenings.'
      }
    ];

    await Booking.insertMany(bookingsData);

    // 6. Maintenance Blocks
    const blocksData = [
      {
        venue: auditorium._id,
        date: tomorrowStr,
        startTime: '08:00',
        endTime: '12:00',
        reason: 'Acoustic Sound System Maintenance & Equalizer Tuning',
        createdBy: adminUser._id
      },
      {
        venue: innovationLab._id,
        date: dayAfterStr,
        startTime: '13:00',
        endTime: '17:00',
        reason: '3D Printer & Server Rack Maintenance',
        createdBy: adminUser._id
      }
    ];

    await VenueBlock.insertMany(blocksData);

    console.log('[Seed Script]: Database seeded successfully!');
    console.log('----------------------------------------------------');
    console.log('Admin Account:      admin@campus.edu / Admin@123');
    console.log('Organiser Account:  csclub@campus.edu / Organiser@123');
    console.log('Organiser Account:  music@campus.edu / Organiser@123');
    console.log('Organiser Account:  sports@campus.edu / Organiser@123');
    console.log('----------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Script Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
