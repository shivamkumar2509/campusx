const mongoose = require("mongoose");

const taskAssignmentSchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assigned_at: { type: Date, default: Date.now },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

taskAssignmentSchema.index({ task_id: 1, user_id: 1 }, { unique: true });
taskAssignmentSchema.index({ user_id: 1 });

module.exports = mongoose.model("TaskAssignment", taskAssignmentSchema);
