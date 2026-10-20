const Message = require("../models/message.model");
const Attachment = require("../models/attachment.model");
const Conversation = require("../models/conversation.model");
const ConversationMember = require("../models/conversationMember.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");

const ensureMember = async (convId, userId) => {
  const cm = await ConversationMember.findOne({
    conv_id: convId,
    user_id: userId,
    status: "active",
  }).lean();
  return Boolean(cm);
};

// POST /api/conversations/:convId/messages
exports.sendMessage = async (req, res) => {
  const { convId } = req.params;
  const { content, type = "text", reply_to = null } = req.body || {};

  if (!isObjectId(convId))
    throw new HttpError(400, "INVALID_ID", "Invalid conversation id");
  if (!content || !content.trim()) {
    throw new HttpError(400, "VALIDATION_ERROR", "content is required");
  }

  const ok = await ensureMember(convId, req.user.id);
  if (!ok) throw new HttpError(403, "FORBIDDEN", "Not a conversation member");

  const message = await Message.create({
    conv_id: convId,
    sender_id: req.user.id,
    content: content.trim(),
    type,
    reply_to: reply_to && isObjectId(reply_to) ? reply_to : null,
  });

  await Conversation.updateOne(
    { _id: convId },
    { $set: { last_message_at: new Date() } },
  );

  const populated = await Message.findById(message._id)
    .populate("sender_id", "name avatar_url")
    .lean();

  // Emit via socket if available
  const io = req.app.get("io");
  if (io) {
    io.to(`conv:${convId}`).emit("message:new", populated);
  }

  return res.status(201).json({ success: true, data: populated });
};

// PATCH /api/messages/:messageId  (edit)
exports.editMessage = async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body || {};

  if (!isObjectId(messageId))
    throw new HttpError(400, "INVALID_ID", "Invalid message id");
  if (!content || !content.trim()) {
    throw new HttpError(400, "VALIDATION_ERROR", "content is required");
  }

  const msg = await Message.findOne({
    _id: messageId,
    sender_id: req.user.id,
    deleted: false,
  });
  if (!msg)
    throw new HttpError(
      404,
      "MESSAGE_NOT_FOUND",
      "Message not found or not yours",
    );

  msg.content = content.trim();
  msg.edited = true;
  await msg.save();

  const populated = await Message.findById(msg._id)
    .populate("sender_id", "name avatar_url")
    .lean();

  const io = req.app.get("io");
  if (io) io.to(`conv:${msg.conv_id}`).emit("message:updated", populated);

  return res.status(200).json({ success: true, data: populated });
};

// DELETE /api/messages/:messageId  (soft delete)
exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  if (!isObjectId(messageId))
    throw new HttpError(400, "INVALID_ID", "Invalid message id");

  const msg = await Message.findOne({
    _id: messageId,
    sender_id: req.user.id,
  });
  if (!msg)
    throw new HttpError(
      404,
      "MESSAGE_NOT_FOUND",
      "Message not found or not yours",
    );

  msg.deleted = true;
  await msg.save();

  const io = req.app.get("io");
  if (io)
    io.to(`conv:${msg.conv_id}`).emit("message:deleted", { _id: msg._id });

  return res.status(200).json({ success: true, message: "Message deleted" });
};

// POST /api/messages/:messageId/attachments
exports.attachToMessage = async (req, res) => {
  const { messageId } = req.params;
  const {
    file_url,
    public_id = "",
    file_name = "",
    file_size = 0,
    mime_type = "",
  } = req.body || {};

  if (!isObjectId(messageId))
    throw new HttpError(400, "INVALID_ID", "Invalid message id");
  if (!file_url)
    throw new HttpError(400, "VALIDATION_ERROR", "file_url is required");

  const msg = await Message.findOne({
    _id: messageId,
    sender_id: req.user.id,
    deleted: false,
  });
  if (!msg)
    throw new HttpError(
      404,
      "MESSAGE_NOT_FOUND",
      "Message not found or not yours",
    );

  const attachment = await Attachment.create({
    message_id: msg._id,
    uploaded_by: req.user.id,
    file_url,
    public_id,
    file_name,
    file_size,
    mime_type,
  });

  return res.status(201).json({ success: true, data: attachment });
};

// GET /api/messages/:messageId/attachments
exports.listAttachments = async (req, res) => {
  const { messageId } = req.params;
  if (!isObjectId(messageId))
    throw new HttpError(400, "INVALID_ID", "Invalid message id");

  const msg = await Message.findById(messageId).lean();
  if (!msg) throw new HttpError(404, "MESSAGE_NOT_FOUND", "Message not found");

  const ok = await ensureMember(msg.conv_id, req.user.id);
  if (!ok) throw new HttpError(403, "FORBIDDEN", "Not a conversation member");

  const attachments = await Attachment.find({ message_id: messageId }).lean();
  return res.status(200).json({ success: true, data: attachments });
};
