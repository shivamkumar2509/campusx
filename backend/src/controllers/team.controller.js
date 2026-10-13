const Team = require('../models/team.model');
const TeamMember = require('../models/teamMember.model');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const Conversation = require('../models/conversation.model');
const ConversationMember = require('../models/conversationMember.model');
const Enrollment = require('../models/enrollment.model');
const HttpError = require('../utils/httpError');
const { isObjectId, getPagination, buildMeta, getSort } = require('../utils/queryHelpers');
const { createNotification } = require('../services/notification.service');

// Helper: Check if user is team member
const isTeamMember = async (teamId, userId) => {
  return TeamMember.exists({
    team_id: teamId,
    user_id: userId,
    status: 'accepted',
  });
};

// Helper: Check if user is team leader
const isTeamLeader = async (teamId, userId) => {
  const team = await Team.findById(teamId).select('leader_id').lean();
  return team && String(team.leader_id) === String(userId);
};

// Helper: Get active member count
const getActiveMemberCount = async (teamId) => {
  return TeamMember.countDocuments({
    team_id: teamId,
    status: 'accepted',
  });
};

// POST /api/teams
exports.createTeam = async (req, res) => {
  const { event_id, name, description, member_ids } = req.body;

  if (!event_id || !isObjectId(event_id)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Valid event_id is required');
  }
  if (!name || !name.trim()) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Team name is required');
  }

  const event = await Event.findById(event_id);
  if (!event) {
    throw new HttpError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  // Check if user already has a team for this event
  const existingTeam = await Team.findOne({
    event_id,
    leader_id: req.user.id,
    status: { $ne: 'completed' },
  });

  if (existingTeam) {
    throw new HttpError(409, 'TEAM_EXISTS', 'You already have a team for this event');
  }

  // Create team
  const team = await Team.create({
    event_id,
    leader_id: req.user.id,
    name: name.trim(),
    description: description || '',
    status: 'draft',
  });

  // Add leader as member
  await TeamMember.create({
    team_id: team._id,
    user_id: req.user.id,
    role: 'leader',
    status: 'accepted',
    joined_at: new Date(),
  });

  // Add other members if provided
  if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
    const memberOps = member_ids
      .filter((id) => isObjectId(id) && String(id) !== String(req.user.id))
      .map((userId) => ({
        team_id: team._id,
        user_id: userId,
        role: 'member',
        status: 'invited',
      }));

    if (memberOps.length > 0) {
      await TeamMember.insertMany(memberOps, { ordered: false });
    }
  }

  // Create conversation for team
  const conversation = await Conversation.create({
    team_id: team._id,
    type: 'team',
    name: `${team.name} Chat`,
  });

  // Add members to conversation
  const allMembers = await TeamMember.find({ team_id: team._id }).lean();
  const convMemberOps = allMembers.map((m) => ({
    conv_id: conversation._id,
    user_id: m.user_id,
    status: 'active',
  }));
  await ConversationMember.insertMany(convMemberOps, { ordered: false });

  return res.status(201).json({
    success: true,
    data: {
      team,
      conversation_id: conversation._id,
    },
  });
};

// GET /api/teams/:teamId
exports.getTeam = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not a member of this team');
  }

  const team = await Team.findById(teamId)
    .populate('leader_id', 'name avatar_url')
    .populate('event_id', 'title type deadline status')
    .lean();

  if (!team) {
    throw new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  const memberCount = await getActiveMemberCount(teamId);

  return res.status(200).json({
    success: true,
    data: {
      ...team,
      member_count: memberCount,
      is_leader: String(team.leader_id._id) === String(req.user.id),
    },
  });
};

// PATCH /api/teams/:teamId
exports.updateTeam = async (req, res) => {
  const { teamId } = req.params;
  const { name, description } = req.body;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const isLeader = await isTeamLeader(teamId, req.user.id);
  if (!isLeader) {
    throw new HttpError(403, 'FORBIDDEN', 'Only team leader can update team');
  }

  const updates = {};
  if (name && name.trim()) updates.name = name.trim();
  if (description !== undefined) updates.description = description;

  const team = await Team.findByIdAndUpdate(teamId, updates, {
    new: true,
    runValidators: true,
  });

  if (!team) {
    throw new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  return res.status(200).json({
    success: true,
    data: team,
  });
};

// GET /api/teams/:teamId/members
exports.getTeamMembers = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not a member of this team');
  }

  const { page, limit, skip } = getPagination(req.query);
  const sort = getSort(req.query, ['joined_at', 'role'], 'joined_at', 'asc');

  const filter = { team_id: teamId, status: { $in: ['accepted', 'invited'] } };

  const [members, total] = await Promise.all([
    TeamMember.find(filter)
      .populate('user_id', 'name email avatar_url year experience_level skills')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    TeamMember.countDocuments(filter),
  ]);

  const data = members.map((m) => ({
    _id: m._id,
    user_id: m.user_id._id,
    name: m.user_id.name,
    email: m.user_id.email,
    avatar_url: m.user_id.avatar_url,
    year: m.user_id.year,
    experience_level: m.user_id.experience_level,
    role: m.role,
    status: m.status,
    joined_at: m.joined_at,
    left_at: m.left_at,
  }));

  return res.status(200).json({
    success: true,
    data,
    meta: buildMeta(page, limit, total),
  });
};

// POST /api/teams/:teamId/confirm
exports.confirmTeam = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const isLeader = await isTeamLeader(teamId, req.user.id);
  if (!isLeader) {
    throw new HttpError(403, 'FORBIDDEN', 'Only team leader can confirm team');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  if (team.status !== 'draft') {
    throw new HttpError(422, 'INVALID_STATUS', 'Team is already confirmed');
  }

  const memberCount = await getActiveMemberCount(teamId);
  const event = await Event.findById(team.event_id);

  if (memberCount < event.team_size_min) {
    throw new HttpError(
      422,
      'INSUFFICIENT_MEMBERS',
      `Team needs at least ${event.team_size_min} members`
    );
  }

  // Update all pending invitations to accepted
  await TeamMember.updateMany(
    { team_id: teamId, status: 'invited' },
    { $set: { status: 'accepted', joined_at: new Date() } }
  );

  team.status = 'confirmed';
  team.confirmed_at = new Date();
  await team.save();

  // Notify all members
  const members = await TeamMember.find({
    team_id: teamId,
    status: 'accepted',
  }).lean();

  for (const m of members) {
    if (String(m.user_id) !== String(req.user.id)) {
      await createNotification({
        user: m.user_id,
        type: 'team_confirmed',
        title: 'Team Confirmed!',
        message: `Team "${team.name}" has been confirmed for the event.`,
        link: `/teams/${teamId}`,
        priority: 'high',
      });
    }
  }

  return res.status(200).json({
    success: true,
    data: team,
  });
};

// GET /api/teams/:teamId/conversation
exports.getTeamConversation = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not a member of this team');
  }

  let conversation = await Conversation.findOne({ team_id: teamId }).lean();

  if (!conversation) {
    // Create conversation if not exists
    const team = await Team.findById(teamId);
    conversation = await Conversation.create({
      team_id: teamId,
      type: 'team',
      name: `${team.name} Chat`,
    });

    const members = await TeamMember.find({
      team_id: teamId,
      status: 'accepted',
    }).lean();

    const convMemberOps = members.map((m) => ({
      conv_id: conversation._id,
      user_id: m.user_id,
      status: 'active',
    }));
    await ConversationMember.insertMany(convMemberOps, { ordered: false });
  }

  return res.status(200).json({
    success: true,
    data: conversation,
  });
};

// GET /api/teams/:teamId/tasks
exports.getTeamTasks = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not a member of this team');
  }

  // This will be implemented by Raghav
  // Placeholder response
  return res.status(200).json({
    success: true,
    data: [],
  });
};