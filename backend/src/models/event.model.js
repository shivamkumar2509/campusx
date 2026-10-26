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
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["hackathon", "club", "workshop"],
      required: true,
    },

    // ===== TEAM SIZE (ALWAYS ENFORCED) =====
    team_size_min: {
      type: Number,
      default: 2,
      min: 1,
    },
    team_size_max: {
      type: Number,
      default: 6,
      min: 1,
    },

    // ===== MAX TEAMS (OPTIONAL — null = unlimited) =====
    max_teams: {
      type: Number,
      default: null,
      min: 1,
    },

    weights: {
      skill: { type: Number, default: 0.4 },
      availability: { type: Number, default: 0.25 },
      role: { type: Number, default: 0.2 },
      history: { type: Number, default: 0.15 },
    },
    deadline: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
  },
  { timestamps: true },
);

// ===== VALIDATION: team_size_max >= team_size_min =====
// Mongoose 7+ style: async function, no `next`
eventSchema.pre("validate", async function () {
  if (
    this.team_size_min != null &&
    this.team_size_max != null &&
    this.team_size_max < this.team_size_min
  ) {
    this.invalidate(
      "team_size_max",
      "team_size_max must be greater than or equal to team_size_min",
      this.team_size_max,
    );
  }
});

eventSchema.index({ status: 1, deadline: -1 });
eventSchema.index({ created_by: 1 });
eventSchema.index({ club_id: 1 });

module.exports = mongoose.model("Event", eventSchema);
