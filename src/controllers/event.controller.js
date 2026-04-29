const { validationResult } = require('express-validator');
const Event = require('../models/Event.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { detectVenueConflict, escapeRegex } = require('../utils/eventConflict');
const { computeFeedType, formatDateTimeDisplay } = require('../utils/eventSchedule');

async function syncApprovedEventsFeedTypes(EventModel) {
  const docs = await EventModel.find({ status: 'Approved' }).select('_id startDate endDate feedType').lean().exec();
  const now = new Date();
  const bulk = [];
  for (const row of docs) {
    const next = computeFeedType(row.startDate, row.endDate, now);
    if (next !== row.feedType) {
      bulk.push({
        updateOne: {
          filter: { _id: row._id },
          update: { $set: { feedType: next } },
        },
      });
    }
  }
  if (bulk.length) await EventModel.bulkWrite(bulk);
}

async function syncSingleApprovedEvent(eventDoc) {
  if (eventDoc.status !== 'Approved') return;
  const next = computeFeedType(eventDoc.startDate, eventDoc.endDate, new Date());
  if (next !== eventDoc.feedType) {
    eventDoc.feedType = next;
    await eventDoc.save();
  }
}

function mapEvent(doc) {
  const e = doc.toObject ? doc.toObject() : doc;
  const id = e._id?.toString?.() ?? e._id;
  let feedTypeOut = e.feedType;
  if (e.status === 'Approved') {
    feedTypeOut = computeFeedType(e.startDate, e.endDate, new Date());
  }

  const startDisplay = formatDateTimeDisplay(e.startDate);
  const endDisplay = formatDateTimeDisplay(e.endDate);

  return {
    id,
    title: e.title,
    organizer: e.organizerName || '',
    organizerId: e.organizerId?.toString?.(),
    date: e.dateDisplay || (e.startDate ? new Date(e.startDate).toISOString().slice(0, 10) : ''),
    dateDisplay: e.dateDisplay,
    startDate: e.startDate,
    endDate: e.endDate,
    startDateTime: e.startDate ? new Date(e.startDate).toISOString() : null,
    endDateTime: e.endDate ? new Date(e.endDate).toISOString() : null,
    startDisplay,
    endDisplay,
    time: e.time,
    venue: e.venue,
    category: e.category,
    image: e.image,
    description: e.description,
    participants: e.registeredCount ?? 0,
    registeredCount: e.registeredCount ?? 0,
    totalSeats: e.totalSeats,
    status: e.status,
    feedType: feedTypeOut,
    type: feedTypeOut,
    schedulePhase: feedTypeOut,
    trending: e.trending,
    rating: e.rating,
    registrationFee: e.registrationFee,
    department: e.department,
    highlights: e.highlights || [],
    venueConflictFlag: e.venueConflictFlag,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

async function list(req, res) {
  try {
    const { category, search, feedType } = req.query;
    await syncApprovedEventsFeedTypes(Event);

    const filter = { status: 'Approved' };

    if (category && category !== 'All') {
      filter.category = category;
    }
    if (feedType && ['Upcoming', 'Live', 'Completed'].includes(feedType)) {
      filter.feedType = feedType;
    }

    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [{ title: rx }, { venue: rx }, { description: rx }];
    }

    const docs = await Event.find(filter).sort({ startDate: -1, createdAt: -1 }).limit(200).exec();
    res.json({ events: docs.map(mapEvent) });
  } catch (err) {
    logger.error(`events.list: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to list events' });
  }
}

async function listMine(req, res) {
  try {
    await syncApprovedEventsFeedTypes(Event);
    const docs = await Event.find({ organizerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
    res.json({ events: docs.map(mapEvent) });
  } catch (err) {
    logger.error(`events.listMine: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to load your events' });
  }
}

async function getById(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const approved = event.status === 'Approved';
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user && event.organizerId?.toString() === req.user.id;

    if (!approved && !isAdmin && !isOwner) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await syncSingleApprovedEvent(event);

    res.json({ event: mapEvent(event) });
  } catch (err) {
    logger.error(`events.getById: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to load event' });
  }
}

async function create(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const organizer = await User.findById(req.user.id);
    const organizerName = organizer?.name || 'Organizer';

    const body = req.body;
    const startDate = body.startDate ? new Date(body.startDate) : undefined;
    const endDate = body.endDate ? new Date(body.endDate) : undefined;

    const venueConflictFlag = await detectVenueConflict(Event, body.venue, startDate, endDate);

    let status = req.user.role === 'admin' ? 'Approved' : 'Pending';
    if (body.status && req.user.role === 'admin' && ['Pending', 'Approved', 'Rejected'].includes(body.status)) {
      status = body.status;
    }

    let feedType = 'Upcoming';
    if (status === 'Approved') {
      feedType = computeFeedType(startDate, endDate, new Date());
    }

    const event = await Event.create({
      title: body.title,
      organizerName,
      organizerId: req.user.id,
      dateDisplay: body.dateDisplay,
      startDate,
      endDate,
      time: body.time,
      venue: body.venue,
      category: body.category,
      image: body.image,
      description: body.description || '',
      totalSeats: Number(body.totalSeats) || 100,
      registrationFee: Number(body.registrationFee) || 0,
      department: body.department,
      highlights: Array.isArray(body.highlights) ? body.highlights : [],
      feedType,
      trending: Boolean(body.trending),
      rating: body.rating != null ? Number(body.rating) : undefined,
      status,
      venueConflictFlag,
      registeredCount: 0,
    });

    logger.info(`Event created: ${event._id} by ${req.user.id}`);
    res.status(201).json({ event: mapEvent(event) });
  } catch (err) {
    logger.error(`events.create: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to create event' });
  }
}

async function update(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (req.user.role !== 'admin' && event.organizerId?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own events' });
    }

    const body = req.body;
    const fields = [
      'title',
      'dateDisplay',
      'time',
      'venue',
      'category',
      'image',
      'description',
      'department',
      'highlights',
      'trending',
      'rating',
      'registrationFee',
      'feedType',
      'totalSeats',
    ];

    for (const f of fields) {
      if (body[f] !== undefined) event[f] = body[f];
    }
    if (body.startDate !== undefined) event.startDate = body.startDate ? new Date(body.startDate) : undefined;
    if (body.endDate !== undefined) event.endDate = body.endDate ? new Date(body.endDate) : undefined;

    event.venueConflictFlag = await detectVenueConflict(Event, event.venue, event.startDate, event.endDate, event._id);

    if (event.status === 'Approved') {
      event.feedType = computeFeedType(event.startDate, event.endDate, new Date());
    }

    await event.save();
    logger.info(`Event updated: ${event._id}`);
    res.json({ event: mapEvent(event) });
  } catch (err) {
    logger.error(`events.update: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to update event' });
  }
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }
  try {
    const jwt = require('jsonwebtoken');
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = { id: payload.userId, role: payload.role };
  } catch {
    /* ignore invalid token for optional routes */
  }
  next();
}

module.exports = {
  list,
  listMine,
  getById,
  create,
  update,
  optionalAuth,
  mapEvent,
};
