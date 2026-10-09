const router = require("express").Router();
const auth = require("../middleware/auth.middleware");
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
router.patch("/me", auth, updateMyProfile);
router.post("/me/avatar", auth, updateAvatar);
router.post("/me/github", auth, linkGithub);
router.post("/me/github/refresh", auth, refreshGithub);
router.patch("/me/hidden-languages", auth, toggleHiddenLanguage);

// ===== SKILLS =====
router.get("/me/skills", auth, getMySkills);
router.post("/me/skills", auth, addSkill);
router.patch("/me/skills/:skillId", auth, updateSkill);
router.delete("/me/skills/:skillId", auth, deleteSkill);

module.exports = router;
