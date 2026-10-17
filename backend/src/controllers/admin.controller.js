const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const AuditLog = require("../models/auditLog.model");
const User = require("../models/user.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const Event = require("../models/event.model");
const Club = require("../models/club.model");
const ClubMember = require("../models/clubMember.model");
const ClubApplication = require("../models/clubApplication.model");
const Enrollment = require("../models/enrollment.model");
const Skill = require("../models/skill.model");
const ConversationMember = require("../models/conversationMember.model");

const HttpError = require("../utils/httpError");
const {
  isObjectId,
  getPagination,
  buildMeta,
  getSort,
} = require("../utils/queryHelpers");

const asString = (v) => (typeof v === "string" ? v.trim() : "");

const assertAdmin = (req) => {
  if (!req.user || req.user.role !== "admin") {
    throw new HttpError(403, "FORBIDDEN", "Admin only");
  }
};

const STUDENT_DOMAIN = "@iiitvadodara.ac.in";
const FACULTY_DOMAIN = "@iiitv.ac.in";

const genTempPassword = () => {
  // 8-char, easy to read (no 0/O/1/l/I)
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
};

// ==================== ANALYTICS ====================

exports.getAnalytics = async (req, res) => {
  assertAdmin(req);

  const [
    users,
    students,
    admins,
    pending,
    suspended,
    teams,
    confirmedTeams,
    events,
    publishedEvents,
    clubs,
    activeClubs,
    clubMembers,
    clubApplications,
    enrollments,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "admin" }),
    User.countDocuments({ status: "pending_approval" }),
    User.countDocuments({ status: "suspended" }),
    Team.countDocuments(),
    Team.countDocuments({ status: "confirmed" }),
    Event.countDocuments(),
    Event.countDocuments({ status: "published" }),
    Club.countDocuments(),
    Club.countDocuments({ status: "active" }),
    ClubMember.countDocuments({ status: "active" }),
    ClubApplication.countDocuments(),
    Enrollment.countDocuments(),
  ]);

  const day = 24 * 60 * 60 * 1000;
  const now = new Date();
  const dayBuckets = [];
  for (let i = 6; i >= 0; i -= 1) {
    const start = new Date(now.getTime() - i * day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + day);
    dayBuckets.push({ start, end });
  }

  const userSeries = await Promise.all(
    dayBuckets.map((b) =>
      User.countDocuments({ createdAt: { $gte: b.start, $lt: b.end } }),
    ),
  );

  const teamSeries = await Promise.all(
    dayBuckets.map((b) =>
      Team.countDocuments({ createdAt: { $gte: b.start, $lt: b.end } }),
    ),
  );

  const applicationSeries = await Promise.all(
    dayBuckets.map((b) =>
      ClubApplication.countDocuments({
        applied_at: { $gte: b.start, $lt: b.end },
      }),
    ),
  );

  const activity_7d = dayBuckets.map((b, i) => ({
    date: b.start.toISOString().slice(0, 10),
    users: userSeries[i],
    teams: teamSeries[i],
    applications: applicationSeries[i],
  }));

  return res.status(200).json({
    success: true,
    data: {
      counts: {
        users,
        students,
        admins,
        pending_approval: pending,
        suspended,
        teams,
        confirmed_teams: confirmedTeams,
        events,
        published_events: publishedEvents,
        clubs,
        active_clubs: activeClubs,
        club_members: clubMembers,
        club_applications: clubApplications,
        enrollments,
      },
      activity_7d,
    },
  });
};

exports.exportAnalytics = async (req, res) => {
  assertAdmin(req);

  const [
    users,
    students,
    admins,
    teams,
    events,
    clubs,
    applications,
    enrollments,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "admin" }),
    Team.countDocuments(),
    Event.countDocuments(),
    Club.countDocuments(),
    ClubApplication.countDocuments(),
    Enrollment.countDocuments(),
  ]);

  const recentLogs = await AuditLog.find()
    .populate("user_id", "name email")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [];
  lines.push("# CampusX Admin Export");
  lines.push(`# Generated at,${new Date().toISOString()}`);
  lines.push("");
  lines.push("Section,Metric,Value");
  lines.push(`Summary,Users,${users}`);
  lines.push(`Summary,Students,${students}`);
  lines.push(`Summary,Admins,${admins}`);
  lines.push(`Summary,Teams,${teams}`);
  lines.push(`Summary,Events,${events}`);
  lines.push(`Summary,Clubs,${clubs}`);
  lines.push(`Summary,Club Applications,${applications}`);
  lines.push(`Summary,Event Enrollments,${enrollments}`);
  lines.push("");

  lines.push("# Recent Audit Logs (last 100)");
  lines.push("Timestamp,User Name,User Email,Action,Entity Type,Entity ID,IP");
  recentLogs.forEach((l) => {
    lines.push(
      [
        l.createdAt ? new Date(l.createdAt).toISOString() : "",
        esc(l.user_id?.name || ""),
        esc(l.user_id?.email || ""),
        esc(l.action || ""),
        esc(l.entity_type || ""),
        esc(l.entity_id || ""),
        esc(l.ip_address || ""),
      ].join(","),
    );
  });

  const csv = lines.join("\n");
  const filename = `campusx-admin-export-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(csv);
};

exports.listAuditLogs = async (req, res) => {
  assertAdmin(req);

  const { page, limit, skip } = getPagination(req.query);
  const sort = getSort(req.query, ["createdAt"], "createdAt", "desc");
  const filter = {};

  const action = asString(req.query.action);
  if (action) filter.action = action;
  const entityType = asString(req.query.entity_type);
  if (entityType) filter.entity_type = entityType;

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("user_id", "name email role")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json({ success: true, data: items, meta: buildMeta(page, limit, total) });
};

// ==================== STUDENT MANAGEMENT ====================

// GET /api/admin/students?year=&batch=&status=&role=&q=&page=&limit=
exports.listStudents = async (req, res) => {
  assertAdmin(req);

  const { page, limit, skip } = getPagination(req.query);
  const sort = getSort(
    req.query,
    ["createdAt", "name", "year", "batch"],
    "createdAt",
    "desc",
  );
  const filter = {};

  const role = asString(req.query.role) || "student";
  if (["student", "admin"].includes(role)) filter.role = role;

  const status = asString(req.query.status);
  if (status) {
    if (!["pending_approval", "active", "suspended"].includes(status)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid status filter");
    }
    filter.status = status;
  }

  const year = Number.parseInt(req.query.year, 10);
  if (Number.isInteger(year) && year >= 1 && year <= 4) {
    filter.year = year;
  }

  const batch = Number.parseInt(req.query.batch, 10);
  if (Number.isInteger(batch) && batch >= 2000 && batch <= 2100) {
    filter.batch = batch;
  }

  const q = asString(req.query.q);
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("-password_hash")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return res
    .status(200)
    .json({ success: true, data: items, meta: buildMeta(page, limit, total) });
};

// GET /api/admin/students/:userId — detailed view
exports.getStudent = async (req, res) => {
  assertAdmin(req);
  const { userId } = req.params;
  if (!isObjectId(userId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid user id");
  }

  const user = await User.findById(userId).select("-password_hash").lean();
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  const [skills, clubMemberships, teamMemberships] = await Promise.all([
    Skill.find({ user_id: userId }).lean(),
    ClubMember.find({ user_id: userId, status: "active" })
      .populate("club_id", "name display_name type")
      .lean(),
    TeamMember.find({ user_id: userId, status: "accepted" })
      .populate("team_id", "name status")
      .lean(),
  ]);

  return res.status(200).json({
    success: true,
    data: { ...user, skills, clubs: clubMemberships, teams: teamMemberships },
  });
};

// POST /api/admin/students
// Body: { role, name, username, year?, batch? }
exports.createStudent = async (req, res) => {
  assertAdmin(req);
  const body = req.body || {};

  const role = body.role === "admin" ? "admin" : "student";
  const name = asString(body.name);
  const username = asString(body.username).toLowerCase();

  if (!name) throw new HttpError(400, "VALIDATION_ERROR", "name is required");
  if (!username)
    throw new HttpError(400, "VALIDATION_ERROR", "username is required");
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "username must be 3–32 chars, lowercase letters/digits/._- only",
    );
  }

  const domain = role === "admin" ? FACULTY_DOMAIN : STUDENT_DOMAIN;
  const email = `${username}${domain}`;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new HttpError(409, "EMAIL_EXISTS", `Email ${email} already exists`);
  }

  let year = 1;
  let batch = null;
  if (role === "student") {
    year = Number.parseInt(body.year, 10);
    if (!Number.isInteger(year) || year < 1 || year > 4) {
      throw new HttpError(400, "VALIDATION_ERROR", "year must be 1–4");
    }
    const b = Number.parseInt(body.batch, 10);
    if (Number.isInteger(b) && b >= 2000 && b <= 2100) {
      batch = b;
    } else {
      // Infer batch from year using current academic year
      const now = new Date();
      const acadYear =
        now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      batch = acadYear - year + 1;
    }
  }

  const tempPassword = genTempPassword();
  const password_hash = await bcrypt.hash(tempPassword, 10);

  const user = await User.create({
    name,
    email,
    password_hash,
    role,
    year,
    batch,
    status: "pending_approval",
    must_change_password: true,
  });

  res.locals.auditEntityId = user._id;

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
        status: user.status,
      },
      temp_password: tempPassword,
    },
    message:
      "Account created. Share the temporary password with the user. Admin approval required before login.",
  });
};

// PATCH /api/admin/students/:userId/approve
exports.approveStudent = async (req, res) => {
  assertAdmin(req);
  const { userId } = req.params;
  if (!isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid user id");

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  if (user.status !== "pending_approval") {
    throw new HttpError(422, "INVALID_STATUS", "User is not pending approval");
  }

  user.status = "active";
  await user.save();

  res.locals.auditEntityId = user._id;

  return res.status(200).json({
    success: true,
    data: { _id: user._id, status: user.status },
  });
};

// PATCH /api/admin/students/:userId/suspend
exports.suspendStudent = async (req, res) => {
  assertAdmin(req);
  const { userId } = req.params;
  if (!isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid user id");
  if (String(userId) === String(req.user.id)) {
    throw new HttpError(
      422,
      "CANNOT_SUSPEND_SELF",
      "You cannot suspend your own account",
    );
  }

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  // Prevent suspending the last active admin
  if (user.role === "admin") {
    const activeAdmins = await User.countDocuments({
      role: "admin",
      status: "active",
    });
    if (activeAdmins <= 1) {
      throw new HttpError(
        422,
        "LAST_ADMIN",
        "Cannot suspend the last active admin",
      );
    }
  }

  user.status = "suspended";
  await user.save();

  res.locals.auditEntityId = user._id;

  return res.status(200).json({
    success: true,
    data: { _id: user._id, status: user.status },
  });
};

// PATCH /api/admin/students/:userId/restore
exports.restoreStudent = async (req, res) => {
  assertAdmin(req);
  const { userId } = req.params;
  if (!isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid user id");

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  user.status = "active";
  await user.save();

  res.locals.auditEntityId = user._id;

  return res.status(200).json({
    success: true,
    data: { _id: user._id, status: user.status },
  });
};

// DELETE /api/admin/students/:userId — hard delete + cascade
exports.hardDeleteStudent = async (req, res) => {
  assertAdmin(req);
  const { userId } = req.params;
  if (!isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid user id");
  if (String(userId) === String(req.user.id)) {
    throw new HttpError(
      422,
      "CANNOT_DELETE_SELF",
      "You cannot delete your own account",
    );
  }

  const user = await User.findById(userId);
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  if (user.role === "admin") {
    const activeAdmins = await User.countDocuments({
      role: "admin",
      status: "active",
    });
    if (activeAdmins <= 1) {
      throw new HttpError(
        422,
        "LAST_ADMIN",
        "Cannot delete the last active admin",
      );
    }
  }

  // Cascade delete related rows
  await Promise.all([
    Skill.deleteMany({ user_id: userId }),
    ClubMember.deleteMany({ user_id: userId }),
    TeamMember.deleteMany({ user_id: userId }),
    Enrollment.deleteMany({ user_id: userId }),
    ClubApplication.deleteMany({ user_id: userId }),
    ConversationMember.deleteMany({ user_id: userId }),
  ]);

  await User.deleteOne({ _id: userId });

  return res.status(200).json({
    success: true,
    message: "User permanently deleted",
  });
};

// ==================== CLUB ROLE MANAGEMENT ====================

// POST /api/admin/clubs/:clubId/secretary  Body: { user_id }
exports.assignSecretary = async (req, res) => {
  assertAdmin(req);
  const { clubId } = req.params;
  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const { user_id } = req.body || {};
  if (!isObjectId(user_id)) {
    throw new HttpError(400, "VALIDATION_ERROR", "user_id is required");
  }

  const [club, user] = await Promise.all([
    Club.findById(clubId),
    User.findById(user_id).select("name email status role").lean(),
  ]);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  if (user.status !== "active") {
    throw new HttpError(422, "INVALID_STATUS", "User is not active");
  }

  // Demote current secretary (if any) to core_member
  if (club.secretary_id) {
    await ClubMember.updateOne(
      { club_id: clubId, user_id: club.secretary_id },
      { $set: { role: "core_member" } },
    );
  }

  // Upsert new secretary
  await ClubMember.updateOne(
    { club_id: clubId, user_id },
    {
      $set: {
        club_id: clubId,
        user_id,
        role: "secretary",
        status: "active",
        joined_at: new Date(),
      },
    },
    { upsert: true },
  );

  // Update club doc
  club.secretary_id = user_id;
  await club.save();

  res.locals.auditEntityId = club._id;

  return res.status(200).json({
    success: true,
    data: {
      club_id: club._id,
      secretary_id: user_id,
      secretary_name: user.name,
    },
  });
};

// DELETE /api/admin/clubs/:clubId/secretary/:userId
exports.removeSecretary = async (req, res) => {
  assertAdmin(req);
  const { clubId, userId } = req.params;
  if (!isObjectId(clubId) || !isObjectId(userId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid id");
  }

  const club = await Club.findById(clubId);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");

  if (String(club.secretary_id) !== String(userId)) {
    throw new HttpError(422, "NOT_SECRETARY", "This user is not the secretary");
  }

  // Downgrade to core_member
  await ClubMember.updateOne(
    { club_id: clubId, user_id: userId },
    { $set: { role: "core_member" } },
  );

  club.secretary_id = null;
  await club.save();

  res.locals.auditEntityId = club._id;

  return res.status(200).json({ success: true });
};

// POST /api/admin/clubs/:clubId/core-members  Body: { user_id }
exports.addCoreMember = async (req, res) => {
  assertAdmin(req);
  const { clubId } = req.params;
  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const { user_id } = req.body || {};
  if (!isObjectId(user_id)) {
    throw new HttpError(400, "VALIDATION_ERROR", "user_id is required");
  }

  const [club, user] = await Promise.all([
    Club.findById(clubId).select("_id").lean(),
    User.findById(user_id).select("name email status").lean(),
  ]);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  if (user.status !== "active") {
    throw new HttpError(422, "INVALID_STATUS", "User is not active");
  }

  await ClubMember.updateOne(
    { club_id: clubId, user_id },
    {
      $set: {
        club_id: clubId,
        user_id,
        role: "core_member",
        status: "active",
        joined_at: new Date(),
      },
    },
    { upsert: true },
  );

  res.locals.auditEntityId = club._id;

  return res.status(200).json({
    success: true,
    data: { club_id: clubId, user_id, role: "core_member" },
  });
};

// DELETE /api/admin/clubs/:clubId/core-members/:userId
exports.removeCoreMember = async (req, res) => {
  assertAdmin(req);
  const { clubId, userId } = req.params;
  if (!isObjectId(clubId) || !isObjectId(userId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid id");
  }

  const membership = await ClubMember.findOne({
    club_id: clubId,
    user_id: userId,
    role: "core_member",
    status: "active",
  });
  if (!membership) {
    throw new HttpError(
      404,
      "MEMBERSHIP_NOT_FOUND",
      "No active core membership found",
    );
  }

  membership.status = "left";
  membership.left_at = new Date();
  await membership.save();

  res.locals.auditEntityId = clubId;

  return res.status(200).json({ success: true });
};

// GET /api/admin/clubs/:clubId/roles — list secretaries + core members + members
exports.listClubRoles = async (req, res) => {
  assertAdmin(req);
  const { clubId } = req.params;
  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const club = await Club.findById(clubId)
    .select("name display_name secretary_id")
    .lean();
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");

  const members = await ClubMember.find({
    club_id: clubId,
    status: "active",
  })
    .populate("user_id", "name email year batch status")
    .sort({ role: 1, joined_at: 1 })
    .lean();

  const data = members.map((m) => ({
    _id: m._id,
    user_id: m.user_id?._id,
    name: m.user_id?.name,
    email: m.user_id?.email,
    year: m.user_id?.year,
    batch: m.user_id?.batch,
    user_status: m.user_id?.status,
    role: m.role,
    joined_at: m.joined_at,
  }));

  return res.status(200).json({
    success: true,
    data: {
      club: {
        _id: club._id,
        name: club.name,
        display_name: club.display_name,
        secretary_id: club.secretary_id,
      },
      members: data,
    },
  });
};
