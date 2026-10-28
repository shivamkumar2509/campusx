const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const teamController = require("../controllers/team.controller");
const votingController = require("../controllers/voting.controller");
const leaveRequestController = require("../controllers/leaveRequest.controller");
const replacementController = require("../controllers/replacement.controller");

const router = express.Router();

// ===== TEAM CRUD =====
router.post("/teams", auth, teamController.createTeam);
router.get("/teams/my", auth, teamController.getMyTeams);
router.get("/teams/:teamId", auth, teamController.getTeam);
router.patch("/teams/:teamId", auth, teamController.updateTeam);
router.post("/teams/:teamId/confirm", auth, teamController.confirmTeam);

// ===== TEAM MEMBERS =====
router.get("/teams/:teamId/members", auth, teamController.getTeamMembers);

// ===== CONVERSATION =====
router.get(
  "/teams/:teamId/conversation",
  auth,
  teamController.getTeamConversation,
);

// ===== TASKS =====
router.get("/teams/:teamId/tasks", auth, teamController.getTeamTasks);

// ===== VOTING =====
router.post(
  "/teams/:teamId/leader/vote",
  auth,
  votingController.castLeaderVote,
);
router.get("/teams/:teamId/votes", auth, votingController.getTeamVotes);
router.post(
  "/teams/:teamId/leader/declare",
  auth,
  votingController.declareLeader,
);

// ===== LEAVE REQUESTS =====
router.post(
  "/teams/:teamId/leave-requests",
  auth,
  leaveRequestController.createLeaveRequest,
);
router.get(
  "/teams/:teamId/leave-requests",
  auth,
  leaveRequestController.getLeaveRequests,
);
router.get(
  "/teams/:teamId/leave-requests/:requestId/result",
  auth,
  leaveRequestController.getLeaveRequestResult,
);
router.post(
  "/teams/:teamId/leave-requests/:requestId/votes",
  auth,
  leaveRequestController.voteOnLeaveRequest,
);

// ===== REPLACEMENTS =====
router.get(
  "/teams/:teamId/replacements",
  auth,
  replacementController.getReplacements,
);
router.post(
  "/teams/:teamId/find-replacement",
  auth,
  replacementController.findReplacement,
);
router.post(
  "/teams/:teamId/replacements/:suggestionId/invite",
  auth,
  replacementController.inviteReplacement,
);

// ===== INVITATIONS =====
router.post(
  "/teams/:teamId/invitations/:invitationId/respond",
  auth,
  replacementController.respondToInvitation,
);

// ===== LEAVE REQUEST CANCEL =====
router.delete(
  "/leave-requests/:requestId",
  auth,
  leaveRequestController.cancelLeaveRequest,
);

router.use(routeError);

module.exports = router;
