import api from "./axios";

export const fetchAnalytics = () =>
  api.get("/admin/analytics").then((r) => r.data);

export const fetchAuditLogs = (params = {}) =>
  api.get("/admin/audit-logs", { params }).then((r) => r.data);

export const exportAnalyticsCSV = async () => {
  const res = await api.get("/admin/analytics/export", {
    responseType: "blob",
  });

  const cd = res.headers["content-disposition"] || "";
  const match = /filename="([^"]+)"/.exec(cd);
  const filename =
    (match && match[1]) ||
    `campusx-admin-export-${new Date().toISOString().slice(0, 10)}.csv`;

  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);

  return filename;
};

// ===== Students =====
export const fetchStudents = (params = {}) =>
  api.get("/admin/students", { params }).then((r) => r.data);

export const fetchStudentDetail = (userId) =>
  api.get(`/admin/students/${userId}`).then((r) => r.data);

export const createStudent = (body) =>
  api.post("/admin/students", body).then((r) => r.data);

export const approveStudent = (userId) =>
  api.patch(`/admin/students/${userId}/approve`).then((r) => r.data);

export const suspendStudent = (userId) =>
  api.patch(`/admin/students/${userId}/suspend`).then((r) => r.data);

export const restoreStudent = (userId) =>
  api.patch(`/admin/students/${userId}/restore`).then((r) => r.data);

export const deleteStudent = (userId) =>
  api.delete(`/admin/students/${userId}`).then((r) => r.data);

// ===== Club roles =====
export const fetchClubRoles = (clubId) =>
  api.get(`/admin/clubs/${clubId}/roles`).then((r) => r.data);

export const assignSecretary = (clubId, userId) =>
  api
    .post(`/admin/clubs/${clubId}/secretary`, { user_id: userId })
    .then((r) => r.data);

export const removeSecretary = (clubId, userId) =>
  api.delete(`/admin/clubs/${clubId}/secretary/${userId}`).then((r) => r.data);

export const addCoreMember = (clubId, userId) =>
  api
    .post(`/admin/clubs/${clubId}/core-members`, { user_id: userId })
    .then((r) => r.data);

export const removeCoreMember = (clubId, userId) =>
  api
    .delete(`/admin/clubs/${clubId}/core-members/${userId}`)
    .then((r) => r.data);
