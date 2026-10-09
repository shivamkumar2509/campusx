const User = require("../models/user.model");
const Skill = require("../models/skill.model");
const {
  fetchGithubUser,
  fetchGithubRepos,
  analyzeRepos,
} = require("../utils/github");

// GET /api/users/me
exports.getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password_hash");

    if (!user) {
      return res.status(404).json({
        success: false,
        error_code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    // Get skills count
    const skills_count = await Skill.countDocuments({ user_id: req.user.id });

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        skills_count,
        events_count: 0, // TODO: Event model baad mein
        teams_count: 0, // TODO: Team model baad mein
        pending_votes: 0, // TODO: Vote model baad mein
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};

// PATCH /api/users/me
exports.updateMyProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "year",
      "availability",
      "experience_level",
      "linkedin_url",
      "codeforces_username",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // If github_username is being updated, fetch GitHub data too
    if (req.body.github_username !== undefined) {
      const githubUsername = req.body.github_username;

      if (githubUsername && githubUsername.trim()) {
        // Fetch GitHub data
        try {
          const githubUser = await fetchGithubUser(githubUsername);
          const repos = await fetchGithubRepos(githubUsername);
          const analyzed = analyzeRepos(repos);

          updates.github_username = githubUsername;
          updates.github_url = githubUser.html_url;
          updates.github_data = {
            public_repos: githubUser.public_repos,
            followers: githubUser.followers,
            following: githubUser.following,
            avatar_url: githubUser.avatar_url,
            bio: githubUser.bio,
            top_languages: analyzed.top_languages,
            language_count: analyzed.language_count,
            recent_repos: analyzed.recent_repos,
          };
          updates.github_verified_at = new Date();
        } catch (err) {
          return res.status(400).json({
            success: false,
            error_code: "GITHUB_FETCH_FAILED",
            message: err.message,
          });
        }
      } else {
        // Clear GitHub data if empty string
        updates.github_username = "";
        updates.github_url = "";
        updates.github_data = null;
        updates.github_verified_at = null;
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password_hash");

    res.status(200).json({
      success: true,
      message: "Profile updated",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};

// POST /api/users/me/avatar
exports.updateAvatar = async (req, res) => {
  try {
    const { avatar_url, avatar_public_id } = req.body;

    if (!avatar_url) {
      return res.status(400).json({
        success: false,
        error_code: "MISSING_AVATAR",
        message: "avatar_url is required",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar_url, avatar_public_id },
      { new: true },
    ).select("-password_hash");

    res.status(200).json({
      success: true,
      message: "Avatar updated",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};

// POST /api/users/me/github
exports.linkGithub = async (req, res) => {
  try {
    const { github_username } = req.body;

    if (!github_username) {
      return res.status(400).json({
        success: false,
        error_code: "MISSING_GITHUB",
        message: "github_username is required",
      });
    }

    // Fetch GitHub data
    let githubUser, repos, analyzed;
    try {
      githubUser = await fetchGithubUser(github_username);
      repos = await fetchGithubRepos(github_username);
      analyzed = analyzeRepos(repos);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error_code: "GITHUB_FETCH_FAILED",
        message: err.message,
      });
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        github_username,
        github_url: githubUser.html_url,
        github_data: {
          public_repos: githubUser.public_repos,
          followers: githubUser.followers,
          following: githubUser.following,
          avatar_url: githubUser.avatar_url,
          bio: githubUser.bio,
          top_languages: analyzed.top_languages,
          language_count: analyzed.language_count,
          recent_repos: analyzed.recent_repos,
        },
        github_verified_at: new Date(),
      },
      { new: true },
    ).select("-password_hash");

    res.status(200).json({
      success: true,
      message: "GitHub linked successfully",
      data: user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};
