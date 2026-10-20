import api from "./axios";

export const fetchConversations = () =>
  api.get("/conversations").then((r) => r.data.data);

export const fetchTeamConversation = (teamId) =>
  api.get(`/teams/${teamId}/conversation`).then((r) => r.data.data);

export const fetchMessages = (convId, params = {}) =>
  api.get(`/conversations/${convId}/messages`, { params }).then((r) => r.data);

export const sendMessage = (convId, body) =>
  api.post(`/conversations/${convId}/messages`, body).then((r) => r.data.data);

export const editMessage = (messageId, content) =>
  api.patch(`/messages/${messageId}`, { content }).then((r) => r.data.data);

export const deleteMessage = (messageId) =>
  api.delete(`/messages/${messageId}`).then((r) => r.data);

export const getUploadSignature = (body = {}) =>
  api.post("/uploads/signature", body).then((r) => r.data.data);

export const attachToMessage = (messageId, body) =>
  api.post(`/messages/${messageId}/attachments`, body).then((r) => r.data.data);
