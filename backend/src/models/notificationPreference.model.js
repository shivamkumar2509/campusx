const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    email_enabled: {
      type: Boolean,
      default: true,
    },
    push_enabled: {
      type: Boolean,
      default: true,
    },
    chat_enabled: {
      type: Boolean,
      default: true,
    },
    match_enabled: {
      type: Boolean,
      default: true,
    },
    deadline_enabled: {
      type: Boolean,
      default: true,
    },
    club_enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
notificationPreferenceSchema.index({ user_id: 1 }, { unique: true });

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
