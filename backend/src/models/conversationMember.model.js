const mongoose = require("mongoose");

const conversationMemberSchema = new mongoose.Schema(
  {
    conv_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joined_at: { type: Date, default: Date.now },
    last_read_at: { type: Date, default: null },
    muted: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
    },
  },
  { timestamps: true },
);

conversationMemberSchema.index({ conv_id: 1, user_id: 1 }, { unique: true });
conversationMemberSchema.index({ user_id: 1, status: 1 });

module.exports = mongoose.model("ConversationMember", conversationMemberSchema);
