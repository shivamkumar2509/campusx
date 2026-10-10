
const mongoose = require('mongoose');

const externalInvitationSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invited_email: {
      type: String,
      required: true,
      lowercase: true,
    },
    invited_name: {
      type: String,
      default: '',
    },
    role_offered: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      default: '',
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'registered', 'approved'],
      default: 'pending',
    },
    approved_by: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    rejected_by: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    registered_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
    expires_at: {
      type: Date,
      required: true,
    },
    approved_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
externalInvitationSchema.index({ token: 1 }, { unique: true });
externalInvitationSchema.index({ invited_email: 1 });
externalInvitationSchema.index({ expires_at: 1 });

module.exports = mongoose.model(
  'ExternalInvitation',
  externalInvitationSchema
);
