const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const { audit } = require("../middleware/audit.middleware");
const c = require("../controllers/task.controller");

const router = express.Router();

// Team-scoped
router.get("/teams/:teamId/tasks", auth, c.listTasks);
router.post(
  "/teams/:teamId/tasks",
  auth,
  audit("task.create", "Task"),
  c.createTask,
);

// Task-scoped
router.patch(
  "/tasks/:taskId",
  auth,
  audit("task.update", "Task"),
  c.updateTask,
);
router.delete(
  "/tasks/:taskId",
  auth,
  audit("task.delete", "Task"),
  c.deleteTask,
);

// Assignment
router.post(
  "/tasks/:taskId/assignments",
  auth,
  audit("task.assign", "Task"),
  c.assignTask,
);
router.delete(
  "/tasks/:taskId/assignments/:userId",
  auth,
  audit("task.unassign", "Task"),
  c.unassignTask,
);

router.use(routeError);

module.exports = router;
