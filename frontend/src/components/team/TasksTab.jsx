import { useState } from "react";
import {
  createTask,
  deleteTask,
  fetchTeamTasks,
  updateTask,
  assignTask, // ✅ Imported
} from "../../api/tasks";
import useApiData from "../../hooks/useApiData";
import { ErrorState, LoadingBlock } from "../common/StateViews";

const COLUMNS = [
  { key: "todo", label: "To Do", color: "bg-gray-100" },
  { key: "doing", label: "Doing", color: "bg-blue-50" },
  { key: "done", label: "Done", color: "bg-green-50" },
];

export default function TasksTab({ teamId, members }) {
  const tasks = useApiData(() => fetchTeamTasks(teamId), [teamId]);
  const [newTask, setNewTask] = useState({ title: "", priority: "medium" });
  const [creating, setCreating] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleCreate = async (status = "todo") => {
    if (!newTask.title.trim()) return;
    setActionError("");
    setCreating(true);
    try {
      await createTask(teamId, {
        title: newTask.title.trim(),
        priority: newTask.priority,
        status,
      });
      setNewTask({ title: "", priority: "medium" });
      tasks.reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleMove = async (task, newStatus) => {
    setActionError("");
    try {
      await updateTask(task._id, { status: newStatus });
      tasks.reload();
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to update task");
    }
  };

  const handleAssign = async (taskId, userId) => {
    if (!userId) return;
    try {
      await assignTask(taskId, userId);
      tasks.reload();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign task");
    }
  };

  if (tasks.loading)
    return (
      <div className="bg-white rounded-xl border p-6">
        <LoadingBlock lines={3} />
      </div>
    );
  if (tasks.error)
    return <ErrorState message={tasks.error.message} onRetry={tasks.reload} />;

  const items = tasks.data || [];
  const acceptedMembers = (members || []).filter(
    (m) => m.status === "accepted",
  );

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-xl font-bold mb-4">📋 Tasks</h2>
      {actionError && (
        <p className="mb-4 text-sm bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2">
          {actionError}
        </p>
      )}

      <div className="mb-4 flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="New task title..."
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          onKeyDown={(e) => e.key === "Enter" && handleCreate("todo")}
        />
        <select
          value={newTask.priority}
          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          onClick={() => handleCreate("todo")}
          disabled={creating || !newTask.title.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-60 text-sm font-semibold"
        >
          + Add
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <div key={col.key} className={`${col.color} rounded-lg p-3`}>
            <h3 className="text-sm font-bold text-gray-700 mb-2">
              {col.label} ({items.filter((t) => t.status === col.key).length})
            </h3>
            <div className="space-y-2">
              {items
                .filter((t) => t.status === col.key)
                .map((task) => (
                  <div
                    key={task._id}
                    className="bg-white rounded-lg p-3 shadow-sm border"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm break-words">
                        {task.title}
                      </p>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          task.priority === "high"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "low"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* ✅ ASSIGNEE DROPDOWN */}
                    <div className="mt-2">
                      <select
                        onChange={(e) => handleAssign(task._id, e.target.value)}
                        value=""
                        className="text-xs border border-gray-300 rounded p-1 w-full bg-gray-50 hover:bg-gray-100"
                      >
                        <option value="">+ Assign Member</option>
                        {acceptedMembers.map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-3 flex gap-1 flex-wrap">
                      {col.key !== "todo" && (
                        <button
                          onClick={() =>
                            handleMove(
                              task,
                              col.key === "done" ? "doing" : "todo",
                            )
                          }
                          className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50"
                        >
                          ←
                        </button>
                      )}
                      {col.key !== "done" && (
                        <button
                          onClick={() =>
                            handleMove(
                              task,
                              col.key === "todo" ? "doing" : "done",
                            )
                          }
                          className="text-xs px-2 py-0.5 border rounded hover:bg-gray-50"
                        >
                          →
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm("Delete?")) {
                            deleteTask(task._id).then(() => tasks.reload());
                          }
                        }}
                        className="text-xs px-2 py-0.5 border border-red-200 text-red-600 rounded hover:bg-red-50 ml-auto"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
