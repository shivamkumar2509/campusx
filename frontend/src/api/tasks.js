import api from "./axios";

export const fetchTeamTasks = (teamId) =>
  api.get(`/teams/${teamId}/tasks`).then((r) => r.data.data);

export const createTask = (teamId, body) =>
  api.post(`/teams/${teamId}/tasks`, body).then((r) => r.data.data);

export const updateTask = (taskId, body) =>
  api.patch(`/tasks/${taskId}`, body).then((r) => r.data.data);

export const deleteTask = (taskId) =>
  api.delete(`/tasks/${taskId}`).then((r) => r.data);

export const assignTask = (taskId, userId) =>
  api
    .post(`/tasks/${taskId}/assignments`, { user_id: userId })
    .then((r) => r.data.data);
