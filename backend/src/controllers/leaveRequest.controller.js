const TeamChangeRequest = require("../models/teamChangeRequest.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const User = require("../models/user.model");
const ConversationMember = require("../models/conversationMember.model");
const Conversation = require("../models/conversation.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

const VOTE_WINDOW_HOURS = 48;

const isTeamMember = async (teamId, userId) =>
  TeamMember.exists({ team_id: teamId, user_id: userId, status: "accepted" });

/**
 * Threshold = ceil(eligible voters / 2) + 1, where eligible voters
 * = accepted team members EXCLUDING the person requesting to leave.
 */
const computeThreshold = async (teamId, requesterId) => {
  const eligibleVoters = await TeamMember.countDocuments({
    team_id: teamId,
    status: "accepted",
    user_id: { $ne: requesterId },
  });
  return Math.floor(eligibleVoters / 2) + 1;
};

// POST /api/teams/:teamId/leave-requests
exports.createLeaveRequest = async (req, res) => {
  const { teamId } = req.params;
  const { reason = "" } = req.body || {};

  if (!isObjectId(teamId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "You are not a member of this team");
  }

  const team = await Team.findById(teamId);
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");

  if (String(team.leader_id) === String(req.user.id)) {
    throw new HttpError(
      422,
      "LEADER_CANNOT_LEAVE",
      "Leader cannot leave. Transfer leadership first.",
    );
  }

  const existing = await TeamChangeRequest.findOne({
    team_id: teamId,
    user_id: req.user.id,
    request_type: "leave",
    status: "pending",
  });
  if (existing) {
    throw new HttpError(
      409,
      "REQUEST_EXISTS",
      "You already have a pending leave request",
    );
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + VOTE_WINDOW_HOURS);

  const request = await TeamChangeRequest.create({
    team_id: teamId,
    user_id: req.user.id,
    request_type: "leave",
    reason,
    expires_at: expiresAt,
  });

  const requester = await User.findById(req.user.id).select("name").lean();
  const voters = await TeamMember.find({
    team_id: teamId,
    status: "accepted",
    user_id: { $ne: req.user.id },
  }).lean();

  for (const v of voters) {
    await createNotification({
      user: v.user_id,
      type: "leave_request",
      title: "Leave request",
      message: `${requester.name} wants to leave team "${team.name}". Vote now — 48 hours.`,
      link: `/teams/${teamId}/voting/${request._id}`,
      priority: "high",
    });
  }

  return res.status(201).json({ success: true, data: request });
};

// GET /api/teams/:teamId/leave-requests
exports.getLeaveRequests = async (req, res) => {
  const { teamId } = req.params;
  if (!isObjectId(teamId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "You are not a member of this team");
  }

  const requests = await TeamChangeRequest.find({
    team_id: teamId,
    request_type: "leave",
  })
    .populate("user_id", "name avatar_url")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ success: true, data: requests });
};

// POST /api/teams/:teamId/leave-requests/:requestId/votes
exports.voteOnLeaveRequest = async (req, res) => {
  const { teamId, requestId } = req.params;
  const { vote } = req.body || {}; // 'approve' | 'reject'

  if (!isObjectId(teamId) || !isObjectId(requestId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid id");
  }
  if (!["approve", "reject"].includes(vote)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "vote must be 'approve' or 'reject'",
    );
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "You are not a member of this team");
  }

  const request = await TeamChangeRequest.findOne({
    _id: requestId,
    team_id: teamId,
    request_type: "leave",
  });

  if (!request)
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Request not found");
  if (request.status !== "pending") {
    throw new HttpError(
      422,
      "REQUEST_CLOSED",
      "This request is already resolved",
    );
  }
  if (new Date() > request.expires_at) {
    throw new HttpError(422, "REQUEST_EXPIRED", "Voting window has expired");
  }
  if (String(request.user_id) === String(req.user.id)) {
    throw new HttpError(
      422,
      "CANNOT_VOTE",
      "Requester cannot vote on their own leave",
    );
  }

  const alreadyApproved = request.approvals.some(
    (id) => String(id) === String(req.user.id),
  );
  const alreadyRejected = request.rejections.some(
    (id) => String(id) === String(req.user.id),
  );
  if (alreadyApproved || alreadyRejected) {
    throw new HttpError(
      409,
      "ALREADY_VOTED",
      "You have already voted on this request",
    );
  }

  if (vote === "approve") request.approvals.push(req.user.id);
  else request.rejections.push(req.user.id);

  await request.save();

  // Notify requester
  await createNotification({
    user: request.user_id,
    type: "vote_cast",
    title: "New vote on your leave request",
    message: `A teammate voted "${vote}" on your leave request.`,
    link: `/teams/${teamId}/voting/${requestId}`,
    priority: "medium",
  });

  return res.status(200).json({ success: true, data: request });
};

// GET /api/teams/:teamId/leave-requests/:requestId/result
exports.getLeaveRequestResult = async (req, res) => {
  const { teamId, requestId } = req.params;
  if (!isObjectId(teamId) || !isObjectId(requestId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid id");
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "You are not a member of this team");
  }

  const request = await TeamChangeRequest.findOne({
    _id: requestId,
    team_id: teamId,
    request_type: "leave",
  });
  if (!request)
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Request not found");

  const threshold = await computeThreshold(teamId, request.user_id);
  const approvals = request.approvals.length;
  const rejections = request.rejections.length;

  let decided = false;
  let outcome = null;

  // Auto-resolve if threshold reached or window expired
  if (request.status === "pending") {
    const expired = new Date() > request.expires_at;
    if (approvals >= threshold) {
      request.status = "approved";
      request.resolved_at = new Date();
      decided = true;
      outcome = "approved";
    } else if (expired) {
      request.status = "rejected";
      request.resolved_at = new Date();
      decided = true;
      outcome = "rejected";
    } else if (rejections >= threshold) {
      // early rejection
      request.status = "rejected";
      request.resolved_at = new Date();
      decided = true;
      outcome = "rejected";
    }
    if (decided) await request.save();
  } else {
    decided = true;
    outcome = request.status;
  }

  // Side effects on approval
  if (decided && outcome === "approved") {
    await TeamMember.updateOne(
      { team_id: teamId, user_id: request.user_id },
      { $set: { status: "left", left_at: new Date() } },
    );

    const conv = await Conversation.findOne({ team_id: teamId })
      .select("_id")
      .lean();
    if (conv) {
      await ConversationMember.updateOne(
        { conv_id: conv._id, user_id: request.user_id },
        { $set: { status: "removed" } },
      );
    }

    // Notify requester
    await createNotification({
      user: request.user_id,
      type: "leave_approved",
      title: "Leave request approved",
      message: "Your teammates approved your leave request.",
      link: `/teams/${teamId}`,
      priority: "high",
    });

    // Notify leader — replacement needed
    const team = await Team.findById(teamId).select("leader_id name").lean();
    if (team) {
      await createNotification({
        user: team.leader_id,
        type: "member_left",
        title: "A member left",
        message: `A member left team "${team.name}". Find a replacement.`,
        link: `/teams/${teamId}`,
        priority: "high",
      });
    }
  }

  return res.status(200).json({
    success: true,
    data: {
      request_id: request._id,
      status: request.status,
      approvals,
      rejections,
      threshold,
      eligible_voters: threshold * 2 - 1,
      expires_at: request.expires_at,
      decided,
      outcome,
    },
  });
};

// DELETE /api/leave-requests/:requestId  (cancel by requester)
exports.cancelLeaveRequest = async (req, res) => {
  const { requestId } = req.params;
  if (!isObjectId(requestId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid request id");
  }

  const request = await TeamChangeRequest.findById(requestId);
  if (!request)
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Request not found");

  if (String(request.user_id) !== String(req.user.id)) {
    throw new HttpError(403, "FORBIDDEN", "Only the requester can cancel");
  }
  if (request.status !== "pending") {
    throw new HttpError(
      422,
      "REQUEST_CLOSED",
      "Cannot cancel a resolved request",
    );
  }

  request.status = "cancelled";
  request.resolved_at = new Date();
  await request.save();

  return res.status(200).json({ success: true, data: request });
};

exports.computeThreshold = computeThreshold;
