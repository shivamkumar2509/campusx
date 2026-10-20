const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
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
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rating: { type: Number, min: 1, max: 5, required: true },
    comments: { type: String, default: "" },
  },
  { timestamps: true },
);

feedbackSchema.index({ event_id: 1, user_id: 1 }, { unique: true });
feedbackSchema.index({ team_id: 1 });
feedbackSchema.index({ user_id: 1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
