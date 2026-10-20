const mongoose = require("mongoose");

const replacementSuggestionSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    replacing_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role_needed: { type: String, default: "" },
    score: { type: Number, min: 0, max: 1, default: 0 },
    reasoning: { type: String, default: "" },
    suggestion_source: {
      type: String,
      enum: ["ai_generated", "leader_manual"],
      default: "ai_generated",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

replacementSuggestionSchema.index({ team_id: 1, status: 1 });
replacementSuggestionSchema.index({ candidate_id: 1 });

module.exports = mongoose.model(
  "ReplacementSuggestion",
  replacementSuggestionSchema,
);
