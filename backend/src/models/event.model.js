const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    club_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Club",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["hackathon", "club", "workshop"],
      required: true,
    },
    team_size_min: {
      type: Number,
      default: 2,
    },
    team_size_max: {
      type: Number,
      default: 6,
    },
    weights: {
      skill: { type: Number, default: 0.4 },
      availability: { type: Number, default: 0.25 },
      role: { type: Number, default: 0.2 },
      history: { type: Number, default: 0.15 },
    },
    deadline: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
  },
  { timestamps: true },
);

eventSchema.index({ status: 1, deadline: -1 });
eventSchema.index({ created_by: 1 });
eventSchema.index({ club_id: 1 });

module.exports = mongoose.model("Event", eventSchema);
