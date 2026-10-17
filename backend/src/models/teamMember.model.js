const mongoose = require("mongoose");

const teamMemberSchema = new mongoose.Schema(
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
    role: {
      type: String,
      default: "member",
    },
    joined_at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["invited", "accepted", "declined", "left"],
      default: "invited",
    },
    left_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

teamMemberSchema.index({ team_id: 1, user_id: 1 }, { unique: true });
teamMemberSchema.index({ team_id: 1, status: 1 });

module.exports = mongoose.model("TeamMember", teamMemberSchema);
