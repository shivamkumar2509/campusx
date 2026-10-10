import api from "./axios";

// GET /clubs -> { success, data: [...], meta }
export const fetchClubs = (params = {}) =>
  api.get("/clubs", { params }).then((res) => res.data);

// GET /clubs/:clubId
export const fetchClub = (clubId) =>
  api.get(`/clubs/${clubId}`).then((res) => res.data.data);

// GET /clubs/:clubId/members
export const fetchClubMembers = (clubId) =>
  api
    .get(`/clubs/${clubId}/members`, { params: { limit: 100 } })
    .then((res) => res.data.data);

// GET /clubs/:clubId/recruitments
export const fetchClubRecruitments = (clubId) =>
  api.get(`/clubs/${clubId}/recruitments`).then((res) => res.data.data);
