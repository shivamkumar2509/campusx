const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const { audit } = require("../middleware/audit.middleware");
const ac = require("../controllers/admin.controller");
const cac = require("../controllers/clubAdmin.controller");

const router = express.Router();

// Analytics
router.get("/admin/analytics", auth, ac.getAnalytics);
router.get("/admin/audit-logs", auth, ac.getAuditLogs);
router.get("/admin/analytics/export", auth, ac.exportAnalytics);

// User management
router.get("/admin/students", auth, ac.listUsers);
router.post(
  "/admin/users",
  auth,
  audit("admin.user.create", "User"),
  ac.createUser,
);
router.patch(
  "/admin/users/:userId/approve",
  auth,
  audit("admin.user.approve", "User"),
  ac.approveUser,
);
router.patch(
  "/admin/users/:userId/suspend",
  auth,
  audit("admin.user.suspend", "User"),
  ac.suspendUser,
);
router.patch(
  "/admin/users/:userId/restore",
  auth,
  audit("admin.user.restore", "User"),
  ac.restoreUser,
);
router.delete(
  "/admin/users/:userId",
  auth,
  audit("admin.user.delete", "User"),
  ac.deleteUser,
);

// Broadcast notification
router.post(
  "/admin/notifications/broadcast",
  auth,
  audit("admin.notify.broadcast", "Notification"),
  ac.broadcastNotification,
);

// Club CRUD
router.post(
  "/admin/clubs",
  auth,
  audit("admin.club.create", "Club"),
  cac.createClub,
);
router.patch(
  "/admin/clubs/:clubId",
  auth,
  audit("admin.club.update", "Club"),
  cac.updateClub,
);
router.delete(
  "/admin/clubs/:clubId",
  auth,
  audit("admin.club.delete", "Club"),
  cac.deleteClub,
);
router.get("/admin/clubs/:clubId/roles", auth, cac.getClubRoles);
router.patch(
  "/admin/clubs/:clubId/secretary",
  auth,
  audit("admin.club.assign_secretary", "Club"),
  cac.assignSecretary,
);
router.delete(
  "/admin/clubs/:clubId/secretary",
  auth,
  audit("admin.club.remove_secretary", "Club"),
  cac.removeSecretary,
);
router.post(
  "/admin/clubs/:clubId/core-members",
  auth,
  audit("admin.club.add_core", "Club"),
  cac.addCoreMember,
);
router.delete(
  "/admin/clubs/:clubId/core-members/:userId",
  auth,
  audit("admin.club.remove_core", "Club"),
  cac.removeCoreMember,
);

// Rename request (approve/reject by admin)
router.patch(
  "/admin/clubs/:clubId/rename-request/approve",
  auth,
  audit("admin.club.rename.approve", "Club"),
  cac.approveRename,
);
router.patch(
  "/admin/clubs/:clubId/rename-request/reject",
  auth,
  audit("admin.club.rename.reject", "Club"),
  cac.rejectRename,
);

// External Invitations
router.get("/admin/external-invitations", auth, ac.listExternalInvites);
router.patch(
  "/admin/external-invitations/:inviteId/approve",
  auth,
  ac.approveExternalInvite,
);
router.patch(
  "/admin/external-invitations/:inviteId/reject",
  auth,
  ac.rejectExternalInvite,
);

router.delete(
  "/admin/clubs/:clubId/secretary",
  auth,
  audit("admin.club.remove_secretary", "Club"),
  cac.removeSecretary,
);
router.use(routeError);
module.exports = router;
