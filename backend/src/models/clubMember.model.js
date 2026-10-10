const mongoose = require('mongoose');

const clubMemberSchema = new mongoose.Schema(
  {
    club_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Club',
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['secretary', 'core_member', 'member'],
      default: 'member',
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'left'],
      default: 'active',
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
    left_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
clubMemberSchema.index({ club_id: 1, user_id: 1 }, { unique: true });
clubMemberSchema.index({ club_id: 1, role: 1, status: 1 });
clubMemberSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model('ClubMember', clubMemberSchema);
