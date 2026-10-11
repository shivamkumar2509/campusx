import api from "./axios";

// GET /recruitments/:recruitmentId
export const fetchRecruitment = (recruitmentId) =>
  api.get(`/recruitments/${recruitmentId}`).then((res) => res.data.data);

// POST /recruitments/:recruitmentId/applications
export const applyToRecruitment = (recruitmentId, body = {}) =>
  api
    .post(`/recruitments/${recruitmentId}/applications`, body)
    .then((res) => res.data.data);
