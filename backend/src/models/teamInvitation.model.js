const mongoose = require("mongoose");

const teamInvitationSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    invited_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invited_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invite_type: {
      type: String,
      enum: ["join_team", "replacement"],
      default: "join_team",
    },
    source: {
      type: String,
      enum: ["ai_suggested", "leader_manual"],
      default: "leader_manual",
    },
    role_offered: { type: String, default: "" },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined"],
      default: "pending",
    },
    sent_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true },
    responded_at: { type: Date, default: null },
  },
  { timestamps: true },
);

teamInvitationSchema.index({ invited_user_id: 1, status: 1 });
teamInvitationSchema.index({ expires_at: 1 });

module.exports = mongoose.model("TeamInvitation", teamInvitationSchema);
