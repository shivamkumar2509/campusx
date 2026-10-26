const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const Conversation = require("../models/conversation.model");
const ConversationMember = require("../models/conversationMember.model");
const Event = require("../models/event.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

const assertActiveMember = async (teamId, userId) => {
  const m = await TeamMember.findOne({
    team_id: teamId,
    user_id: userId,
    status: "accepted",
  }).lean();
  if (!m)
    throw new HttpError(403, "FORBIDDEN", "You are not a member of this team");
  return m;
};

const assertLeader = async (teamId, userId) => {
  const team = await Team.findById(teamId).select("leader_id").lean();
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");
  if (String(team.leader_id) !== String(userId)) {
    throw new HttpError(403, "FORBIDDEN", "Only team leader can do this");
  }
  return team;
};

// ===== GET /api/teams/:teamId =====
exports.getTeam = async (req, res) => {
  const { teamId } = req.params;
  if (!isObjectId(teamId))
    throw new HttpError(400, "INVALID_ID", "Invalid team id");

  await assertActiveMember(teamId, req.user.id);

  const team = await Team.findById(teamId)
    .populate("leader_id", "name avatar_url")
    .populate(
      "event_id",
      "title type deadline status team_size_min team_size_max max_teams",
    )
    .lean();
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");

  const memberCount = await TeamMember.countDocuments({
    team_id: teamId,
    status: "accepted",
  });

  return res.status(200).json({
    success: true,
    data: {
      ...team,
      member_count: memberCount,
      is_leader: String(team.leader_id._id) === String(req.user.id),
    },
  });
};

// ===== POST /api/teams/:teamId/confirm =====
exports.confirmTeam = async (req, res) => {
  const { teamId } = req.params;
  if (!isObjectId(teamId))
    throw new HttpError(400, "INVALID_ID", "Invalid team id");

  await assertLeader(teamId, req.user.id);

  const team = await Team.findById(teamId);
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");
  if (team.status !== "draft") {
    throw new HttpError(422, "INVALID_STATUS", "Team is already confirmed");
  }

  const activeMembers = await TeamMember.find({
    team_id: teamId,
    status: "accepted",
  }).lean();
  if (activeMembers.length === 0) {
    throw new HttpError(422, "NO_MEMBERS", "Team has no accepted members");
  }

  // Enforce min/max team size
  if (team.event_id) {
    const event = await Event.findById(team.event_id)
      .select("team_size_min team_size_max")
      .lean();
    if (event) {
      const minSize = event.team_size_min || 2;
      const maxSize = event.team_size_max || 6;
      if (activeMembers.length < minSize) {
        throw new HttpError(
          422,
          "INSUFFICIENT_MEMBERS",
          `Team needs at least ${minSize} accepted members`,
        );
      }
      if (activeMembers.length > maxSize) {
        throw new HttpError(
          422,
          "TOO_MANY_MEMBERS",
          `Team can have at most ${maxSize} accepted members`,
        );
      }
    }
  }

  await TeamMember.updateMany(
    { team_id: teamId, status: "invited" },
    { $set: { status: "accepted", joined_at: new Date() } },
  );

  team.status = "confirmed";
  team.confirmed_at = new Date();
  await team.save();

  let conversation = await Conversation.findOne({ team_id: teamId });
  if (!conversation) {
    conversation = await Conversation.create({
      team_id: teamId,
      type: "team",
      name: `${team.name} Chat`,
    });
  }

  const accepted = await TeamMember.find({
    team_id: teamId,
    status: "accepted",
  })
    .select("user_id")
    .lean();

  await Promise.all(
    accepted.map((m) =>
      ConversationMember.updateOne(
        { conv_id: conversation._id, user_id: m.user_id },
        {
          $setOnInsert: {
            conv_id: conversation._id,
            user_id: m.user_id,
            status: "active",
            joined_at: new Date(),
          },
        },
        { upsert: true },
      ),
    ),
  );

  try {
    for (const m of accepted) {
      if (String(m.user_id) !== String(req.user.id)) {
        await createNotification({
          user: m.user_id,
          type: "team_confirmed",
          title: "Team Confirmed!",
          message: `Team "${team.name}" has been confirmed. Chat is now open.`,
          link: `/teams/${teamId}/chat`,
          priority: "high",
        });
      }
    }
  } catch (err) {
    console.error("Confirm notify failed:", err.message);
  }

  return res.status(200).json({
    success: true,
    data: { team, conversation_id: conversation._id },
  });
};

// ===== GET /api/teams/:teamId/conversation =====
exports.getTeamConversation = async (req, res) => {
  const { teamId } = req.params;
  if (!isObjectId(teamId))
    throw new HttpError(400, "INVALID_ID", "Invalid team id");

  await assertActiveMember(teamId, req.user.id);

  const team = await Team.findById(teamId).select("status name").lean();
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");

  if (team.status === "draft") {
    throw new HttpError(
      403,
      "TEAM_NOT_CONFIRMED",
      "Chat opens only after the team is confirmed",
    );
  }

  let conversation = await Conversation.findOne({ team_id: teamId });
  if (!conversation) {
    conversation = await Conversation.create({
      team_id: teamId,
      type: "team",
      name: `${team.name} Chat`,
    });

    const accepted = await TeamMember.find({
      team_id: teamId,
      status: "accepted",
    })
      .select("user_id")
      .lean();

    await Promise.all(
      accepted.map((m) =>
        ConversationMember.updateOne(
          { conv_id: conversation._id, user_id: m.user_id },
          {
            $setOnInsert: {
              conv_id: conversation._id,
              user_id: m.user_id,
              status: "active",
              joined_at: new Date(),
            },
          },
          { upsert: true },
        ),
      ),
    );
  } else {
    const cm = await ConversationMember.findOne({
      conv_id: conversation._id,
      user_id: req.user.id,
      status: "active",
    }).lean();
    if (!cm) {
      await ConversationMember.updateOne(
        { conv_id: conversation._id, user_id: req.user.id },
        {
          $set: {
            conv_id: conversation._id,
            user_id: req.user.id,
            status: "active",
            joined_at: new Date(),
          },
        },
        { upsert: true },
      );
    }
  }

  return res.status(200).json({ success: true, data: conversation });
};

// ===== GET /api/teams/:teamId/members =====
exports.getTeamMembers = async (req, res) => {
  const { teamId } = req.params;
  if (!isObjectId(teamId))
    throw new HttpError(400, "INVALID_ID", "Invalid team id");

  await assertActiveMember(teamId, req.user.id);

  const members = await TeamMember.find({
    team_id: teamId,
    status: { $in: ["accepted", "invited"] },
  })
    .populate("user_id", "name email avatar_url year experience_level skills")
    .sort({ joined_at: 1 })
    .lean();

  const data = members.map((m) => ({
    _id: m._id,
    user_id: m.user_id?._id,
    name: m.user_id?.name || "Unknown",
    email: m.user_id?.email || "",
    avatar_url: m.user_id?.avatar_url || "",
    year: m.user_id?.year || null,
    experience_level: m.user_id?.experience_level || null,
    role: m.role,
    status: m.status,
    joined_at: m.joined_at,
    left_at: m.left_at,
  }));

  return res.status(200).json({ success: true, data });
};
