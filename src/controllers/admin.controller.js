const Event = require('../models/Event.model');
const User = require('../models/User.model');
const Registration = require('../models/Registration.model');
const logger = require('../config/logger');
const { validationResult } = require('express-validator');
const { mapEvent } = require('./event.controller');

async function stats(req, res) {
  try {
    const [totalUsers, students, organizers, pendingEvents, approvedEvents, registrations] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'organizer' }),
      Event.countDocuments({ status: 'Pending' }),
      Event.countDocuments({ status: 'Approved', feedType: { $in: ['Upcoming', 'Live'] } }),
      Registration.countDocuments(),
    ]);

    res.json({
      stats: {
        totalUsers,
        totalStudents: students,
        totalOrganizers: organizers,
        pendingApprovals: pendingEvents,
        upcomingApprovedEvents: approvedEvents,
        totalRegistrations: registrations,
      },
    });
  } catch (err) {
    logger.error(`admin.stats: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to load stats' });
  }
}

async function pendingEvents(req, res) {
  try {
    const docs = await Event.find({ status: 'Pending' }).sort({ createdAt: -1 }).limit(100).exec();

    const mapped = docs.map((e) => ({
      id: e._id.toString(),
      name: e.title,
      organizer: e.organizerName || '',
      organizerId: e.organizerId?.toString(),
      date: e.dateDisplay || (e.startDate ? new Date(e.startDate).toISOString().slice(0, 10) : ''),
      venue: e.venue,
      conflict: Boolean(e.venueConflictFlag),
    }));

    res.json({ queue: mapped });
  } catch (err) {
    logger.error(`admin.pendingEvents: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to load pending events' });
  }
}

async function listAllEvents(req, res) {
  try {
    const { status, feedType } = req.query;
    const filter = {};
    if (status && ['Pending', 'Approved', 'Rejected'].includes(status)) {
      filter.status = status;
    }
    if (feedType && ['Upcoming', 'Live', 'Completed'].includes(feedType)) {
      filter.feedType = feedType;
    }
    const docs = await Event.find(filter).sort({ startDate: -1, createdAt: -1 }).limit(400).exec();
    res.json({ events: docs.map(mapEvent) });
  } catch (err) {
    logger.error(`admin.listAllEvents: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to list events' });
  }
}

async function setEventStatus(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { status } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.status = status;
    await event.save();

    logger.info(`Admin ${req.user.id} set event ${event._id} status -> ${status}`);
    res.json({
      message: `Event ${status.toLowerCase()}`,
      event: {
        id: event._id.toString(),
        title: event.title,
        status: event.status,
      },
    });
  } catch (err) {
    logger.error(`admin.setEventStatus: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to update status' });
  }
}

module.exports = { stats, pendingEvents, listAllEvents, setEventStatus };
