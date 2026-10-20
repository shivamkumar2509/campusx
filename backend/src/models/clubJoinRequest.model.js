const mongoose = require("mongoose");

const clubJoinRequestSchema = new mongoose.Schema(
  {
    club_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: [
        "pending",
        "verification_scheduled",
        "approved",
        "rejected",
        "cancelled",
      ],
      default: "pending",
    },
    verification_date: { type: Date, default: null },
    verification_venue: { type: String, default: "" },
    verification_notes: { type: String, default: "" },
    scheduled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    responded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejection_reason: { type: String, default: "" },
    raised_at: { type: Date, default: Date.now },
    responded_at: { type: Date, default: null },
  },
  { timestamps: true },
);

clubJoinRequestSchema.index({ club_id: 1, status: 1 });
clubJoinRequestSchema.index({ user_id: 1, status: 1 });
clubJoinRequestSchema.index(
  { club_id: 1, user_id: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

module.exports = mongoose.model("ClubJoinRequest", clubJoinRequestSchema);
