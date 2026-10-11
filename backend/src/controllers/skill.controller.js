const Skill = require("../models/skill.model");
const { isTechnicalSkill } = require("../utils/github");

exports.getMySkills = async (req, res) => {
  try {
    const filter = { user_id: req.user.id };

    if (
      req.query.source &&
      ["manual", "github", "codeforces"].includes(req.query.source)
    ) {
      filter.source = req.query.source;
    }

    const skills = await Skill.find(filter).sort({ createdAt: -1 });

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

    const normalized = skill_name.trim().toLowerCase();
    const technical = isTechnicalSkill(normalized);

    const existing = await Skill.findOne({
      user_id: req.user.id,
      skill_name: normalized,
    });

    const wasCreated = !existing;

    const skill = await Skill.findOneAndUpdate(
      { user_id: req.user.id, skill_name: normalized },
      {
        $set: {
          proficiency: proficiency || 1,
          is_technical: technical,
        },
        $setOnInsert: {
          user_id: req.user.id,
          skill_name: normalized,
          source: "manual",
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(wasCreated ? 201 : 200).json({
      success: true,
      message: wasCreated ? "Skill added" : "Skill updated",
      data: skill,
    });
  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error_code: "SKILL_EXISTS",
        message: "You already have this skill",
      });
    }

    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};

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
      const normalized = skill_name.trim().toLowerCase();

      if (normalized !== skill.skill_name) {
        const clash = await Skill.findOne({
          user_id: req.user.id,
          skill_name: normalized,
          _id: { $ne: skillId },
        });

        if (clash) {
          return res.status(409).json({
            success: false,
            error_code: "SKILL_EXISTS",
            message: "You already have another skill with this name",
          });
        }
      }

      skill.skill_name = normalized;
      skill.is_technical = isTechnicalSkill(normalized);
    }

    await skill.save();

    res.status(200).json({
      success: true,
      message: "Skill updated",
      data: skill,
    });
  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error_code: "SKILL_EXISTS",
        message: "You already have this skill",
      });
    }

    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};

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
