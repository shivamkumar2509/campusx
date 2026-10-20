const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    conv_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    reply_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ conv_id: 1, createdAt: -1 });
messageSchema.index({ sender_id: 1 });

module.exports = mongoose.model("Message", messageSchema);
