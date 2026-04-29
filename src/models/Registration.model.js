const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    kind: { type: String, enum: ['registered', 'interested'], default: 'registered' },
    /** Static/mock checkout — no real PSP integration */
    paymentStatus: {
      type: String,
      enum: ['none', 'waived', 'pending', 'completed'],
      default: 'none',
    },
    mockTxnId: { type: String, trim: true },
  },
  { timestamps: true }
);

registrationSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
