const Conversation = require("../models/conversation.model");
const ConversationMember = require("../models/conversationMember.model");
const Message = require("../models/message.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");

const ensureConversationMember = async (convId, userId) => {
  const cm = await ConversationMember.findOne({
    conv_id: convId,
    user_id: userId,
    status: "active",
  }).lean();
  return Boolean(cm);
};

// GET /api/teams/:teamId/conversation
exports.getTeamConversation = async (req, res) => {
  const { teamId } = req.params;
  if (!isObjectId(teamId))
    throw new HttpError(400, "INVALID_ID", "Invalid team id");

  const isMember = await TeamMember.exists({
    team_id: teamId,
    user_id: req.user.id,
    status: "accepted",
  });
  if (!isMember) throw new HttpError(403, "FORBIDDEN", "Not a team member");

  let conversation = await Conversation.findOne({ team_id: teamId }).lean();

  if (!conversation) {
    const team = await Team.findById(teamId);
    if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");

    conversation = (
      await Conversation.create({
        team_id: teamId,
        type: "team",
        name: `${team.name} Chat`,
      })
    ).toObject();

    const members = await TeamMember.find({
      team_id: teamId,
      status: "accepted",
    }).lean();
    if (members.length) {
      const ops = members.map((m) => ({
        conv_id: conversation._id,
        user_id: m.user_id,
        status: "active",
      }));
      try {
        await ConversationMember.insertMany(ops, { ordered: false });
      } catch (e) {
        if (e.code !== 11000) console.error("conv member insert:", e.message);
      }
    }
  }

  const unreadCount = await Message.countDocuments({
    conv_id: conversation._id,
    sender_id: { $ne: req.user.id },
    deleted: false,
  });

  return res.status(200).json({
    success: true,
    data: { ...conversation, unread_count: unreadCount },
  });
};

// GET /api/conversations/:convId/messages?before=&limit=
exports.listMessages = async (req, res) => {
  const { convId } = req.params;
  const { before } = req.query;
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isInteger(limit) || limit < 1) limit = 30;
  if (limit > 100) limit = 100;

  if (!isObjectId(convId))
    throw new HttpError(400, "INVALID_ID", "Invalid conversation id");

  const ok = await ensureConversationMember(convId, req.user.id);
  if (!ok) throw new HttpError(403, "FORBIDDEN", "Not a conversation member");

  const filter = { conv_id: convId, deleted: false };
  if (before && isObjectId(before)) {
    filter._id = { $lt: before };
  }

  const messages = await Message.find(filter)
    .populate("sender_id", "name avatar_url")
    .sort({ _id: -1 })
    .limit(limit)
    .lean();

  // Mark last read
  await ConversationMember.updateOne(
    { conv_id: convId, user_id: req.user.id },
    { $set: { last_read_at: new Date() } },
  );

  return res.status(200).json({
    success: true,
    data: messages.reverse(), // oldest first
    meta: {
      count: messages.length,
      has_more: messages.length === limit,
      oldest_id: messages.length ? messages[messages.length - 1]._id : null,
    },
  });
};

// GET /api/conversations
exports.listMyConversations = async (req, res) => {
  const memberships = await ConversationMember.find({
    user_id: req.user.id,
    status: "active",
  }).lean();

  const convIds = memberships.map((m) => m.conv_id);
  const conversations = await Conversation.find({ _id: { $in: convIds } })
    .sort({ last_message_at: -1, createdAt: -1 })
    .lean();

  return res.status(200).json({ success: true, data: conversations });
};

// PATCH /api/conversations/:convId/mute
exports.toggleMute = async (req, res) => {
  const { convId } = req.params;
  const { muted } = req.body || {};
  if (!isObjectId(convId))
    throw new HttpError(400, "INVALID_ID", "Invalid conversation id");
  if (typeof muted !== "boolean") {
    throw new HttpError(400, "VALIDATION_ERROR", "muted must be boolean");
  }

  const cm = await ConversationMember.findOneAndUpdate(
    { conv_id: convId, user_id: req.user.id, status: "active" },
    { $set: { muted } },
    { new: true },
  );
  if (!cm)
    throw new HttpError(404, "NOT_FOUND", "Conversation membership not found");

  return res.status(200).json({ success: true, data: { muted: cm.muted } });
};
