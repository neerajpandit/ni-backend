/**
 * Seeds an admin user and sample approved events (aligned with frontend mockData / Events feed).
 * Usage: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Event = require('../src/models/Event.model');
const logger = require('../src/config/logger');

const SAMPLE_EVENTS = [
  {
    title: 'TechNova Hackathon',
    organizerName: 'Coding Club',
    dateDisplay: '2026-04-15',
    startDate: new Date('2026-04-15T10:00:00'),
    endDate: new Date('2026-04-16T10:00:00'),
    time: '10:00 AM',
    venue: 'Main Lab',
    category: 'Technical',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800',
    description:
      'A 24-hour sprint to build innovative solutions for campus problems.',
    registeredCount: 120,
    totalSeats: 200,
    status: 'Approved',
    feedType: 'Upcoming',
    trending: true,
  },
  {
    title: 'Sunburn Campus',
    organizerName: 'Cultural Society',
    dateDisplay: '2026-05-20',
    startDate: new Date('2026-05-20T18:00:00'),
    endDate: new Date('2026-05-20T23:00:00'),
    time: '06:00 PM',
    venue: 'Open Air Theater',
    category: 'Cultural',
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=800',
    description: 'The biggest music festival on campus featuring top DJs.',
    registeredCount: 400,
    totalSeats: 1500,
    status: 'Pending',
    feedType: 'Upcoming',
    venueConflictFlag: false,
  },
  {
    title: 'Inter-College Cricket',
    organizerName: 'Sports Dept',
    dateDisplay: '2026-04-10',
    startDate: new Date('2026-04-10T09:00:00'),
    endDate: new Date('2026-04-10T18:00:00'),
    time: '09:00 AM',
    venue: 'Cricket Ground',
    category: 'Sports',
    image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=800',
    description: 'Annual championship match between top 8 colleges.',
    registeredCount: 45,
    totalSeats: 100,
    status: 'Approved',
    feedType: 'Upcoming',
  },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'campussphere';
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }

  await mongoose.connect(uri, { dbName });

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@campussphere.local';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';

  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const hash = await User.hashPassword(adminPass);
    admin = await User.create({
      name: 'Campus Admin',
      email: adminEmail,
      passwordHash: hash,
      role: 'admin',
    });
    logger.info(`Created admin: ${adminEmail} / ${adminPass}`);
  } else {
    logger.info(`Admin already exists: ${adminEmail}`);
  }

  let org = await User.findOne({ email: 'organizer@campussphere.local' });
  if (!org) {
    const hash = await User.hashPassword('Organizer123!');
    org = await User.create({
      name: 'Demo Organizer',
      email: 'organizer@campussphere.local',
      passwordHash: hash,
      role: 'organizer',
      university: 'Bundelkhand University',
    });
    logger.info('Created demo organizer: organizer@campussphere.local');
  }

  const count = await Event.countDocuments();
  if (count === 0) {
    for (const raw of SAMPLE_EVENTS) {
      await Event.create({
        ...raw,
        organizerId: org._id,
      });
    }
    logger.info(`Inserted ${SAMPLE_EVENTS.length} sample events`);
  } else {
    logger.info('Events collection non-empty — skipping sample inserts');
  }

  await mongoose.disconnect();
  logger.info('Seed completed.');
}

run().catch((e) => {
  logger.error(e);
  process.exit(1);
});
