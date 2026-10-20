const Attachment = require("../models/attachment.model");
const Task = require("../models/task.model");
const TeamMember = require("../models/teamMember.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");

// POST /api/tasks/:taskId/attachments
exports.attachToTask = async (req, res) => {
  const { taskId } = req.params;
  const {
    file_url,
    public_id = "",
    file_name = "",
    file_size = 0,
    mime_type = "",
  } = req.body || {};

  if (!isObjectId(taskId))
    throw new HttpError(400, "INVALID_ID", "Invalid task id");
  if (!file_url)
    throw new HttpError(400, "VALIDATION_ERROR", "file_url is required");

  const task = await Task.findById(taskId).lean();
  if (!task) throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");

  const isMember = await TeamMember.exists({
    team_id: task.team_id,
    user_id: req.user.id,
    status: "accepted",
  });
  if (!isMember) throw new HttpError(403, "FORBIDDEN", "Not a team member");

  const attachment = await Attachment.create({
    task_id: task._id,
    uploaded_by: req.user.id,
    file_url,
    public_id,
    file_name,
    file_size,
    mime_type,
  });

  return res.status(201).json({ success: true, data: attachment });
};

// GET /api/tasks/:taskId/attachments
exports.listTaskAttachments = async (req, res) => {
  const { taskId } = req.params;
  if (!isObjectId(taskId))
    throw new HttpError(400, "INVALID_ID", "Invalid task id");

  const task = await Task.findById(taskId).lean();
  if (!task) throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");

  const isMember = await TeamMember.exists({
    team_id: task.team_id,
    user_id: req.user.id,
    status: "accepted",
  });
  if (!isMember) throw new HttpError(403, "FORBIDDEN", "Not a team member");

  const attachments = await Attachment.find({ task_id: taskId }).lean();
  return res.status(200).json({ success: true, data: attachments });
};
