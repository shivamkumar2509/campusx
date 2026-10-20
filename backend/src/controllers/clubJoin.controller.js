const ClubJoinRequest = require("../models/clubJoinRequest.model");
const Club = require("../models/club.model");
const ClubMember = require("../models/clubMember.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

// Helper: user is secretary or core_member of this club
const getClubManagerRole = async (clubId, userId) => {
  const membership = await ClubMember.findOne({
    club_id: clubId,
    user_id: userId,
    status: "active",
    role: { $in: ["secretary", "core_member"] },
  }).lean();
  return membership ? membership.role : null;
};

// Helper: notify all secretaries + core members of a club
const notifyClubManagers = async (clubId, payload) => {
  const managers = await ClubMember.find({
    club_id: clubId,
    status: "active",
    role: { $in: ["secretary", "core_member"] },
  })
    .select("user_id")
    .lean();

  for (const m of managers) {
    await createNotification({ user: m.user_id, ...payload });
  }
};

// ===== STUDENT — RAISE JOIN REQUEST =====
// POST /api/clubs/:clubId/join-request
exports.raiseJoinRequest = async (req, res) => {
  const { clubId } = req.params;
  const { message = "" } = req.body || {};

  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const club = await Club.findById(clubId).lean();
  if (!club) throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");
  if (club.status !== "active")
    throw new HttpError(
      422,
      "CLUB_INACTIVE",
      "This club is not accepting members",
    );

  // Already an active member?
  const isMember = await ClubMember.exists({
    club_id: clubId,
    user_id: req.user.id,
    status: "active",
  });
  if (isMember)
    throw new HttpError(
      422,
      "ALREADY_MEMBER",
      "You are already a member of this club",
    );

  // Already pending?
  const existingPending = await ClubJoinRequest.findOne({
    club_id: clubId,
    user_id: req.user.id,
    status: { $in: ["pending", "verification_scheduled"] },
  });
  if (existingPending)
    throw new HttpError(
      409,
      "REQUEST_EXISTS",
      "You already have an active join request",
    );

  const request = await ClubJoinRequest.create({
    club_id: clubId,
    user_id: req.user.id,
    message: String(message).trim(),
    status: "pending",
    raised_at: new Date(),
  });

  const applicant = await User.findById(req.user.id).select("name").lean();

  // Notify all managers
  await notifyClubManagers(clubId, {
    type: "club_join_request",
    title: "New join request",
    message: `${applicant?.name || "A student"} wants to join "${club.display_name || club.name}"`,
    link: `/clubs/${clubId}/join-requests`,
    priority: "high",
  });

  return res.status(201).json({ success: true, data: request });
};

// ===== STUDENT — CANCEL OWN REQUEST =====
// DELETE /api/join-requests/:requestId
exports.cancelJoinRequest = async (req, res) => {
  const { requestId } = req.params;
  if (!isObjectId(requestId))
    throw new HttpError(400, "INVALID_ID", "Invalid request id");

  const request = await ClubJoinRequest.findById(requestId);
  if (!request)
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Request not found");
  if (String(request.user_id) !== String(req.user.id))
    throw new HttpError(403, "FORBIDDEN", "Only the requester can cancel");
  if (!["pending", "verification_scheduled"].includes(request.status))
    throw new HttpError(
      422,
      "REQUEST_CLOSED",
      "This request is already resolved",
    );

  request.status = "cancelled";
  request.responded_at = new Date();
  await request.save();

  return res.status(200).json({ success: true, data: request });
};

// ===== STUDENT — GET MY REQUESTS =====
// GET /api/users/me/join-requests
exports.getMyJoinRequests = async (req, res) => {
  const requests = await ClubJoinRequest.find({ user_id: req.user.id })
    .populate("club_id", "name display_name type")
    .sort({ createdAt: -1 })
    .lean();
  return res.status(200).json({ success: true, data: requests });
};

// ===== SECRETARY/CORE — LIST REQUESTS FOR A CLUB =====
// GET /api/clubs/:clubId/join-requests?status=
exports.listClubJoinRequests = async (req, res) => {
  const { clubId } = req.params;
  if (!isObjectId(clubId))
    throw new HttpError(400, "INVALID_ID", "Invalid club id");

  const managerRole = await getClubManagerRole(clubId, req.user.id);
  if (!managerRole)
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only club managers can view requests",
    );

  const filter = { club_id: clubId };
  if (req.query.status) {
    const allowed = [
      "pending",
      "verification_scheduled",
      "approved",
      "rejected",
      "cancelled",
    ];
    if (!allowed.includes(req.query.status))
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid status");
    filter.status = req.query.status;
  }

  const requests = await ClubJoinRequest.find(filter)
    .populate(
      "user_id",
      "name email avatar_url year experience_level availability github_username linkedin_url github_data",
    )
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ success: true, data: requests });
};

// ===== SECRETARY/CORE — SCHEDULE VERIFICATION =====
// PATCH /api/join-requests/:requestId/schedule
// Body: { verification_date, verification_venue, verification_notes? }
exports.scheduleVerification = async (req, res) => {
  const { requestId } = req.params;
  const {
    verification_date,
    verification_venue = "",
    verification_notes = "",
  } = req.body || {};

  if (!isObjectId(requestId))
    throw new HttpError(400, "INVALID_ID", "Invalid request id");
  if (!verification_date)
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "verification_date is required",
    );

  const date = new Date(verification_date);
  if (isNaN(date.getTime()))
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid verification_date");

  const request = await ClubJoinRequest.findById(requestId);
  if (!request)
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Request not found");
  if (
    request.status !== "pending" &&
    request.status !== "verification_scheduled"
  )
    throw new HttpError(422, "INVALID_STATUS", "Cannot schedule at this stage");

  const managerRole = await getClubManagerRole(request.club_id, req.user.id);
  if (!managerRole)
    throw new HttpError(403, "FORBIDDEN", "Only club managers can schedule");

  const club = await Club.findById(request.club_id)
    .select("name display_name")
    .lean();

  request.status = "verification_scheduled";
  request.verification_date = date;
  request.verification_venue = String(verification_venue).trim();
  request.verification_notes = String(verification_notes).trim();
  request.scheduled_by = req.user.id;
  await request.save();

  await createNotification({
    user: request.user_id,
    type: "club_verification_scheduled",
    title: "Verification scheduled",
    message: `Your verification for "${club?.display_name || club?.name}" is on ${date.toDateString()}${verification_venue ? ` at ${verification_venue}` : ""}.`,
    link: `/clubs/${request.club_id}`,
    priority: "high",
  });

  return res.status(200).json({ success: true, data: request });
};

// ===== SECRETARY/CORE — APPROVE =====
// PATCH /api/join-requests/:requestId/approve
exports.approveJoinRequest = async (req, res) => {
  const { requestId } = req.params;
  if (!isObjectId(requestId))
    throw new HttpError(400, "INVALID_ID", "Invalid request id");

  const request = await ClubJoinRequest.findById(requestId);
  if (!request)
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Request not found");
  if (!["pending", "verification_scheduled"].includes(request.status))
    throw new HttpError(422, "INVALID_STATUS", "Request already resolved");

  const managerRole = await getClubManagerRole(request.club_id, req.user.id);
  if (!managerRole)
    throw new HttpError(403, "FORBIDDEN", "Only club managers can approve");

  // Already a member?
  const alreadyMember = await ClubMember.exists({
    club_id: request.club_id,
    user_id: request.user_id,
    status: "active",
  });
  if (alreadyMember)
    throw new HttpError(422, "ALREADY_MEMBER", "User is already a member");

  // Create member (upsert-safe)
  try {
    await ClubMember.create({
      club_id: request.club_id,
      user_id: request.user_id,
      role: "member",
      status: "active",
      joined_at: new Date(),
      verified_by: req.user.id,
      verified_at: new Date(),
    });
  } catch (e) {
    if (e.code !== 11000) throw e;
  }

  // Bump club member_count
  await Club.updateOne({ _id: request.club_id }, { $inc: { member_count: 1 } });

  request.status = "approved";
  request.responded_by = req.user.id;
  request.responded_at = new Date();
  await request.save();

  const club = await Club.findById(request.club_id)
    .select("name display_name")
    .lean();

  await createNotification({
    user: request.user_id,
    type: "club_join_approved",
    title: "Welcome to the club! 🎉",
    message: `You are now a member of "${club?.display_name || club?.name}".`,
    link: `/clubs/${request.club_id}`,
    priority: "high",
  });

  return res.status(200).json({ success: true, data: request });
};

// ===== SECRETARY/CORE — REJECT =====
// PATCH /api/join-requests/:requestId/reject
// Body: { rejection_reason? }
exports.rejectJoinRequest = async (req, res) => {
  const { requestId } = req.params;
  const { rejection_reason = "" } = req.body || {};

  if (!isObjectId(requestId))
    throw new HttpError(400, "INVALID_ID", "Invalid request id");

  const request = await ClubJoinRequest.findById(requestId);
  if (!request)
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Request not found");
  if (!["pending", "verification_scheduled"].includes(request.status))
    throw new HttpError(422, "INVALID_STATUS", "Request already resolved");

  const managerRole = await getClubManagerRole(request.club_id, req.user.id);
  if (!managerRole)
    throw new HttpError(403, "FORBIDDEN", "Only club managers can reject");

  request.status = "rejected";
  request.rejection_reason = String(rejection_reason).trim();
  request.responded_by = req.user.id;
  request.responded_at = new Date();
  await request.save();

  const club = await Club.findById(request.club_id)
    .select("name display_name")
    .lean();

  await createNotification({
    user: request.user_id,
    type: "club_join_rejected",
    title: "Join request update",
    message: `Your request to join "${club?.display_name || club?.name}" was not approved.${rejection_reason ? ` Reason: ${rejection_reason}` : ""}`,
    link: `/clubs/${request.club_id}`,
    priority: "medium",
  });

  return res.status(200).json({ success: true, data: request });
};
