const mongoose = require("mongoose");

const suggestionSchema = new mongoose.Schema(
  {
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    team_members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    leader_candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    reasoning: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

suggestionSchema.index({ event_id: 1, status: 1 });
suggestionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Suggestion", suggestionSchema);
