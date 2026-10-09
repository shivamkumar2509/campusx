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

    const skills_count = await Skill.countDocuments({ user_id: req.user.id });

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        skills_count,
        events_count: 0,
        teams_count: 0,
        pending_votes: 0,
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

    if (req.body.github_username !== undefined) {
      const githubUsername = req.body.github_username;

      if (githubUsername && githubUsername.trim()) {
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
            all_languages: analyzed.all_languages,
            hidden_languages: [],
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
          all_languages: analyzed.all_languages,
          hidden_languages: [],
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

// POST /api/users/me/github/refresh
exports.refreshGithub = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.github_username) {
      return res.status(400).json({
        success: false,
        error_code: "NO_GITHUB",
        message: "No GitHub username linked",
      });
    }

    let githubUser, repos, analyzed;
    try {
      githubUser = await fetchGithubUser(user.github_username);
      repos = await fetchGithubRepos(user.github_username);
      analyzed = analyzeRepos(repos);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error_code: "GITHUB_FETCH_FAILED",
        message: err.message,
      });
    }

    // Purani hidden languages preserve karo
    const existingHidden = user.github_data?.hidden_languages || [];

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        github_data: {
          public_repos: githubUser.public_repos,
          followers: githubUser.followers,
          following: githubUser.following,
          avatar_url: githubUser.avatar_url,
          bio: githubUser.bio,
          top_languages: analyzed.top_languages,
          all_languages: analyzed.all_languages,
          hidden_languages: existingHidden,
          language_count: analyzed.language_count,
          recent_repos: analyzed.recent_repos,
        },
        github_verified_at: new Date(),
      },
      { new: true },
    ).select("-password_hash");

    res.status(200).json({
      success: true,
      message: "GitHub data refreshed",
      data: updatedUser,
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

// PATCH /api/users/me/hidden-languages
exports.toggleHiddenLanguage = async (req, res) => {
  try {
    const { language } = req.body;

    if (!language || !language.trim()) {
      return res.status(400).json({
        success: false,
        error_code: "MISSING_LANGUAGE",
        message: "language is required",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error_code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const currentHidden = user.github_data?.hidden_languages || [];
    const langTrimmed = language.trim();

    let updatedHidden;
    if (currentHidden.includes(langTrimmed)) {
      updatedHidden = currentHidden.filter((l) => l !== langTrimmed);
    } else {
      updatedHidden = [...currentHidden, langTrimmed];
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          "github_data.hidden_languages": updatedHidden,
        },
      },
      { new: true },
    ).select("-password_hash");

    res.status(200).json({
      success: true,
      message: currentHidden.includes(langTrimmed)
        ? "Language visible now"
        : "Language hidden",
      data: updatedUser,
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
