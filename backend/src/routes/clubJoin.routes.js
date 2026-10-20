const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const c = require("../controllers/clubJoin.controller");

const router = express.Router();

// Student-side
router.post("/clubs/:clubId/join-request", auth, c.raiseJoinRequest);
router.get("/users/me/join-requests", auth, c.getMyJoinRequests);
router.delete("/join-requests/:requestId", auth, c.cancelJoinRequest);

// Manager-side (secretary + core_member)
router.get("/clubs/:clubId/join-requests", auth, c.listClubJoinRequests);
router.patch(
  "/join-requests/:requestId/schedule",
  auth,
  c.scheduleVerification,
);
router.patch("/join-requests/:requestId/approve", auth, c.approveJoinRequest);
router.patch("/join-requests/:requestId/reject", auth, c.rejectJoinRequest);

router.use(routeError);
module.exports = router;
