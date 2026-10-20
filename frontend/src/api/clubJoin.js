import api from "./axios";

export const raiseJoinRequest = (clubId, body = {}) =>
  api.post(`/clubs/${clubId}/join-request`, body).then((r) => r.data.data);

export const fetchMyJoinRequests = () =>
  api.get("/users/me/join-requests").then((r) => r.data.data);

export const cancelJoinRequest = (requestId) =>
  api.delete(`/join-requests/${requestId}`).then((r) => r.data);

export const fetchClubJoinRequests = (clubId, params = {}) =>
  api
    .get(`/clubs/${clubId}/join-requests`, { params })
    .then((r) => r.data.data);

export const scheduleVerification = (requestId, body) =>
  api
    .patch(`/join-requests/${requestId}/schedule`, body)
    .then((r) => r.data.data);

export const approveJoinRequest = (requestId) =>
  api.patch(`/join-requests/${requestId}/approve`).then((r) => r.data.data);

export const rejectJoinRequest = (requestId, body = {}) =>
  api
    .patch(`/join-requests/${requestId}/reject`, body)
    .then((r) => r.data.data);
