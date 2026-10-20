const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const ti = require("../controllers/teamInvitation.controller");
const rep = require("../controllers/replacement.controller");

const router = express.Router();

router.post("/teams/:teamId/invitations", auth, ti.inviteRegisteredUser);
router.post(
  "/teams/:teamId/invitations/:invitationId/respond",
  auth,
  rep.respondToInvitation,
);

router.use(routeError);
module.exports = router;
