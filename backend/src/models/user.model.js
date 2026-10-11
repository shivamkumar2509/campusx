const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
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
      followers: { type: Number },
      following: { type: Number },
      avatar_url: { type: String },
      bio: { type: String },
      top_languages: { type: [String] },
      all_languages: { type: [String] },
      hidden_languages: { type: [String] },
      language_count: { type: Object, default: {} },
      recent_repos: [
        {
          name: String,
          description: String,
          language: String,
          stars: Number,
          forks: Number,
          url: String,
          updated_at: Date,
        },
      ],
      detected_frameworks: { type: [String], default: [] },
      repo_frameworks: { type: Object, default: {} },
    },
    github_verified_at: {
      type: Date,
    },
  },
  { timestamps: true },
);

userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
