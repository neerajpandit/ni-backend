const mongoose = require('mongoose');

const EVENT_STATUSES = ['Pending', 'Approved', 'Rejected'];
const FEED_TYPES = ['Upcoming', 'Live', 'Completed'];

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    organizerName: { type: String, trim: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    /** Display strings aligned with frontend (EventsPage / mockData) */
    dateDisplay: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    time: { type: String, trim: true },
    venue: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    image: { type: String, trim: true },
    description: { type: String, default: '' },
    /** Cached count for fast listing; registrations collection is source of truth */
    registeredCount: { type: Number, default: 0, min: 0 },
    totalSeats: { type: Number, default: 100, min: 0 },
    status: { type: String, enum: EVENT_STATUSES, default: 'Pending', index: true },
    feedType: { type: String, enum: FEED_TYPES, default: 'Upcoming', index: true },
    trending: { type: Boolean, default: false },
    rating: { type: Number, min: 0, max: 5 },
    registrationFee: { type: Number, default: 0, min: 0 },
    department: { type: String, trim: true },
    highlights: [{ type: String }],
    venueConflictFlag: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
module.exports.EVENT_STATUSES = EVENT_STATUSES;
module.exports.FEED_TYPES = FEED_TYPES;
