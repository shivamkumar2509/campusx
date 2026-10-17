const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["team", "direct", "group"],
      default: "team",
    },
    name: {
      type: String,
      default: "",
    },
    last_message_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

conversationSchema.index({ team_id: 1 }, { unique: true });
conversationSchema.index({ last_message_at: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
