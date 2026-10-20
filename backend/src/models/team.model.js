const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema(
  {
    event_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    leader_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "confirmed", "completed"],
      default: "draft",
    },
    confirmed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

teamSchema.index({ event_id: 1, status: 1 });
teamSchema.index({ event_id: 1, name: 1 }, { unique: true });
teamSchema.index({ leader_id: 1 });

module.exports = mongoose.model("Team", teamSchema);
