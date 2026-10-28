const Vote = require("../models/vote.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

const isTeamMember = async (teamId, userId) => {
  return TeamMember.exists({
    team_id: teamId,
    user_id: userId,
    status: "accepted",
  });
};

// POST /api/teams/:teamId/leader/vote
exports.castLeaderVote = async (req, res) => {
  const { teamId } = req.params;
  const { candidate_id } = req.body;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  }

  if (!candidate_id || !isObjectId(candidate_id)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Valid candidate_id is required",
    );
  }

  const member = await isTeamMember(teamId, req.user.id);

  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "You are not a member of this team");
  }

  const team = await Team.findById(teamId);

  if (!team) {
    throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");
  }

  const candidateIsMember = await TeamMember.exists({
    team_id: teamId,
    user_id: candidate_id,
    status: "accepted",
  });

  if (!candidateIsMember) {
    throw new HttpError(
      422,
      "INVALID_CANDIDATE",
      "Candidate is not an accepted member of this team",
    );
  }

  const existingVote = await Vote.findOne({
    team_id: teamId,
    voter_id: req.user.id,
    vote_type: "leader",
  });

  if (existingVote) {
    throw new HttpError(
      409,
      "ALREADY_VOTED",
      "You have already voted in this election",
    );
  }

  const vote = await Vote.create({
    team_id: teamId,
    voter_id: req.user.id,
    candidate_id,
    vote_type: "leader",
  });

  const voter = await User.findById(req.user.id).select("name").lean();

  // Notify the current team leader.
  // Voting should remain successful even if notification delivery fails.
  try {
    if (team.leader_id) {
      await createNotification({
        user: team.leader_id,
        type: "vote_cast",
        title: "New Vote Cast",
        message: `${voter?.name || "A team member"} voted in the leader election.`,
        link: `/teams/${teamId}`,
        priority: "medium",
      });
    }
  } catch (notificationError) {
    console.error("Leader vote notification failed:", notificationError);
  }

  return res.status(201).json({
    success: true,
    message: "Your vote has been recorded",
    data: vote,
  });
};

// GET /api/teams/:teamId/votes
exports.getTeamVotes = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  }

  const member = await isTeamMember(teamId, req.user.id);

  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "You are not a member of this team");
  }

  // Only count leader-election votes, not other kinds of team votes.
  const votes = await Vote.find({
    team_id: teamId,
    vote_type: "leader",
  })
    .populate("voter_id", "name avatar_url")
    .populate("candidate_id", "name avatar_url")
    .sort({ voted_at: -1 })
    .lean();

  const voteCounts = {};

  for (const vote of votes) {
    if (!vote.candidate_id?._id) continue;

    const candidateId = String(vote.candidate_id._id);

    if (!voteCounts[candidateId]) {
      voteCounts[candidateId] = {
        candidate: vote.candidate_id,
        count: 0,
      };
    }

    voteCounts[candidateId].count += 1;
  }

  const results = Object.values(voteCounts).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;

    return String(a.candidate?.name || "").localeCompare(
      String(b.candidate?.name || ""),
    );
  });

  const totalMembers = await TeamMember.countDocuments({
    team_id: teamId,
    status: "accepted",
  });

  const currentVote =
    votes.find((vote) => String(vote.voter_id?._id) === String(req.user.id)) ||
    null;

  const totalVotes = votes.length;
  const allMembersVoted = totalMembers > 0 && totalVotes >= totalMembers;

  const hasTie = results.length > 1 && results[0].count === results[1].count;

  return res.status(200).json({
    success: true,
    data: {
      votes,
      results,
      total_votes: totalVotes,
      total_members: totalMembers,
      remaining_votes: Math.max(0, totalMembers - totalVotes),
      all_members_voted: allMembersVoted,
      has_tie: hasTie,
      has_voted: Boolean(currentVote),
      your_vote: currentVote,
    },
  });
};

// POST /api/teams/:teamId/leader/declare
exports.declareLeader = async (req, res) => {
  const { teamId } = req.params;

  if (!isObjectId(teamId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  }

  const team = await Team.findById(teamId);

  if (!team) {
    throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");
  }

  const isLeader = String(team.leader_id) === String(req.user.id);
  const isAdmin = req.user.role === "admin";

  if (!isLeader && !isAdmin) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only the current team leader or an admin can declare the result",
    );
  }

  const acceptedMembers = await TeamMember.countDocuments({
    team_id: teamId,
    status: "accepted",
  });

  if (acceptedMembers === 0) {
    throw new HttpError(
      422,
      "NO_MEMBERS",
      "There are no accepted team members",
    );
  }

  const votes = await Vote.find({
    team_id: teamId,
    vote_type: "leader",
  })
    .populate("candidate_id", "name")
    .lean();

  if (votes.length === 0) {
    throw new HttpError(422, "NO_VOTES", "No votes have been cast");
  }

  // Do not finalize the election before every accepted member votes.
  if (votes.length < acceptedMembers) {
    throw new HttpError(
      409,
      "VOTING_INCOMPLETE",
      `${acceptedMembers - votes.length} member(s) still need to vote`,
    );
  }

  const voteCounts = {};

  for (const vote of votes) {
    if (!vote.candidate_id?._id) continue;

    const candidateId = String(vote.candidate_id._id);
    voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
  }

  const entries = Object.entries(voteCounts).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    throw new HttpError(
      422,
      "NO_VALID_VOTES",
      "No valid candidate votes were found",
    );
  }

  const maxVotes = entries[0][1];
  const tiedCandidates = entries.filter((entry) => entry[1] === maxVotes);

  // Never choose a random candidate when the election is tied.
  if (tiedCandidates.length > 1) {
    throw new HttpError(
      409,
      "VOTE_TIE",
      "The election is tied. A tie-break election is required before a leader can be declared.",
    );
  }

  const winnerId = entries[0][0];

  const winnerIsMember = await TeamMember.exists({
    team_id: teamId,
    user_id: winnerId,
    status: "accepted",
  });

  if (!winnerIsMember) {
    throw new HttpError(
      422,
      "INVALID_WINNER",
      "The winning candidate is no longer an accepted team member",
    );
  }

  // Update the team leader and member roles.
  team.leader_id = winnerId;
  await team.save();

  await TeamMember.updateMany(
    {
      team_id: teamId,
      status: "accepted",
      role: "leader",
    },
    {
      $set: { role: "member" },
    },
  );

  await TeamMember.updateOne(
    {
      team_id: teamId,
      user_id: winnerId,
      status: "accepted",
    },
    {
      $set: { role: "leader" },
    },
  );

  const winner = await User.findById(winnerId).select("name").lean();

  const members = await TeamMember.find({
    team_id: teamId,
    status: "accepted",
  }).lean();

  for (const teamMember of members) {
    try {
      await createNotification({
        user: teamMember.user_id,
        type: "team_confirmed",
        title: "Leader Elected!",
        message: `${winner?.name || "The winning candidate"} has been elected as the team leader.`,
        link: `/teams/${teamId}`,
        priority: "high",
      });
    } catch (notificationError) {
      console.error("Leader election notification failed:", notificationError);
    }
  }

  return res.status(200).json({
    success: true,
    message: "Team leader declared successfully",
    data: {
      leader_id: winnerId,
      leader_name: winner?.name || "Team Leader",
      vote_count: maxVotes,
    },
  });
};
