const Skill = require("../models/skill.model");
const { isTechnicalSkill } = require("../utils/github");

// GET /api/users/me/skills
exports.getMySkills = async (req, res) => {
  try {
    const skills = await Skill.find({ user_id: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      data: skills,
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

// POST /api/users/me/skills
exports.addSkill = async (req, res) => {
  try {
    const { skill_name, proficiency } = req.body;

    if (!skill_name || !skill_name.trim()) {
      return res.status(400).json({
        success: false,
        error_code: "MISSING_SKILL_NAME",
        message: "skill_name is required",
      });
    }

    // Check duplicate
    const existing = await Skill.findOne({
      user_id: req.user.id,
      skill_name: skill_name.trim(),
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error_code: "SKILL_EXISTS",
        message: "You already have this skill",
      });
    }

    // Auto-classify technical vs non-technical
    const technical = isTechnicalSkill(skill_name);

    const skill = await Skill.create({
      user_id: req.user.id,
      skill_name: skill_name.trim(),
      proficiency: proficiency || 1,
      is_technical: technical,
      source: "manual",
    });

    res.status(201).json({
      success: true,
      message: "Skill added",
      data: skill,
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

// PATCH /api/users/me/skills/:skillId
exports.updateSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { proficiency, skill_name } = req.body;

    const skill = await Skill.findOne({
      _id: skillId,
      user_id: req.user.id,
    });

    if (!skill) {
      return res.status(404).json({
        success: false,
        error_code: "SKILL_NOT_FOUND",
        message: "Skill not found",
      });
    }

    if (proficiency !== undefined) skill.proficiency = proficiency;
    if (skill_name) {
      skill.skill_name = skill_name.trim();
      skill.is_technical = isTechnicalSkill(skill_name);
    }

    await skill.save();

    res.status(200).json({
      success: true,
      message: "Skill updated",
      data: skill,
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

// DELETE /api/users/me/skills/:skillId
exports.deleteSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    const skill = await Skill.findOneAndDelete({
      _id: skillId,
      user_id: req.user.id,
    });

    if (!skill) {
      return res.status(404).json({
        success: false,
        error_code: "SKILL_NOT_FOUND",
        message: "Skill not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Skill deleted",
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
