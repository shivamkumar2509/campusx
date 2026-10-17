const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
const { audit } = require("../middleware/audit.middleware");
const {
  getMyProfile,
  updateMyProfile,
  updateAvatar,
  linkGithub,
  refreshGithub,
  toggleHiddenLanguage,
} = require("../controllers/user.controller");
const {
  getMySkills,
  addSkill,
  updateSkill,
  deleteSkill,
} = require("../controllers/skill.controller");

// ===== PROFILE =====
router.get("/me", auth, getMyProfile);
router.patch("/me", auth, audit("user.update", "User"), updateMyProfile);
router.post("/me/avatar", auth, audit("user.avatar", "User"), updateAvatar);
router.post("/me/github", auth, audit("user.github.link", "User"), linkGithub);
router.post(
  "/me/github/refresh",
  auth,
  audit("user.github.refresh", "User"),
  refreshGithub,
);
router.patch(
  "/me/hidden-languages",
  auth,
  audit("user.language.toggle", "User"),
  toggleHiddenLanguage,
);

// ===== SKILLS =====
router.get("/me/skills", auth, getMySkills);
router.post("/me/skills", auth, audit("skill.add", "Skill"), addSkill);
router.patch(
  "/me/skills/:skillId",
  auth,
  audit("skill.update", "Skill"),
  updateSkill,
);
router.delete(
  "/me/skills/:skillId",
  auth,
  audit("skill.delete", "Skill"),
  deleteSkill,
);

module.exports = router;
