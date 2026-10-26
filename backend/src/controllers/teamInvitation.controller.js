const TeamInvitation = require("../models/teamInvitation.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const Enrollment = require("../models/enrollment.model");
const Event = require("../models/event.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

const isTeamLeader = async (teamId, userId) => {
  const team = await Team.findById(teamId).select("leader_id").lean();
  return team && String(team.leader_id) === String(userId);
};

// ===== HELPER: team size availability =====
const assertTeamHasSlot = async (teamId) => {
  const team = await Team.findById(teamId).select("event_id").lean();
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");

  const event = await Event.findById(team.event_id)
    .select("team_size_max")
    .lean();
  const maxSize = event && event.team_size_max ? event.team_size_max : 6;

  const acceptedCount = await TeamMember.countDocuments({
    team_id: teamId,
    status: "accepted",
  });
  const invitedCount = await TeamMember.countDocuments({
    team_id: teamId,
    status: "invited",
  });

  if (acceptedCount + invitedCount >= maxSize) {
    throw new HttpError(
      422,
      "TEAM_FULL",
      `Team is full (max ${maxSize} members)`,
    );
  }
};

// ===== POST /api/teams/:teamId/invitations =====
exports.inviteRegisteredUser = async (req, res) => {
  const { teamId } = req.params;
  const { invited_user_id, role_offered = "", message = "" } = req.body || {};

  if (!isObjectId(teamId) || !isObjectId(invited_user_id)) {
    throw new HttpError(400, "INVALID_ID", "Invalid id");
  }

  const isLeader = await isTeamLeader(teamId, req.user.id);
  if (!isLeader)
    throw new HttpError(403, "FORBIDDEN", "Only leader can invite");

  const team = await Team.findById(teamId);
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");

  // Enforce team size cap
  await assertTeamHasSlot(teamId);

  const existingMember = await TeamMember.exists({
    team_id: teamId,
    user_id: invited_user_id,
    status: { $in: ["accepted", "invited"] },
  });
  if (existingMember) {
    throw new HttpError(
      422,
      "ALREADY_MEMBER",
      "User is already a member or invited",
    );
  }

  const existingInvite = await TeamInvitation.findOne({
    team_id: teamId,
    invited_user_id,
    status: "pending",
  });
  if (existingInvite) {
    throw new HttpError(409, "INVITE_PENDING", "Invitation already pending");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await TeamInvitation.create({
    team_id: teamId,
    invited_by: req.user.id,
    invited_user_id,
    invite_type: "join_team",
    source: "leader_manual",
    role_offered,
    message,
    status: "pending",
    sent_at: new Date(),
    expires_at: expiresAt,
  });

  try {
    await TeamMember.create({
      team_id: teamId,
      user_id: invited_user_id,
      role: role_offered || "member",
      status: "invited",
    });
  } catch (e) {
    if (e.code !== 11000) throw e;
  }

  const inviter = await User.findById(req.user.id).select("name").lean();
  await createNotification({
    user: invited_user_id,
    type: "team_invite",
    title: "Team Invitation",
    message: `${inviter.name} invited you to join team "${team.name}"`,
    link: `/teams/${teamId}/invitations/${invitation._id}`,
    priority: "high",
  });

  return res.status(201).json({ success: true, data: invitation });
};
