const mongoose = require("mongoose");

const teamChangeRequestSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    request_type: {
      type: String,
      enum: ["leave", "join", "replace"],
      default: "leave",
    },
    reason: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    approvals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    rejections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    requested_at: { type: Date, default: Date.now },
    expires_at: { type: Date, required: true },
    resolved_at: { type: Date, default: null },
  },
  { timestamps: true },
);

teamChangeRequestSchema.index({ team_id: 1, status: 1 });
teamChangeRequestSchema.index({ expires_at: 1 });

module.exports = mongoose.model("TeamChangeRequest", teamChangeRequestSchema);
