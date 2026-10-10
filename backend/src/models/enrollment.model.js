
const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    raised_at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'matched', 'cancelled'],
      default: 'pending',
    },
    source: {
      type: String,
      enum: ['self', 'leader_invite', 'external_approved'],
      default: 'self',
    },
  },
  { timestamps: true }
);

// Indexes
enrollmentSchema.index(
  { user_id: 1, event_id: 1 },
  { unique: true }
);
enrollmentSchema.index({ event_id: 1, status: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
