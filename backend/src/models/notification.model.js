const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      // 28 types: enrollment_confirmed, match_found, team_confirmed,
      // leave_request, vote_reminder, leave_approved, member_left,
      // replacement_found, team_invite, member_joined,
      // external_invite_sent, external_invite_accepted,
      // deadline_reminder, feedback_request, club_recruitment_open,
      // club_application_status, club_member_approved,
      // club_member_removed, club_rename_request, club_rename_approved,
      // new_message, task_assigned, admin_escalation, vote_cast,
      // application_received, team_dissolved, password_changed,
      // account_suspended
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    channels: {
      type: [String],
      default: ['in-app'],
    },
    is_broadcast: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes
notificationSchema.index({ user_id: 1, read: 1 });
notificationSchema.index({ type: 1, created_at: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
