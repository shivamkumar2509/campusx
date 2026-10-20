const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const ExternalInvitation = require("../models/externalInvitation.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const Enrollment = require("../models/enrollment.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");
const { signToken } = require("../utils/jwt");

const isTeamLeader = async (teamId, userId) => {
  const team = await Team.findById(teamId).select("leader_id").lean();
  return team && String(team.leader_id) === String(userId);
};

// POST /api/teams/:teamId/external-invitations
exports.createExternalInvitation = async (req, res) => {
  const { teamId } = req.params;
  const {
    invited_email,
    invited_name = "",
    role_offered = "",
    message = "",
  } = req.body || {};

  if (!isObjectId(teamId))
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  if (!invited_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invited_email)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Valid invited_email is required",
    );
  }

  const isLeader = await isTeamLeader(teamId, req.user.id);
  if (!isLeader)
    throw new HttpError(403, "FORBIDDEN", "Only leader can invite");

  const team = await Team.findById(teamId);
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");

  const existing = await ExternalInvitation.findOne({
    team_id: teamId,
    invited_email: invited_email.toLowerCase(),
    status: "pending",
  });
  if (existing) {
    throw new HttpError(
      409,
      "INVITE_EXISTS",
      "External invitation already pending",
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await ExternalInvitation.create({
    team_id: teamId,
    invited_by: req.user.id,
    invited_email: invited_email.toLowerCase(),
    invited_name,
    role_offered,
    message,
    token,
    status: "pending",
    sent_at: new Date(),
    expires_at: expiresAt,
  });

  await createNotification({
    user: req.user.id,
    type: "external_invite_sent",
    title: "Invitation sent",
    message: `Invitation sent to ${invited_email}`,
    link: `/teams/${teamId}/external-invite`,
    priority: "low",
  });

  return res.status(201).json({
    success: true,
    data: {
      _id: invitation._id,
      invited_email: invitation.invited_email,
      status: invitation.status,
      expires_at: invitation.expires_at,
      invite_link: `/external-invite/${token}`,
    },
  });
};

// POST /api/external-invitations/:token/signup
exports.signupViaExternalInvite = async (req, res) => {
  const { token } = req.params;
  const { name, password, year } = req.body || {};

  const invitation = await ExternalInvitation.findOne({
    token,
    status: "pending",
  });
  if (!invitation)
    throw new HttpError(404, "INVITE_NOT_FOUND", "Invitation not found");
  if (new Date() > invitation.expires_at) {
    throw new HttpError(422, "INVITE_EXPIRED", "Invitation has expired");
  }
  if (!name || !password || !year) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "name, password, year are required",
    );
  }

  const existing = await User.findOne({ email: invitation.invited_email });
  if (existing) {
    throw new HttpError(
      409,
      "EMAIL_EXISTS",
      "Email already registered. Please login.",
    );
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: invitation.invited_email,
    password_hash,
    year,
    is_external_origin: true,
    college: "EXTERNAL",
  });

  invitation.registered_user_id = user._id;
  invitation.status = "registered";
  await invitation.save();

  const authToken = signToken({ id: user._id, role: user.role });

  // Notify leader
  const team = await Team.findById(invitation.team_id)
    .select("leader_id name")
    .lean();
  if (team) {
    await createNotification({
      user: team.leader_id,
      type: "external_invite_accepted",
      title: "External invitee registered",
      message: `${user.name} signed up from your invitation. Team vote required to approve.`,
      link: `/teams/${team._id}`,
      priority: "high",
    });
  }

  return res.status(201).json({
    success: true,
    data: {
      token: authToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      invitation: { _id: invitation._id, status: invitation.status },
    },
  });
};

// POST /api/external-invitations/:invitationId/approve  (internal — used by team vote)
exports.approveExternalInvite = async (req, res) => {
  const { invitationId } = req.params;
  if (!isObjectId(invitationId))
    throw new HttpError(400, "INVALID_ID", "Invalid id");

  const invitation = await ExternalInvitation.findById(invitationId);
  if (!invitation)
    throw new HttpError(404, "INVITE_NOT_FOUND", "Invitation not found");
  if (invitation.status !== "registered") {
    throw new HttpError(
      422,
      "INVALID_STATUS",
      "Invitation is not in registered state",
    );
  }

  const isLeader = await isTeamLeader(invitation.team_id, req.user.id);
  if (!isLeader)
    throw new HttpError(403, "FORBIDDEN", "Only leader can finalize");

  // Add member + enrollment
  await TeamMember.create({
    team_id: invitation.team_id,
    user_id: invitation.registered_user_id,
    role: "member",
    status: "accepted",
    joined_at: new Date(),
  });

  const team = await Team.findById(invitation.team_id);
  await Enrollment.findOneAndUpdate(
    { user_id: invitation.registered_user_id, event_id: team.event_id },
    { $set: { status: "matched", source: "external_approved" } },
    { upsert: true },
  );

  invitation.status = "approved";
  invitation.approved_by.push(req.user.id);
  invitation.approved_at = new Date();
  await invitation.save();

  await createNotification({
    user: invitation.registered_user_id,
    type: "external_invite_accepted",
    title: "Welcome to the team!",
    message: `Your invitation to team "${team.name}" was approved.`,
    link: `/teams/${team._id}`,
    priority: "high",
  });

  return res.status(200).json({ success: true, data: invitation });
};

// GET /api/external-invitations/:token  (public preview)
exports.previewExternalInvite = async (req, res) => {
  const { token } = req.params;
  const invitation = await ExternalInvitation.findOne({ token })
    .populate("team_id", "name description event_id")
    .populate("invited_by", "name")
    .lean();

  if (!invitation)
    throw new HttpError(404, "INVITE_NOT_FOUND", "Invitation not found");
  if (new Date() > invitation.expires_at) {
    throw new HttpError(422, "INVITE_EXPIRED", "Invitation has expired");
  }

  return res.status(200).json({
    success: true,
    data: {
      invited_email: invitation.invited_email,
      invited_name: invitation.invited_name,
      message: invitation.message,
      status: invitation.status,
      team: invitation.team_id,
      invited_by: invitation.invited_by,
      expires_at: invitation.expires_at,
    },
  });
};
