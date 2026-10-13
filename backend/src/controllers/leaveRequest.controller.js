const ReplacementSuggestion = require('../models/replacementSuggestion.model');
const Team = require('../models/team.model');
const TeamMember = require('../models/teamMember.model');
const TeamInvitation = require('../models/teamInvitation.model');
const Enrollment = require('../models/enrollment.model');
const User = require('../models/user.model');
const Skill = require('../models/skill.model');
const HttpError = require('../utils/httpError');
const { isObjectId } = require('../utils/queryHelpers');
const { createNotification } = require('../services/notification.service');

// Helper: Check if user is team leader
const isTeamLeader = async (teamId, userId) => {
  const team = await Team.findById(teamId).select('leader_id').lean();
  return team && String(team.leader_id) === String(userId);
};

// Helper: Calculate match score between candidate and team
const calculateMatchScore = async (candidateId, teamId, eventId) => {
  const candidate = await User.findById(candidateId).select('skills availability experience_level').lean();
  const teamMembers = await TeamMember.find({
    team_id: teamId,
    status: 'accepted',
  }).populate('user_id', 'skills availability').lean();

  if (!candidate) return { score: 0, reasoning: 'Candidate not found' };

  const candidateSkills = await Skill.find({ user_id: candidateId }).lean();
  const candidateSkillNames = candidateSkills.map((s) => s.skill_name.toLowerCase());

  // Get team's skill coverage
  const teamSkillSet = new Set();
  teamMembers.forEach((m) => {
    if (m.user_id && m.user_id.skills) {
      m.user_id.skills.forEach((s) => teamSkillSet.add(s.toLowerCase()));
    }
  });

  // Calculate skill overlap (candidate brings new skills)
  const newSkills = candidateSkillNames.filter((s) => !teamSkillSet.has(s));
  const skillScore = Math.min(newSkills.length / 5, 1);

  // Availability score
  const availability = candidate.availability || 0;
  const availabilityScore = Math.min(availability / 20, 1);

  // Experience score
  const expMap = { beginner: 0.3, intermediate: 0.6, advanced: 1 };
  const expScore = expMap[candidate.experience_level] || 0.3;

  // Weighted total
  const score = skillScore * 0.5 + availabilityScore * 0.3 + expScore * 0.2;

  const reasoning = [
    `Brings ${newSkills.length} new skills`,
    `${availability} hrs/week available`,
    `${candidate.experience_level || 'beginner'} level`,
  ].join('. ');

  return { score: Math.round(score * 100) / 100, reasoning };
};

// GET /api/teams/:teamId/replacements
exports.getReplacements = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const isLeader = await isTeamLeader(teamId, req.user.id);
  if (!isLeader) {
    throw new HttpError(403, 'FORBIDDEN', 'Only team leader can view replacements');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  const suggestions = await ReplacementSuggestion.find({
    team_id: teamId,
    status: { $in: ['pending', 'accepted'] },
  })
    .populate('replacing_id', 'name avatar_url')
    .populate('candidate_id', 'name avatar_url year experience_level')
    .sort({ score: -1, createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    data: suggestions,
  });
};

// POST /api/teams/:teamId/find-replacement
exports.findReplacement = async (req, res) => {
  const { teamId } = req.params;
  const { replacing_user_id, role_needed } = req.body;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const isLeader = await isTeamLeader(teamId, req.user.id);
  if (!isLeader) {
    throw new HttpError(403, 'FORBIDDEN', 'Only team leader can find replacements');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  // Get current team member IDs
  const currentMembers = await TeamMember.find({
    team_id: teamId,
    status: 'accepted',
  }).lean();

  const currentMemberIds = currentMembers.map((m) => String(m.user_id));
  if (replacing_user_id) {
    currentMemberIds.push(String(replacing_user_id));
  }

  // Find enrolled users for this event who are not in the team
  const enrollments = await Enrollment.find({
    event_id: team.event_id,
    status: 'pending',
  }).lean();

  const candidateIds = enrollments
    .map((e) => String(e.user_id))
    .filter((id) => !currentMemberIds.includes(id));

  if (candidateIds.length === 0) {
    return res.status(200).json({
      success: true,
      data: [],
      message: 'No candidates available',
    });
  }

  // Calculate match scores for each candidate
  const suggestions = [];
  for (const candidateId of candidateIds.slice(0, 10)) {
    const { score, reasoning } = await calculateMatchScore(
      candidateId,
      teamId,
      team.event_id
    );

    if (score > 0.3) {
      suggestions.push({
        candidate_id: candidateId,
        score,
        reasoning,
      });
    }
  }

  // Sort by score
  suggestions.sort((a, b) => b.score - a.score);

  // Save top 3 as replacement suggestions
  const savedSuggestions = [];
  for (const s of suggestions.slice(0, 3)) {
    const existing = await ReplacementSuggestion.findOne({
      team_id: teamId,
      candidate_id: s.candidate_id,
      replacing_id: replacing_user_id || req.user.id,
      status: 'pending',
    });

    if (!existing) {
      const newSuggestion = await ReplacementSuggestion.create({
        team_id: teamId,
        event_id: team.event_id,
        replacing_id: replacing_user_id || req.user.id,
        candidate_id: s.candidate_id,
        role_needed: role_needed || '',
        score: s.score,
        reasoning: s.reasoning,
        suggestion_source: 'ai_generated',
        status: 'pending',
      });
      savedSuggestions.push(newSuggestion);
    } else {
      savedSuggestions.push(existing);
    }
  }

  const populated = await ReplacementSuggestion.populate(savedSuggestions, [
    { path: 'candidate_id', select: 'name avatar_url year experience_level' },
    { path: 'replacing_id', select: 'name avatar_url' },
  ]);

  return res.status(200).json({
    success: true,
    data: populated,
  });
};

// POST /api/teams/:teamId/replacements/:suggestionId/invite
exports.inviteReplacement = async (req, res) => {
  const { teamId, suggestionId } = req.params;

  if (!isObjectId(teamId) || !isObjectId(suggestionId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid id');
  }

  const isLeader = await isTeamLeader(teamId, req.user.id);
  if (!isLeader) {
    throw new HttpError(403, 'FORBIDDEN', 'Only team leader can send invites');
  }

  const suggestion = await ReplacementSuggestion.findOne({
    _id: suggestionId,
    team_id: teamId,
    status: 'pending',
  });

  if (!suggestion) {
    throw new HttpError(404, 'SUGGESTION_NOT_FOUND', 'Suggestion not found');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  // Check if candidate is already a member
  const existingMember = await TeamMember.exists({
    team_id: teamId,
    user_id: suggestion.candidate_id,
    status: { $in: ['accepted', 'invited'] },
  });

  if (existingMember) {
    throw new HttpError(422, 'ALREADY_MEMBER', 'Candidate is already a team member');
  }

  // Create invitation
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await TeamInvitation.create({
    team_id: teamId,
    invited_by: req.user.id,
    invited_user_id: suggestion.candidate_id,
    invite_type: 'replacement',
    source: 'ai_suggested',
    role_offered: suggestion.role_needed || 'member',
    message: `You have been invited to join team "${team.name}" as a replacement.`,
    status: 'pending',
    sent_at: new Date(),
    expires_at: expiresAt,
  });

  // Update suggestion status
  suggestion.status = 'accepted';
  await suggestion.save();

  // Notify candidate
  const inviter = await User.findById(req.user.id).select('name').lean();

  await createNotification({
    user: suggestion.candidate_id,
    type: 'team_invite',
    title: 'Team Invitation',
    message: `${inviter.name} invited you to join team "${team.name}"`,
    link: `/teams/${teamId}/invitations/${invitation._id}`,
    priority: 'high',
  });

  return res.status(201).json({
    success: true,
    data: invitation,
  });
};

// POST /api/teams/:teamId/invitations/:invitationId/respond
exports.respondToInvitation = async (req, res) => {
  const { teamId, invitationId } = req.params;
  const { response } = req.body; // 'accept' or 'decline'

  if (!isObjectId(teamId) || !isObjectId(invitationId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid id');
  }

  if (!['accept', 'decline'].includes(response)) {
    throw new HttpError(400, 'VALIDATION_ERROR', "response must be 'accept' or 'decline'");
  }

  const invitation = await TeamInvitation.findOne({
    _id: invitationId,
    team_id: teamId,
    invited_user_id: req.user.id,
    status: 'pending',
  });

  if (!invitation) {
    throw new HttpError(404, 'INVITATION_NOT_FOUND', 'Invitation not found');
  }

  if (new Date() > invitation.expires_at) {
    throw new HttpError(422, 'INVITATION_EXPIRED', 'Invitation has expired');
  }

  if (response === 'accept') {
    // Add as team member
    await TeamMember.create({
      team_id: teamId,
      user_id: req.user.id,
      role: 'member',
      status: 'accepted',
      joined_at: new Date(),
    });

    // Update enrollment
    const team = await Team.findById(teamId);
    await Enrollment.findOneAndUpdate(
      { user_id: req.user.id, event_id: team.event_id },
      { $set: { status: 'matched', source: 'leader_invite' } },
      { upsert: true }
    );

    invitation.status = 'accepted';
  } else {
    invitation.status = 'declined';
  }

  invitation.responded_at = new Date();
  await invitation.save();

  return res.status(200).json({
    success: true,
    data: invitation,
  });
};