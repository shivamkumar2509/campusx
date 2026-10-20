const Task = require("../models/task.model");
const TaskAssignment = require("../models/taskAssignment.model");
const TeamMember = require("../models/teamMember.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

// Guard: user must be an accepted member of the team
const assertTeamMember = async (teamId, userId) => {
  const member = await TeamMember.findOne({
    team_id: teamId,
    user_id: userId,
    status: "accepted",
  }).lean();
  if (!member) {
    throw new HttpError(403, "FORBIDDEN", "You are not a member of this team");
  }
  return member;
};

// ===== GET /api/teams/:teamId/tasks =====
exports.listTasks = async (req, res) => {
  const { teamId } = req.params;
  if (!isObjectId(teamId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  }

  await assertTeamMember(teamId, req.user.id);

  const tasks = await Task.find({ team_id: teamId })
    .sort({ status: 1, order: 1, createdAt: 1 })
    .lean();

  // Fetch assignments for all tasks
  const taskIds = tasks.map((t) => t._id);
  const assignments = taskIds.length
    ? await TaskAssignment.find({ task_id: { $in: taskIds } })
        .populate("user_id", "name avatar_url")
        .lean()
    : [];

  // Group assignments by task_id
  const assignMap = {};
  assignments.forEach((a) => {
    const key = String(a.task_id);
    if (!assignMap[key]) assignMap[key] = [];
    if (a.user_id) {
      assignMap[key].push({
        _id: a.user_id._id,
        name: a.user_id.name,
        avatar_url: a.user_id.avatar_url,
      });
    }
  });

  const data = tasks.map((t) => ({
    ...t,
    assignees: assignMap[String(t._id)] || [],
  }));

  // Group by status for convenience
  const grouped = {
    todo: data.filter((t) => t.status === "todo"),
    doing: data.filter((t) => t.status === "doing"),
    done: data.filter((t) => t.status === "done"),
  };

  return res.status(200).json({
    success: true,
    data: grouped,
    flat: data,
  });
};

// ===== POST /api/teams/:teamId/tasks =====
exports.createTask = async (req, res) => {
  const { teamId } = req.params;
  if (!isObjectId(teamId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  }

  await assertTeamMember(teamId, req.user.id);

  const body = req.body || {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) throw new HttpError(400, "VALIDATION_ERROR", "title is required");

  const status = ["todo", "doing", "done"].includes(body.status)
    ? body.status
    : "todo";
  const priority = ["low", "medium", "high"].includes(body.priority)
    ? body.priority
    : "medium";

  let dueDate = null;
  if (body.due_date) {
    const d = new Date(body.due_date);
    if (!isNaN(d.getTime())) dueDate = d;
  }

  // Determine next order in the target column
  const lastTask = await Task.findOne({ team_id: teamId, status })
    .sort({ order: -1 })
    .select("order")
    .lean();
  const nextOrder = (lastTask?.order ?? -1) + 1;

  const task = await Task.create({
    team_id: teamId,
    created_by: req.user.id,
    title,
    description: body.description || "",
    status,
    priority,
    due_date: dueDate,
    order: nextOrder,
    completed_at: status === "done" ? new Date() : null,
  });

  res.locals.auditUser = req.user.id;
  res.locals.auditEntityId = task._id;

  return res.status(201).json({ success: true, data: task });
};

// ===== PATCH /api/tasks/:taskId =====
exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  if (!isObjectId(taskId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid task id");
  }

  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");

  await assertTeamMember(task.team_id, req.user.id);

  const body = req.body || {};

  if (body.title !== undefined) {
    const t = typeof body.title === "string" ? body.title.trim() : "";
    if (!t)
      throw new HttpError(400, "VALIDATION_ERROR", "title cannot be empty");
    task.title = t;
  }
  if (body.description !== undefined) task.description = body.description;

  if (body.status !== undefined) {
    if (!["todo", "doing", "done"].includes(body.status)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid status");
    }
    // Order bump if moving into a column
    if (task.status !== body.status) {
      const lastTask = await Task.findOne({
        team_id: task.team_id,
        status: body.status,
        _id: { $ne: task._id },
      })
        .sort({ order: -1 })
        .select("order")
        .lean();
      task.order = (lastTask?.order ?? -1) + 1;
    }
    task.status = body.status;
    task.completed_at = body.status === "done" ? new Date() : null;
  }

  if (body.priority !== undefined) {
    if (!["low", "medium", "high"].includes(body.priority)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid priority");
    }
    task.priority = body.priority;
  }

  if (body.due_date !== undefined) {
    if (body.due_date === null) task.due_date = null;
    else {
      const d = new Date(body.due_date);
      if (isNaN(d.getTime())) {
        throw new HttpError(400, "VALIDATION_ERROR", "Invalid due_date");
      }
      task.due_date = d;
    }
  }

  if (body.order !== undefined && Number.isFinite(body.order)) {
    task.order = body.order;
  }

  await task.save();

  return res.status(200).json({ success: true, data: task });
};

// ===== DELETE /api/tasks/:taskId =====
exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  if (!isObjectId(taskId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid task id");
  }

  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");

  await assertTeamMember(task.team_id, req.user.id);

  await TaskAssignment.deleteMany({ task_id: task._id });
  await Task.deleteOne({ _id: task._id });

  return res.status(200).json({ success: true, message: "Task deleted" });
};

// ===== POST /api/tasks/:taskId/assignments =====
exports.assignTask = async (req, res) => {
  const { taskId } = req.params;
  if (!isObjectId(taskId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid task id");
  }

  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");

  await assertTeamMember(task.team_id, req.user.id);

  const { user_id } = req.body || {};
  if (!isObjectId(user_id)) {
    throw new HttpError(400, "VALIDATION_ERROR", "user_id is required");
  }

  // Target must be a team member
  const targetMember = await TeamMember.findOne({
    team_id: task.team_id,
    user_id,
    status: "accepted",
  }).lean();
  if (!targetMember) {
    throw new HttpError(422, "NOT_MEMBER", "User is not a member of this team");
  }

  // Upsert (idempotent — assigning the same user twice is a no-op)
  const existing = await TaskAssignment.findOne({
    task_id: task._id,
    user_id,
  });
  if (existing) {
    return res.status(200).json({ success: true, data: existing });
  }

  const assignment = await TaskAssignment.create({
    task_id: task._id,
    user_id,
    assigned_by: req.user.id,
  });

  // Notify (best-effort)
  if (String(user_id) !== String(req.user.id)) {
    try {
      const creator = await User.findById(req.user.id).select("name").lean();
      await createNotification({
        user: user_id,
        type: "task_assigned",
        title: "New task assigned",
        message: `${creator?.name || "Someone"} assigned you "${task.title}"`,
        link: `/teams/${task.team_id}/tasks`,
        priority: "medium",
      });
    } catch (err) {
      console.error("Task assign notify failed:", err.message);
    }
  }

  return res.status(201).json({ success: true, data: assignment });
};

// ===== DELETE /api/tasks/:taskId/assignments/:userId =====
exports.unassignTask = async (req, res) => {
  const { taskId, userId } = req.params;
  if (!isObjectId(taskId) || !isObjectId(userId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid id");
  }

  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, "TASK_NOT_FOUND", "Task not found");

  await assertTeamMember(task.team_id, req.user.id);

  await TaskAssignment.deleteOne({ task_id: task._id, user_id: userId });

  return res.status(200).json({ success: true, message: "Unassigned" });
};
