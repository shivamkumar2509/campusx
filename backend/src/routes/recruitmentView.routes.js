const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const { audit } = require("../middleware/audit.middleware");
const c = require("../controllers/recruitmentView.controller");

const router = express.Router();

router.get("/recruitments/:recruitmentId", auth, c.getRecruitment);
router.post(
  "/recruitments/:recruitmentId/applications",
  auth,
  audit("recruitment.apply", "ClubApplication"),
  c.applyToRecruitment,
);

router.use(routeError);

module.exports = router;
