const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    voter_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    candidate_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vote_type: {
      type: String,
      enum: ["leader", "team_confirm"],
      default: "leader",
    },
    voted_at: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

voteSchema.index({ team_id: 1, voter_id: 1, vote_type: 1 }, { unique: true });
voteSchema.index({ team_id: 1 });

module.exports = mongoose.model("Vote", voteSchema);
