const User = require("../models/user.model");
const Skill = require("../models/skill.model");
const Enrollment = require("../models/enrollment.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const TeamChangeRequest = require("../models/teamChangeRequest.model");
const {
  fetchGithubUser,
  fetchGithubRepos,
  analyzeRepos,
  isTechnicalSkill,
  detectAllFrameworks,
} = require("../utils/github");

const upsertGithubSkills = async (userId, skills) => {
  if (!skills || skills.length === 0) return;

  // Duplicate remove karo (case-insensitive)
  const uniqueSkills = [...new Set(skills.map((s) => s.toLowerCase().trim()))];

  const ops = uniqueSkills.map((normalized) => ({
    updateOne: {
      filter: { user_id: userId, skill_name: normalized },
      update: {
        $set: {
          is_technical: isTechnicalSkill(normalized),
          verified: true,
          verified_at: new Date(),
          source: "github",
        },
        $setOnInsert: {
          user_id: userId,
          skill_name: normalized,
          proficiency: 3,
          source: "github",
        },
      },
      upsert: true,
    },
  }));

  try {
    await Skill.bulkWrite(ops, { ordered: false });
  } catch (err) {
    if (err.code !== 11000) {
      console.error("BulkWrite skill upsert error:", err.message);
    }
  }
};

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

    // Real counts in parallel
    const [skills_count, events_count, teams_count, pending_votes] =
      await Promise.all([
        Skill.countDocuments({ user_id: req.user.id }),

        // Events = enrollments raised (status pending or matched)
        Enrollment.countDocuments({
          user_id: req.user.id,
          status: { $in: ["pending", "matched"] },
        }),

        // Teams = accepted memberships
        TeamMember.countDocuments({
          user_id: req.user.id,
          status: "accepted",
        }),

        // Pending votes = open leave requests on teams this user is in,
        // that this user has not yet approved/rejected
        (async () => {
          const myTeams = await TeamMember.find({
            user_id: req.user.id,
            status: "accepted",
          })
            .select("team_id")
            .lean();

          if (myTeams.length === 0) return 0;

          const teamIds = myTeams.map((m) => m.team_id);

          return TeamChangeRequest.countDocuments({
            team_id: { $in: teamIds },
            status: "pending",
            expires_at: { $gt: new Date() },
            approvals: { $ne: req.user.id },
            rejections: { $ne: req.user.id },
          });
        })(),
      ]);

    res.status(200).json({
      success: true,
      data: {
        ...user.toObject(),
        skills_count,
        events_count,
        teams_count,
        pending_votes,
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

          let detected = { all_frameworks: [], repo_frameworks: {} };
          try {
            detected = await detectAllFrameworks(githubUsername, repos);
          } catch (err) {
            console.error("Framework detection failed:", err.message);
          }

          await upsertGithubSkills(req.user.id, [
            ...analyzed.all_languages,
            ...detected.all_frameworks,
          ]);

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
            detected_frameworks: detected.all_frameworks,
            repo_frameworks: detected.repo_frameworks,
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

    let detected = { all_frameworks: [], repo_frameworks: {} };
    try {
      detected = await detectAllFrameworks(github_username, repos);
    } catch (err) {
      console.error("Framework detection failed:", err.message);
    }

    // ⚡ Languages + Frameworks dono add karo
    await upsertGithubSkills(req.user.id, [
      ...analyzed.all_languages,
      ...detected.all_frameworks,
    ]);

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
          detected_frameworks: detected.all_frameworks,
          repo_frameworks: detected.repo_frameworks,
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

    let detected = { all_frameworks: [], repo_frameworks: {} };
    try {
      detected = await detectAllFrameworks(user.github_username, repos);
    } catch (err) {
      console.error("Framework detection failed:", err.message);
    }

    await upsertGithubSkills(req.user.id, [
      ...analyzed.all_languages,
      ...detected.all_frameworks,
    ]);

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
          detected_frameworks: detected.all_frameworks,
          repo_frameworks: detected.repo_frameworks,
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
