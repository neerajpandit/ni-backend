const Registration = require('../models/Registration.model');
const Event = require('../models/Event.model');
const logger = require('../config/logger');
const { computeFeedType } = require('../utils/eventSchedule');
const { mapEvent } = require('./event.controller');

async function registerForEvent(req, res) {
  try {
    const { eventId, kind = 'registered', paymentConfirmed, mockTxnId } = req.body;
    if (!eventId) {
      return res.status(400).json({ message: 'eventId is required' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (event.status !== 'Approved') {
      return res.status(400).json({ message: 'Registrations are only open for approved events' });
    }

    if (kind === 'registered') {
      const phase = computeFeedType(event.startDate, event.endDate, new Date());
      if (phase !== 'Upcoming') {
        return res.status(400).json({
          message: 'Registration is only available before the event starts.',
        });
      }
    }

    const fee = Number(event.registrationFee) || 0;

    let paymentStatus = 'none';
    let txn = mockTxnId ? String(mockTxnId).trim() : '';

    if (kind === 'registered') {
      if (fee <= 0) {
        paymentStatus = 'waived';
      } else {
        if (!paymentConfirmed) {
          return res.status(402).json({
            message: 'Payment required before enrollment',
            registrationFee: fee,
            currency: 'INR',
          });
        }
        paymentStatus = 'completed';
        if (!txn) {
          txn = `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
      }

      if (event.registeredCount >= event.totalSeats) {
        return res.status(400).json({ message: 'Event is full' });
      }
    }

    const existing = await Registration.findOne({ userId: req.user.id, eventId });

    if (existing) {
      if (existing.kind === 'interested' && kind === 'registered') {
        existing.kind = 'registered';
        existing.paymentStatus = fee <= 0 ? 'waived' : paymentStatus;
        if (fee > 0) existing.mockTxnId = txn || undefined;
        await existing.save();
        await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: 1 } });

        const refreshed = await Event.findById(eventId).exec();
        logger.info(`Registration upgraded interested→registered: user ${req.user.id} -> ${eventId}`);
        return res.status(200).json({
          message: 'Registered successfully',
          upgraded: true,
          registration: {
            id: existing._id.toString(),
            kind: existing.kind,
            paymentStatus: existing.paymentStatus,
            mockTxnId: existing.mockTxnId,
            createdAt: existing.createdAt,
            event: refreshed ? mapEvent(refreshed) : undefined,
          },
        });
      }

      return res.status(409).json({
        message: existing.kind === 'registered' ? 'Already registered for this event' : 'Interest already saved',
      });
    }

    await Registration.create({
      userId: req.user.id,
      eventId,
      kind,
      paymentStatus: kind === 'interested' ? 'none' : paymentStatus,
      mockTxnId: kind === 'registered' && fee > 0 ? txn : undefined,
    });

    if (kind === 'registered') {
      await Event.findByIdAndUpdate(eventId, { $inc: { registeredCount: 1 } });
    }

    const refreshed = await Event.findById(eventId).exec();

    logger.info(`Registration: user ${req.user.id} -> event ${eventId} (${kind})`);
    res.status(201).json({
      message: kind === 'registered' ? 'Registered successfully' : 'Interest recorded',
      mockTxnId: kind === 'registered' && fee > 0 ? txn : undefined,
      paymentStatus: kind === 'interested' ? 'none' : paymentStatus,
      registration: refreshed
        ? {
            kind,
            paymentStatus: kind === 'interested' ? 'none' : paymentStatus,
            event: mapEvent(refreshed),
          }
        : undefined,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Already recorded for this event' });
    }
    logger.error(`registration.registerForEvent: ${err.message}`, err);
    res.status(500).json({ message: 'Registration failed' });
  }
}

async function listMine(req, res) {
  try {
    const regs = await Registration.find({ userId: req.user.id })
      .populate('eventId')
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();

    const items = regs
      .filter((r) => r.eventId)
      .map((r) => ({
        id: r._id.toString(),
        kind: r.kind,
        paymentStatus: r.paymentStatus,
        mockTxnId: r.mockTxnId,
        createdAt: r.createdAt,
        event: mapEvent(r.eventId),
      }));

    res.json({ registrations: items });
  } catch (err) {
    logger.error(`registration.listMine: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to load registrations' });
  }
}

/** Organizer/admin: roster for one event */
async function listForEvent(req, res) {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const allowed =
      req.user.role === 'admin' ||
      (req.user.role === 'organizer' && event.organizerId?.toString() === req.user.id);

    if (!allowed) {
      return res.status(403).json({ message: 'You can only view enrollments for your own events' });
    }

    const regs = await Registration.find({ eventId: event._id })
      .populate('userId', 'name email university role')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const enrollments = regs.map((r) => ({
      registrationId: r._id.toString(),
      kind: r.kind,
      paymentStatus: r.paymentStatus,
      mockTxnId: r.mockTxnId,
      enrolledAt: r.createdAt,
      student: r.userId
        ? {
            id: r.userId._id.toString(),
            name: r.userId.name,
            email: r.userId.email,
            university: r.userId.university,
            role: r.userId.role,
          }
        : null,
    }));

    res.json({
      eventId: event._id.toString(),
      eventTitle: event.title,
      enrollments,
    });
  } catch (err) {
    logger.error(`registration.listForEvent: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to load enrollments' });
  }
}

module.exports = { registerForEvent, listMine, listForEvent };
