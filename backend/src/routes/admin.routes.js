const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const { audit } = require("../middleware/audit.middleware");
const c = require("../controllers/admin.controller");

const router = express.Router();

// ===== Analytics =====
router.get("/admin/analytics", auth, c.getAnalytics);
router.get("/admin/analytics/export", auth, c.exportAnalytics);
router.get("/admin/audit-logs", auth, c.listAuditLogs);

// ===== Student management =====
router.get("/admin/students", auth, c.listStudents);
router.get("/admin/students/:userId", auth, c.getStudent);
router.post(
  "/admin/students",
  auth,
  audit("admin.student.create", "User"),
  c.createStudent,
);
router.patch(
  "/admin/students/:userId/approve",
  auth,
  audit("admin.student.approve", "User"),
  c.approveStudent,
);
router.patch(
  "/admin/students/:userId/suspend",
  auth,
  audit("admin.student.suspend", "User"),
  c.suspendStudent,
);
router.patch(
  "/admin/students/:userId/restore",
  auth,
  audit("admin.student.restore", "User"),
  c.restoreStudent,
);
router.delete(
  "/admin/students/:userId",
  auth,
  audit("admin.student.delete", "User"),
  c.hardDeleteStudent,
);

// ===== Club role management =====
router.get("/admin/clubs/:clubId/roles", auth, c.listClubRoles);
router.post(
  "/admin/clubs/:clubId/secretary",
  auth,
  audit("admin.club.secretary.assign", "Club"),
  c.assignSecretary,
);
router.delete(
  "/admin/clubs/:clubId/secretary/:userId",
  auth,
  audit("admin.club.secretary.remove", "Club"),
  c.removeSecretary,
);
router.post(
  "/admin/clubs/:clubId/core-members",
  auth,
  audit("admin.club.core_member.add", "Club"),
  c.addCoreMember,
);
router.delete(
  "/admin/clubs/:clubId/core-members/:userId",
  auth,
  audit("admin.club.core_member.remove", "Club"),
  c.removeCoreMember,
);

router.use(routeError);

module.exports = router;
