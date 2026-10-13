const Vote = require('../models/vote.model');
const Team = require('../models/team.model');
const TeamMember = require('../models/teamMember.model');
const User = require('../models/user.model');
const HttpError = require('../utils/httpError');
const { isObjectId } = require('../utils/queryHelpers');
const { createNotification } = require('../services/notification.service');

// Helper: Check if user is team member
const isTeamMember = async (teamId, userId) => {
  return TeamMember.exists({
    team_id: teamId,
    user_id: userId,
    status: 'accepted',
  });
};

// POST /api/teams/:teamId/leader/vote
exports.castLeaderVote = async (req, res) => {
  const { teamId } = req.params;
  const { candidate_id } = req.body;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }
  if (!candidate_id || !isObjectId(candidate_id)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Valid candidate_id is required');
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not a member of this team');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  // Check if candidate is a team member
  const candidateIsMember = await TeamMember.exists({
    team_id: teamId,
    user_id: candidate_id,
    status: 'accepted',
  });

  if (!candidateIsMember) {
    throw new HttpError(422, 'INVALID_CANDIDATE', 'Candidate is not a team member');
  }

  // Check if already voted
  const existingVote = await Vote.findOne({
    team_id: teamId,
    voter_id: req.user.id,
    vote_type: 'leader',
  });

  if (existingVote) {
    throw new HttpError(409, 'ALREADY_VOTED', 'You have already voted');
  }

  // Create vote
  const vote = await Vote.create({
    team_id: teamId,
    voter_id: req.user.id,
    candidate_id,
    vote_type: 'leader',
  });

  // Notify team leader about vote
  const voter = await User.findById(req.user.id).select('name').lean();

  await createNotification({
    user: team.leader_id,
    type: 'vote_cast',
    title: 'New Vote Cast',
    message: `${voter.name} voted in the leader election.`,
    link: `/teams/${teamId}/voting`,
    priority: 'medium',
  });

  return res.status(201).json({
    success: true,
    data: vote,
  });
};

// GET /api/teams/:teamId/votes
exports.getTeamVotes = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const member = await isTeamMember(teamId, req.user.id);
  if (!member) {
    throw new HttpError(403, 'FORBIDDEN', 'You are not a member of this team');
  }

  const votes = await Vote.find({ team_id: teamId })
    .populate('voter_id', 'name avatar_url')
    .populate('candidate_id', 'name avatar_url')
    .sort({ voted_at: -1 })
    .lean();

  // Calculate vote counts per candidate
  const voteCounts = {};
  votes.forEach((v) => {
    const candidateId = String(v.candidate_id._id);
    if (!voteCounts[candidateId]) {
      voteCounts[candidateId] = {
        candidate: v.candidate_id,
        count: 0,
      };
    }
    voteCounts[candidateId].count++;
  });

  const results = Object.values(voteCounts).sort((a, b) => b.count - a.count);

  const totalMembers = await TeamMember.countDocuments({
    team_id: teamId,
    status: 'accepted',
  });

  const hasVoted = votes.some((v) => String(v.voter_id._id) === String(req.user.id));

  return res.status(200).json({
    success: true,
    data: {
      votes,
      results,
      total_votes: votes.length,
      total_members: totalMembers,
      has_voted: hasVoted,
      your_vote: hasVoted
        ? votes.find((v) => String(v.voter_id._id) === String(req.user.id))
        : null,
    },
  });
};

// POST /api/teams/:teamId/leader/declare
exports.declareLeader = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid team id');
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new HttpError(404, 'TEAM_NOT_FOUND', 'Team not found');
  }

  // Only current leader or admin can declare
  const isLeader = String(team.leader_id) === String(req.user.id);
  const isAdmin = req.user.role === 'admin';

  if (!isLeader && !isAdmin) {
    throw new HttpError(403, 'FORBIDDEN', 'Only team leader or admin can declare result');
  }

  const votes = await Vote.find({ team_id: teamId, vote_type: 'leader' })
    .populate('candidate_id', 'name')
    .lean();

  if (votes.length === 0) {
    throw new HttpError(422, 'NO_VOTES', 'No votes have been cast');
  }

  // Count votes
  const voteCounts = {};
  votes.forEach((v) => {
    const candidateId = String(v.candidate_id._id);
    voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
  });

  // Find winner
  let maxVotes = 0;
  let winnerId = null;
  for (const [candidateId, count] of Object.entries(voteCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      winnerId = candidateId;
    }
  }

  // Update team leader
  team.leader_id = winnerId;
  await team.save();

  // Update team member roles
  await TeamMember.updateMany(
    { team_id: teamId, role: 'leader' },
    { $set: { role: 'member' } }
  );
  await TeamMember.updateOne(
    { team_id: teamId, user_id: winnerId },
    { $set: { role: 'leader' } }
  );

  const winner = await User.findById(winnerId).select('name').lean();

  // Notify all members
  const members = await TeamMember.find({
    team_id: teamId,
    status: 'accepted',
  }).lean();

  for (const m of members) {
    await createNotification({
      user: m.user_id,
      type: 'team_confirmed',
      title: 'Leader Elected!',
      message: `${winner.name} has been elected as the team leader.`,
      link: `/teams/${teamId}`,
      priority: 'high',
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      leader_id: winnerId,
      leader_name: winner.name,
      vote_count: maxVotes,
    },
  });
};