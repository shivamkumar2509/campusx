const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ===== REQUIRED (signup pe aayenge) =====
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },

    // ===== SYSTEM-MANAGED (default rakho) =====
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    college: {
      type: String,
      default: "IIITV",
    },
    is_external_origin: {
      type: Boolean,
      default: false,
    },

    // ===== OPTIONAL (user profile se bharega) =====
    avatar_url: {
      type: String,
    },
    avatar_public_id: {
      type: String,
    },
    availability: {
      type: Number,
    },
    experience_level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
    },
    github_username: {
      type: String,
    },
    github_url: {
      type: String,
    },
    linkedin_url: {
      type: String,
    },
    codeforces_username: {
      type: String,
    },
    github_data: {
      public_repos: { type: Number },
      top_languages: { type: [String] },
    },
    github_verified_at: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
