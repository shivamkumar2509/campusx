const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    skill_name: {
      type: String,
      required: true,
      trim: true,
    },
    proficiency: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
    },
    is_technical: {
      type: Boolean,
      default: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    source: {
      type: String,
      enum: ["github", "codeforces", "manual"],
      default: "manual",
    },
    source_url: {
      type: String,
      default: "",
    },
    verified_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

skillSchema.index({ user_id: 1 });
skillSchema.index({ skill_name: 1 });
skillSchema.index({ verified: 1 });
skillSchema.index({ is_technical: 1 });

module.exports = mongoose.model("Skill", skillSchema);
