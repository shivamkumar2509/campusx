const Club = require("../models/club.model");
const ClubMember = require("../models/clubMember.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

const isAdmin = (req) => req.user?.role === "admin";

const VALID_TYPES = [
  "music",
  "coding",
  "robotics",
  "dance",
  "drama",
  "arts",
  "literature",
  "sports",
];

// ===== CREATE CLUB =====
// POST /api/admin/clubs
// Body: { name, display_name?, type, description?, secretary_id?, founded_year? }
exports.createClub = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");

  const {
    name,
    display_name = "",
    type,
    description = "",
    secretary_id,
    founded_year = null,
  } = req.body || {};

  if (!name || !String(name).trim())
    throw new HttpError(400, "VALIDATION_ERROR", "name is required");
  if (!type || !VALID_TYPES.includes(type))
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `type must be one of: ${VALID_TYPES.join(", ")}`,
    );

  const cleanName = String(name).trim().toLowerCase().replace(/\s+/g, "_");

  const existing = await Club.findOne({ name: cleanName });
  if (existing)
    throw new HttpError(
      409,
      "CLUB_EXISTS",
      "Club with this name already exists",
    );

  let secretaryUser = null;
  if (secretary_id) {
    if (!isObjectId(secretary_id))
      throw new HttpError(400, "INVALID_ID", "Invalid secretary_id");
    secretaryUser = await User.findById(secretary_id).select("_id name").lean();
    if (!secretaryUser)
      throw new HttpError(404, "USER_NOT_FOUND", "Secretary user not found");
  }

  const club = await Club.create({
    name: cleanName,
    display_name: display_name || name,
    type,
    description,
    secretary_id: secretaryUser?._id || req.user.id,
    founded_year,
    created_by: req.user.id,
    status: "active",
    member_count: secretaryUser ? 1 : 0,
  });

  // Auto-add secretary as ClubMember
  if (secretaryUser) {
    try {
      await ClubMember.create({
        club_id: club._id,
        user_id: secretaryUser._id,
        role: "secretary",
        status: "active",
        joined_at: new Date(),
        verified_by: req.user.id,
        verified_at: new Date(),
      });

      await createNotification({
        user: secretaryUser._id,
        type: "club_member_approved",
        title: "You're now a Club Secretary",
        message: `You have been assigned as secretary of "${club.display_name || club.name}".`,
        link: `/clubs/${club._id}`,
        priority: "high",
      });
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
  }

  return res.status(201).json({ success: true, data: club });
};

// ===== UPDATE CLUB =====
// PATCH /api/admin/clubs/:clubId
exports.updateClub = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId } = req.params;
  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const allowed = [
    "display_name",
    "description",
    "founded_year",
    "status",
    "type",
  ];
  const updates = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (updates.type && !VALID_TYPES.includes(updates.type))
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid type");
  if (
    updates.status &&
    !["active", "inactive", "suspended"].includes(updates.status)
  )
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid status");

  const club = await Club.findByIdAndUpdate(clubId, updates, {
    new: true,
    runValidators: true,
  });
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");

  return res.status(200).json({ success: true, data: club });
};

// ===== DELETE CLUB =====
// DELETE /api/admin/clubs/:clubId
exports.deleteClub = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId } = req.params;
  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const club = await Club.findByIdAndDelete(clubId);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");

  // Cleanup related docs (best-effort)
  await ClubMember.deleteMany({ club_id: clubId });

  return res.status(200).json({ success: true, message: "Club deleted" });
};

// ===== ASSIGN SECRETARY =====
// PATCH /api/admin/clubs/:clubId/secretary
// Body: { user_id }
exports.assignSecretary = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId } = req.params;
  const { user_id } = req.body || {};

  if (!isObjectId(clubId) || !isObjectId(user_id))
    throw new HttpError(400, "INVALID_ID", "Invalid id");

  const club = await Club.findById(clubId);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");

  const user = await User.findById(user_id).select("_id name").lean();
  if (!user) throw new HttpError(404, "USER_NOT_FOUND", "User not found");

  // Demote existing secretary to core_member (if any)
  await ClubMember.updateMany(
    { club_id: clubId, role: "secretary", status: "active" },
    { $set: { role: "core_member" } },
  );

  // Upsert new secretary
  await ClubMember.findOneAndUpdate(
    { club_id: clubId, user_id: user_id },
    {
      $set: {
        role: "secretary",
        status: "active",
        joined_at: new Date(),
        verified_by: req.user.id,
        verified_at: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  club.secretary_id = user_id;
  await club.save();

  await createNotification({
    user: user_id,
    type: "club_member_approved",
    title: "You're now a Club Secretary",
    message: `You have been assigned as secretary of "${club.display_name || club.name}".`,
    link: `/clubs/${clubId}`,
    priority: "high",
  });

  return res.status(200).json({ success: true, data: club });
};

// ===== REMOVE SECRETARY =====
// ===== REMOVE SECRETARY =====
exports.removeSecretary = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId } = req.params;
  const { userId } = req.body || {}; // Frontend se userId aayegi

  if (!isObjectId(clubId) || !isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid id");

  // ✅ Database se hamesha ke liye delete kar do
  const member = await ClubMember.findOneAndDelete({
    club_id: clubId,
    user_id: userId,
    role: "secretary",
  });

  if (!member)
    throw new HttpError(404, "MEMBER_NOT_FOUND", "Secretary not found");

  // ✅ Count update karo
  await Club.updateOne({ _id: clubId }, { $inc: { member_count: -1 } });

  return res.status(200).json({ success: true, message: "Secretary removed" });
};

// ===== REMOVE CORE MEMBER =====
exports.removeCoreMember = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId, userId } = req.params; // Route mein userId params se aa rahi hai

  if (!isObjectId(clubId) || !isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid id");

  // ✅ Database se hamesha ke liye delete kar do
  const member = await ClubMember.findOneAndDelete({
    club_id: clubId,
    user_id: userId,
    role: "core_member",
  });

  if (!member)
    throw new HttpError(404, "MEMBER_NOT_FOUND", "Core member not found");

  // ✅ Count update karo
  await Club.updateOne({ _id: clubId }, { $inc: { member_count: -1 } });

  return res
    .status(200)
    .json({ success: true, message: "Core member removed" });
};

// ===== ADD CORE MEMBER (JOINT SECRETARY) =====
// POST /api/admin/clubs/:clubId/core-members
// Body: { user_id }
exports.addCoreMember = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId } = req.params;
  const { user_id } = req.body || {};

  if (!isObjectId(clubId) || !isObjectId(user_id))
    throw new HttpError(400, "INVALID_ID", "Invalid id");

  const club = await Club.findById(clubId);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");

  const existing = await ClubMember.findOne({
    club_id: clubId,
    user_id: user_id,
    status: "active",
  });

  if (existing) {
    if (existing.role === "secretary")
      throw new HttpError(
        422,
        "ALREADY_SECRETARY",
        "User is already the secretary",
      );
    existing.role = "core_member";
    await existing.save();
    return res.status(200).json({ success: true, data: existing });
  }

  const member = await ClubMember.create({
    club_id: clubId,
    user_id,
    role: "core_member",
    status: "active",
    verified_by: req.user.id,
    verified_at: new Date(),
  });

  await Club.updateOne({ _id: clubId }, { $inc: { member_count: 1 } });

  await createNotification({
    user: user_id,
    type: "club_member_approved",
    title: "You're now a Joint Secretary",
    message: `You have been added as joint secretary (core member) of "${club.display_name || club.name}".`,
    link: `/clubs/${clubId}`,
    priority: "high",
  });

  return res.status(201).json({ success: true, data: member });
};

// ===== REMOVE CORE MEMBER =====
// DELETE /api/admin/clubs/:clubId/core-members/:userId
// backend/src/controllers/clubAdmin.controller.js
exports.removeCoreMember = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId, userId } = req.params; // Ye check kar lena ki dono aa rahe hain

  if (!isObjectId(clubId) || !isObjectId(userId))
    throw new HttpError(400, "INVALID_ID", "Invalid id");

  const member = await ClubMember.findOne({
    club_id: clubId,
    user_id: userId,
    role: "core_member",
    status: "active",
  });
  if (!member)
    throw new HttpError(404, "MEMBER_NOT_FOUND", "Core member not found");

  member.status = "left";
  member.left_at = new Date();
  await member.save();

  // ✅ Ye line hona zaroori hai count update ke liye
  await Club.updateOne({ _id: clubId }, { $inc: { member_count: -1 } });

  return res
    .status(200)
    .json({ success: true, message: "Core member removed" });
};

// ===== LIST CLUB ROLES (for admin panel) =====
// GET /api/admin/clubs/:clubId/roles
exports.getClubRoles = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId } = req.params;
  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const club = await Club.findById(clubId).lean();
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");

  const members = await ClubMember.find({
    club_id: clubId,
    status: "active",
  })
    .populate("user_id", "name email avatar_url year")
    .sort({ role: 1, joined_at: 1 })
    .lean();

  const data = members.map((m) => ({
    _id: m._id,
    user_id: m.user_id?._id,
    name: m.user_id?.name,
    email: m.user_id?.email,
    avatar_url: m.user_id?.avatar_url,
    year: m.user_id?.year,
    role: m.role,
    status: m.status,
    joined_at: m.joined_at,
  }));

  return res.status(200).json({
    success: true,
    data: {
      club: {
        _id: club._id,
        name: club.name,
        display_name: club.display_name,
        type: club.type,
      },
      members: data,
    },
  });
};

// ===== SECRETARY — REQUEST RENAME =====
// POST /api/clubs/:clubId/rename-request
// Body: { requested_name, reason? }
exports.requestRename = async (req, res) => {
  const { clubId } = req.params;
  const { requested_name, reason = "" } = req.body || {};

  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");
  if (!requested_name || !String(requested_name).trim())
    throw new HttpError(400, "VALIDATION_ERROR", "requested_name is required");

  const club = await Club.findById(clubId);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");

  // Only secretary can request
  const isSecretary = await ClubMember.exists({
    club_id: clubId,
    user_id: req.user.id,
    role: "secretary",
    status: "active",
  });
  if (!isSecretary)
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only the club secretary can request a rename",
    );

  if (club.rename_request_status === "pending")
    throw new HttpError(
      409,
      "REQUEST_EXISTS",
      "A rename request is already pending",
    );

  club.rename_request_status = "pending";
  club.rename_requested_name = String(requested_name).trim();
  club.rename_requested_by = req.user.id;
  club.rename_requested_at = new Date();
  club.rename_rejection_reason = null;
  await club.save();

  // Notify all admins
  const admins = await User.find({ role: "admin", status: "active" })
    .select("_id")
    .lean();
  for (const a of admins) {
    await createNotification({
      user: a._id,
      type: "club_rename_request",
      title: "Club rename request",
      message: `"${club.display_name || club.name}" wants to be renamed to "${requested_name}".`,
      link: `/admin/dashboard`,
      priority: "medium",
    });
  }

  return res.status(201).json({ success: true, data: club });
};

// ===== ADMIN — APPROVE RENAME =====
// PATCH /api/admin/clubs/:clubId/rename-request/approve
exports.approveRename = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId } = req.params;
  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const club = await Club.findById(clubId);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");
  if (club.rename_request_status !== "pending")
    throw new HttpError(422, "NO_PENDING_REQUEST", "No pending rename request");

  const newName = club.rename_requested_name;
  const requestedBy = club.rename_requested_by;

  if (newName) {
    const clash = await Club.findOne({ name: newName, _id: { $ne: club._id } });
    if (clash)
      throw new HttpError(
        409,
        "NAME_TAKEN",
        "Another club already uses this name",
      );
    club.name = newName.toLowerCase().replace(/\s+/g, "_");
    club.display_name = newName;
  }

  club.rename_request_status = "approved";
  club.rename_requested_name = null;
  club.rename_requested_by = null;
  club.rename_requested_at = null;
  club.rename_rejection_reason = null;
  await club.save();

  if (requestedBy) {
    await createNotification({
      user: requestedBy,
      type: "club_rename_approved",
      title: "Rename approved",
      message: `Your rename request for "${club.display_name || club.name}" was approved.`,
      link: `/clubs/${clubId}`,
      priority: "high",
    });
  }

  return res.status(200).json({ success: true, data: club });
};

// ===== ADMIN — REJECT RENAME =====
// PATCH /api/admin/clubs/:clubId/rename-request/reject
// Body: { rejection_reason? }
exports.rejectRename = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { clubId } = req.params;
  const { rejection_reason = "" } = req.body || {};

  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const club = await Club.findById(clubId);
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");
  if (club.rename_request_status !== "pending")
    throw new HttpError(422, "NO_PENDING_REQUEST", "No pending rename request");

  const requestedBy = club.rename_requested_by;

  club.rename_request_status = "rejected";
  club.rename_rejection_reason = String(rejection_reason).trim();
  club.rename_requested_name = null;
  club.rename_requested_by = null;
  club.rename_requested_at = null;
  await club.save();

  if (requestedBy) {
    await createNotification({
      user: requestedBy,
      type: "club_rename_approved", // use same type bucket for club pref gating
      title: "Rename request rejected",
      message: `Your rename request for "${club.display_name || club.name}" was rejected.${rejection_reason ? ` Reason: ${rejection_reason}` : ""}`,
      link: `/clubs/${clubId}`,
      priority: "medium",
    });
  }

  return res.status(200).json({ success: true, data: club });
};
