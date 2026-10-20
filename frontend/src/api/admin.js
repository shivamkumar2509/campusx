import api from "./axios";

export const fetchAnalytics = () =>
  api.get("/admin/analytics").then((r) => r.data.data);

export const fetchAuditLogs = (params = {}) =>
  api.get("/admin/audit-logs", { params }).then((r) => r.data);

export const exportAnalyticsCsv = async () => {
  const res = await api.get("/admin/analytics/export", {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = "campusx-analytics.csv";
  a.click();
  window.URL.revokeObjectURL(url);
};

// ===== USER MANAGEMENT =====
export const fetchStudents = (params = {}) =>
  api.get("/admin/students", { params }).then((r) => r.data);

export const createStudent = (body) =>
  api.post("/admin/users", body).then((r) => r.data);

export const approveUser = (userId) =>
  api.patch(`/admin/users/${userId}/approve`).then((r) => r.data);

export const suspendUser = (userId) =>
  api.patch(`/admin/users/${userId}/suspend`).then((r) => r.data);

export const restoreUser = (userId) =>
  api.patch(`/admin/users/${userId}/restore`).then((r) => r.data);

export const deleteUser = (userId) =>
  api.delete(`/admin/users/${userId}`).then((r) => r.data);

export const broadcastNotification = (body) =>
  api.post("/admin/notifications/broadcast", body).then((r) => r.data);

// ===== CLUB CRUD =====
export const createClub = (body) =>
  api.post("/admin/clubs", body).then((r) => r.data.data);

export const updateClub = (clubId, body) =>
  api.patch(`/admin/clubs/${clubId}`, body).then((r) => r.data.data);

export const deleteClub = (clubId) =>
  api.delete(`/admin/clubs/${clubId}`).then((r) => r.data);

export const fetchClubRoles = (clubId) =>
  api.get(`/admin/clubs/${clubId}/roles`).then((r) => r.data);

export const assignSecretary = (clubId, userId) =>
  api
    .patch(`/admin/clubs/${clubId}/secretary`, { user_id: userId })
    .then((r) => r.data);

export const removeSecretary = (clubId, userId) =>
  api
    .delete(`/admin/clubs/${clubId}/secretary`, { data: { user_id: userId } })
    .then((r) => r.data);

export const addCoreMember = (clubId, userId) =>
  api
    .post(`/admin/clubs/${clubId}/core-members`, { user_id: userId })
    .then((r) => r.data);

export const removeCoreMember = (clubId, userId) =>
  api
    .delete(`/admin/clubs/${clubId}/core-members/${userId}`)
    .then((r) => r.data);
export const fetchExternalInvites = () =>
  api.get("/admin/external-invitations").then((r) => r.data.data);
export const approveExternalInvite = (id) =>
  api.patch(`/admin/external-invitations/${id}/approve`).then((r) => r.data);
export const rejectExternalInvite = (id) =>
  api.patch(`/admin/external-invitations/${id}/reject`).then((r) => r.data);
