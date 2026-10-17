const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const { audit } = require("../middleware/audit.middleware");
const c = require("../controllers/teamCore.controller");

const router = express.Router();

router.get("/teams/:teamId", auth, c.getTeam);
router.get("/teams/:teamId/members", auth, c.getTeamMembers);
router.post(
  "/teams/:teamId/confirm",
  auth,
  audit("team.confirm", "Team"),
  c.confirmTeam,
);
router.get("/teams/:teamId/conversation", auth, c.getTeamConversation);

router.use(routeError);

module.exports = router;
