const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const ext = require("../controllers/externalInvitation.controller");

const router = express.Router();

// Public — no auth
router.get("/external-invitations/:token", ext.previewExternalInvite);
router.post("/external-invitations/:token/signup", ext.signupViaExternalInvite);

// Authenticated
router.post(
  "/teams/:teamId/external-invitations",
  auth,
  ext.createExternalInvitation,
);
router.post(
  "/external-invitations/:invitationId/approve",
  auth,
  ext.approveExternalInvite,
);

router.use(routeError);
module.exports = router;
