const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["todo", "doing", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    due_date: { type: Date, default: null },
    order: { type: Number, default: 0 },
    completed_at: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.index({ team_id: 1, status: 1 });
taskSchema.index({ due_date: 1 });

module.exports = mongoose.model("Task", taskSchema);
