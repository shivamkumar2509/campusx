const Conversation = require("../models/conversation.model");
const ConversationMember = require("../models/conversationMember.model");
const Message = require("../models/message.model");
const Attachment = require("../models/attachment.model");
const TeamMember = require("../models/teamMember.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const {
  isObjectId,
  getPagination,
  buildMeta,
} = require("../utils/queryHelpers");

// Guard: user must be an active member of the conversation
const Team = require("../models/team.model"); // add at top

const assertConvMember = async (convId, userId) => {
  const member = await ConversationMember.findOne({
    conv_id: convId,
    user_id: userId,
    status: "active",
  }).lean();
  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "You are not in this conversation");
  }

  const conv = await Conversation.findById(convId).select("team_id").lean();
  if (conv && conv.team_id) {
    const team = await Team.findById(conv.team_id).select("status").lean();
    if (team && team.status === "draft") {
      throw new HttpError(
        403,
        "TEAM_NOT_CONFIRMED",
        "Chat opens only after the team is confirmed",
      );
    }
  }
  return member;
};

// GET /api/conversations/:convId/messages?page=&limit=&before=
exports.listMessages = async (req, res) => {
  const { convId } = req.params;
  if (!isObjectId(convId))
    throw new HttpError(400, "INVALID_ID", "Invalid conversation id");

  await assertConvMember(convId, req.user.id);

  const { page, limit, skip } = getPagination(req.query);
  const filter = { conv_id: convId, deleted: false };

  // Optional: load messages before a given message id (for scroll-up)
  if (req.query.before && isObjectId(req.query.before)) {
    const pivot = await Message.findById(req.query.before)
      .select("createdAt")
      .lean();
    if (pivot) filter.createdAt = { $lt: pivot.createdAt };
  }

  const [items, total] = await Promise.all([
    Message.find(filter)
      .populate("sender_id", "name avatar_url")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments(filter),
  ]);

  // Reverse so oldest-first when returned
  const data = items.reverse().map((m) => ({
    _id: m._id,
    conv_id: m.conv_id,
    content: m.content,
    type: m.type,
    reply_to: m.reply_to,
    edited: m.edited,
    createdAt: m.createdAt,
    sender: m.sender_id
      ? {
          _id: m.sender_id._id,
          name: m.sender_id.name,
          avatar_url: m.sender_id.avatar_url,
        }
      : null,
  }));

  return res
    .status(200)
    .json({ success: true, data, meta: buildMeta(page, limit, total) });
};

// POST /api/conversations/:convId/messages
exports.sendMessage = async (req, res) => {
  const { convId } = req.params;
  if (!isObjectId(convId))
    throw new HttpError(400, "INVALID_ID", "Invalid conversation id");

  await assertConvMember(convId, req.user.id);

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    throw new HttpError(400, "VALIDATION_ERROR", "content is required");
  }
  if (content.length > 5000) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Message too long (max 5000 chars)",
    );
  }

  const type = ["text", "image", "file"].includes(body.type)
    ? body.type
    : "text";
  const replyTo =
    body.reply_to && isObjectId(body.reply_to) ? body.reply_to : null;

  const message = await Message.create({
    conv_id: convId,
    sender_id: req.user.id,
    content,
    type,
    reply_to: replyTo,
  });

  // Bump conversation last_message_at
  await Conversation.updateOne(
    { _id: convId },
    { $set: { last_message_at: message.createdAt } },
  );

  // Mark sender's last_read_at
  await ConversationMember.updateOne(
    { conv_id: convId, user_id: req.user.id },
    { $set: { last_read_at: new Date() } },
  );

  const sender = await User.findById(req.user.id)
    .select("name avatar_url")
    .lean();

  const payload = {
    _id: message._id,
    conv_id: message.conv_id,
    content: message.content,
    type: message.type,
    reply_to: message.reply_to,
    edited: message.edited,
    createdAt: message.createdAt,
    sender: sender
      ? { _id: sender._id, name: sender.name, avatar_url: sender.avatar_url }
      : null,
  };

  // Push via WebSocket (if attached)
  const io = req.app.get("io");
  if (io) {
    io.to(`conv:${convId}`).emit("message:new", payload);
  }

  return res.status(201).json({ success: true, data: payload });
};

// PATCH /api/messages/:messageId — edit own text message
exports.editMessage = async (req, res) => {
  const { messageId } = req.params;
  if (!isObjectId(messageId))
    throw new HttpError(400, "INVALID_ID", "Invalid message id");

  const message = await Message.findById(messageId);
  if (!message || message.deleted) {
    throw new HttpError(404, "MESSAGE_NOT_FOUND", "Message not found");
  }
  if (String(message.sender_id) !== String(req.user.id)) {
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only the sender can edit this message",
    );
  }
  if (message.type !== "text") {
    throw new HttpError(
      422,
      "INVALID_TYPE",
      "Only text messages can be edited",
    );
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content)
    throw new HttpError(400, "VALIDATION_ERROR", "content is required");
  if (content.length > 5000)
    throw new HttpError(400, "VALIDATION_ERROR", "Message too long");

  message.content = content;
  message.edited = true;
  await message.save();

  const payload = {
    _id: message._id,
    conv_id: message.conv_id,
    content: message.content,
    edited: true,
    editedAt: message.updatedAt,
  };

  const io = req.app.get("io");
  if (io) io.to(`conv:${message.conv_id}`).emit("message:edited", payload);

  return res.status(200).json({ success: true, data: payload });
};

// POST /api/conversations/:convId/read — mark all read
exports.markConversationRead = async (req, res) => {
  const { convId } = req.params;
  if (!isObjectId(convId))
    throw new HttpError(400, "INVALID_ID", "Invalid conversation id");

  await assertConvMember(convId, req.user.id);
  await ConversationMember.updateOne(
    { conv_id: convId, user_id: req.user.id },
    { $set: { last_read_at: new Date() } },
  );

  return res.status(200).json({ success: true });
};

// POST /api/conversations/:convId/attachments
// Body: { file_url, public_id, file_name, file_size, mime_type, message_id? }
exports.addAttachment = async (req, res) => {
  const { convId } = req.params;
  if (!isObjectId(convId))
    throw new HttpError(400, "INVALID_ID", "Invalid conversation id");

  await assertConvMember(convId, req.user.id);

  const body = req.body || {};
  if (!body.file_url || typeof body.file_url !== "string") {
    throw new HttpError(400, "VALIDATION_ERROR", "file_url is required");
  }

  // If message_id given, verify it belongs to this conversation and is ours
  let messageId = null;
  if (body.message_id && isObjectId(body.message_id)) {
    const msg = await Message.findOne({
      _id: body.message_id,
      conv_id: convId,
    });
    if (!msg)
      throw new HttpError(404, "MESSAGE_NOT_FOUND", "Message not found");
    if (String(msg.sender_id) !== String(req.user.id)) {
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Can only attach to your own message",
      );
    }
    messageId = msg._id;
  }

  const attachment = await Attachment.create({
    message_id: messageId,
    uploaded_by: req.user.id,
    file_url: body.file_url,
    public_id: body.public_id || "",
    file_name: body.file_name || "",
    file_size: Number(body.file_size) || 0,
    mime_type: body.mime_type || "",
  });

  return res.status(201).json({ success: true, data: attachment });
};
