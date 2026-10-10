const mongoose = require('mongoose');

const clubRecruitmentSchema = new mongoose.Schema(
  {
    club_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    requirements: {
      skills: { type: [String], default: [] },
      experience: { type: String, default: 'any' },
    },
    application_deadline: {
      type: Date,
      required: true,
    },
    verification_type: {
      type: String,
      enum: ['physical', 'online', 'both', 'video'],
      default: 'physical',
    },
    verification_details: {
      date: { type: Date, default: null },
      time: { type: String, default: '' },
      venue: { type: String, default: '' },
      mode: { type: String, default: '' },
    },
    positions_open: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed'],
      default: 'draft',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    closed_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
clubRecruitmentSchema.index({ club_id: 1, status: 1, application_deadline: 1 });
clubRecruitmentSchema.index({ club_id: 1, title: 1 }, { unique: true });

module.exports = mongoose.model('ClubRecruitment', clubRecruitmentSchema);
