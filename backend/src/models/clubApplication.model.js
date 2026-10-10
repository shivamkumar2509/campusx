const mongoose = require('mongoose');

const clubApplicationSchema = new mongoose.Schema(
  {
    recruitment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClubRecruitment',
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['applied', 'verified', 'approved', 'rejected'],
      default: 'applied',
    },
    applied_at: {
      type: Date,
      default: Date.now,
    },
    verification_type: {
      type: String,
      enum: ['physical', 'online', 'video'],
      default: 'physical',
    },
    verification_data: {
      performance_notes: { type: String, default: '' },
      video_url: { type: String, default: '' },
    },
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verified_at: {
      type: Date,
      default: null,
    },
    verification_notes: {
      type: String,
      default: '',
    },
    approval_votes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    rejection_reason: {
      type: String,
      default: '',
    },
    decided_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
clubApplicationSchema.index({ recruitment_id: 1, user_id: 1 }, { unique: true });
clubApplicationSchema.index({ recruitment_id: 1, status: 1 });
clubApplicationSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model('ClubApplication', clubApplicationSchema);
