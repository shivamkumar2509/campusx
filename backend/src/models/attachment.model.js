const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    message_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    file_url: {
      type: String,
      required: true,
    },
    public_id: {
      type: String,
      default: "",
    },
    file_name: {
      type: String,
      default: "",
    },
    file_size: {
      type: Number,
      default: 0,
    },
    mime_type: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

attachmentSchema.index({ message_id: 1 });
attachmentSchema.index({ task_id: 1 });
attachmentSchema.index({ uploaded_by: 1 });

module.exports = mongoose.model("Attachment", attachmentSchema);
