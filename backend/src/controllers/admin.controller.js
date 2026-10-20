const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const User = require("../models/user.model");
const Team = require("../models/team.model");
const Event = require("../models/event.model");
const Club = require("../models/club.model");
const Feedback = require("../models/feedback.model");
const AuditLog = require("../models/auditLog.model");
const ExternalInvitation = require("../models/externalInvitation.model");

const HttpError = require("../utils/httpError");
// ✅ Clean imports (Duplicate hataye)
const {
  isObjectId,
  getPagination,
  buildMeta,
} = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

// GET /api/admin/analytics
exports.getAnalytics = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const [
    usersTotal,
    usersStudents,
    usersAdmins,
    teamsTotal,
    teamsConfirmed,
    eventsTotal,
    eventsPublished,
    clubsActive,
    feedbackAvg,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "admin" }),
    Team.countDocuments({}),
    Team.countDocuments({ status: "confirmed" }),
    Event.countDocuments({}),
    Event.countDocuments({ status: "published" }),
    Club.countDocuments({ status: "active" }),
    Feedback.aggregate([
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
  ]);

  const rating = feedbackAvg[0]
    ? Math.round(feedbackAvg[0].avg * 100) / 100
    : 0;
  const feedbackCount = feedbackAvg[0] ? feedbackAvg[0].count : 0;

  return res.status(200).json({
    success: true,
    data: {
      users: {
        total: usersTotal,
        students: usersStudents,
        admins: usersAdmins,
      },
      teams: { total: teamsTotal, confirmed: teamsConfirmed },
      events: { total: eventsTotal, published: eventsPublished },
      clubs: { active: clubsActive },
      feedback: { average_rating: rating, total: feedbackCount },
    },
  });
};

// GET /api/admin/audit-logs?page=&limit=
exports.getAuditLogs = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const { page, limit, skip } = getPagination(req.query);

  const [items, total] = await Promise.all([
    AuditLog.find({})
      .populate("user_id", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments({}),
  ]);

  return res.status(200).json({
    success: true,
    data: items,
    meta: buildMeta(page, limit, total),
  });
};

// GET /api/admin/analytics/export
exports.exportAnalytics = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const [users, teams, events, clubs] = await Promise.all([
    User.countDocuments({}),
    Team.countDocuments({}),
    Event.countDocuments({}),
    Club.countDocuments({}),
  ]);

  const csv = [
    "metric,value",
    `total_users,${users}`,
    `total_teams,${teams}`,
    `total_events,${events}`,
    `total_clubs,${clubs}`,
    `exported_at,${new Date().toISOString()}`,
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="campusx-analytics.csv"',
  );
  return res.status(200).send(csv);
};

// ===== LIST STUDENTS / USERS =====
// GET /api/admin/students?status=&role=&q=&page=&limit=
exports.listUsers = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const { page, limit, skip } = getPagination(req.query);
  const filter = {};

  if (req.query.status) {
    if (
      !["pending_approval", "active", "suspended"].includes(req.query.status)
    ) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid status");
    }
    filter.status = req.query.status;
  }
  if (req.query.role) {
    if (!["student", "admin"].includes(req.query.role)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid role");
    }
    filter.role = req.query.role;
  }
  if (req.query.q && typeof req.query.q === "string") {
    const q = req.query.q.trim();
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("-password_hash -github_data")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: items,
    meta: buildMeta(page, limit, total),
  });
};

// ===== APPROVE USER =====
// PATCH /api/admin/users/:userId/approve
exports.approveUser = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const { userId } = req.params;
  if (!isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid user id");

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  if (user.status === "active")
    throw new HttpError(422, "ALREADY_ACTIVE", "User is already active");

  user.status = "active";
  await user.save();

  // Welcome notification
  await createNotification({
    user: user._id,
    type: "account_approved",
    title: "Welcome to CampusX! 🎉",
    message: "Your account has been approved. You can now log in.",
    link: "/dashboard",
    priority: "high",
  });

  return res.status(200).json({ success: true, data: user });
};

// ===== SUSPEND USER =====
// PATCH /api/admin/users/:userId/suspend
exports.suspendUser = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const { userId } = req.params;
  if (!isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid user id");

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  if (user.role === "admin")
    throw new HttpError(422, "CANNOT_SUSPEND_ADMIN", "Cannot suspend an admin");

  user.status = "suspended";
  await user.save();

  return res.status(200).json({ success: true, data: user });
};

// ===== RESTORE USER =====
// PATCH /api/admin/users/:userId/restore
exports.restoreUser = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const { userId } = req.params;
  if (!isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid user id");

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  user.status = "active";
  await user.save();

  return res.status(200).json({ success: true, data: user });
};

// ===== DELETE USER =====
// DELETE /api/admin/users/:userId
exports.deleteUser = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const { userId } = req.params;
  if (!isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid user id");

  if (String(userId) === String(req.user.id))
    throw new HttpError(
      422,
      "CANNOT_DELETE_SELF",
      "You cannot delete yourself",
    );

  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  return res.status(200).json({ success: true, message: "User deleted" });
};

// ===== CREATE USER (admin-created with temp password) =====
// POST /api/admin/users
exports.createUser = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const {
    role = "student",
    name,
    username,
    year,
    batch,
    branch,
  } = req.body || {};

  if (!name || !username)
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "name and username are required",
    );
  if (!["student", "admin"].includes(role))
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid role");

  const DOMAINS = {
    student: "@iiitvadodara.ac.in",
    admin: "@iiitv.ac.in",
  };

  const cleanUsername = String(username).trim().toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(cleanUsername))
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid username format");

  const email = `${cleanUsername}${DOMAINS[role]}`;

  const existing = await User.findOne({ email });
  if (existing)
    throw new HttpError(409, "EMAIL_EXISTS", "Email already registered");

  // Generate temp password
  const tempPassword = crypto
    .randomBytes(6)
    .toString("base64")
    .replace(/[+/=]/g, "")
    .slice(0, 10);
  const password_hash = await bcrypt.hash(tempPassword, 10);

  const user = await User.create({
    name: name.trim(),
    email,
    password_hash,
    year: role === "student" ? year || 1 : 1,
    batch: role === "student" ? batch || null : null,
    branch: role === "student" ? branch || "" : "", // ✅ Branch add kiya
    role,
    status: "pending_approval",
    must_change_password: true,
  });

  return res.status(201).json({
    success: true,
    data: {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        year: user.year,
        batch: user.batch,
        branch: user.branch, // ✅ Response mein bhi bheja
        status: user.status,
      },
      temp_password: tempPassword,
    },
  });
};

// ===== BROADCAST NOTIFICATION =====
// POST /api/admin/notifications/broadcast
exports.broadcastNotification = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const {
    title,
    message,
    link = "",
    priority = "medium",
    target = "all",
  } = req.body || {};

  if (!title || !message)
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "title and message are required",
    );
  if (!["all", "students", "admins"].includes(target))
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid target");

  const filter = { status: "active" };
  if (target === "students") filter.role = "student";
  if (target === "admins") filter.role = "admin";

  const users = await User.find(filter).select("_id").lean();
  if (users.length === 0)
    return res.status(200).json({ success: true, data: { sent: 0 } });

  let sentCount = 0;
  for (const u of users) {
    const notif = await createNotification({
      user: u._id,
      type: "admin_broadcast",
      title,
      message,
      link,
      priority,
      is_broadcast: true,
    });
    if (notif) sentCount++;
  }

  return res.status(200).json({
    success: true,
    data: { sent: sentCount, target },
  });
};

// ===== EXTERNAL INVITATIONS =====
exports.listExternalInvites = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");

  const invites = await ExternalInvitation.find({ status: "registered" })
    .populate("registered_user_id", "name email year status")
    .populate("team_id", "name")
    .populate("invited_by", "name")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: invites });
};

exports.approveExternalInvite = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { inviteId } = req.params;

  const invite = await ExternalInvitation.findById(inviteId);
  if (!invite) throw new HttpError(404, "NOT_FOUND", "Invite not found");

  invite.status = "approved";
  invite.approved_by.push(req.user.id);
  invite.approved_at = new Date();
  await invite.save();

  await User.findByIdAndUpdate(invite.registered_user_id, { status: "active" });

  res.status(200).json({ success: true, message: "External user approved" });
};

exports.rejectExternalInvite = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { inviteId } = req.params;

  const invite = await ExternalInvitation.findById(inviteId);
  if (!invite) throw new HttpError(404, "NOT_FOUND", "Invite not found");

  invite.status = "rejected";
  invite.rejected_by.push(req.user.id);
  await invite.save();

  await User.findByIdAndUpdate(invite.registered_user_id, {
    status: "suspended",
  });

  res.status(200).json({ success: true, message: "External user rejected" });
};
