import api from "./axios";

export async function createLeaveRequest(teamId, body) {
  const { data } = await api.post(`/teams/${teamId}/leave-requests`, body);
  return data.data;
}

export async function fetchLeaveRequests(teamId, params = {}) {
  const { data } = await api.get(`/teams/${teamId}/leave-requests`, { params });
  return data;
}

export async function fetchLeaveRequestResult(teamId, requestId) {
  const { data } = await api.get(
    `/teams/${teamId}/leave-requests/${requestId}/result`
  );
  return data.data;
}

export async function voteOnLeaveRequest(teamId, requestId, vote) {
  const { data } = await api.post(
    `/teams/${teamId}/leave-requests/${requestId}/votes`,
    { vote }
  );
  return data.data;
}

export async function cancelLeaveRequest(requestId) {
  const { data } = await api.delete(`/leave-requests/${requestId}`);
  return data;
}