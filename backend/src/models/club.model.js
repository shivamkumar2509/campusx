const mongoose = require("mongoose");

const clubSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    display_name: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      // enum: ["music", "coding", "robotics", "dance", "drama"],
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    secretary_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    founded_year: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    member_count: {
      type: Number,
      default: 0,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rename_request_status: {
      type: String,
      enum: ["pending", "approved", "rejected", null],
      default: null,
    },
    rename_requested_name: {
      type: String,
      default: null,
    },
    rename_requested_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rename_requested_at: {
      type: Date,
      default: null,
    },
    rename_rejection_reason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

// Indexes

clubSchema.index({ type: 1 });
clubSchema.index({ secretary_id: 1 });
clubSchema.index({ status: 1 });

module.exports = mongoose.model("Club", clubSchema);
