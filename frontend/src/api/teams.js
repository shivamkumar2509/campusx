import api from "./axios";

export async function fetchTeam(teamId) {
  const { data } = await api.get(`/teams/${teamId}`);
  return data.data;
}

export async function updateTeam(teamId, body) {
  const { data } = await api.patch(`/teams/${teamId}`, body);
  return data.data;
}

export async function confirmTeam(teamId) {
  const { data } = await api.post(`/teams/${teamId}/confirm`);
  return data.data;
}

export async function fetchTeamMembers(teamId) {
  const { data } = await api.get(`/teams/${teamId}/members`);
  return data;
}

export async function fetchTeamConversation(teamId) {
  const { data } = await api.get(`/teams/${teamId}/conversation`);
  return data.data;
}

export async function fetchTeamTasks(teamId) {
  const { data } = await api.get(`/teams/${teamId}/tasks`);
  return data;
}

export async function fetchMyTeams() {
  const { data } = await api.get("/teams/my");
  return Array.isArray(data.data) ? data.data : [];
}
