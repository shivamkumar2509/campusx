import api from "./axios";

export const fetchMessages = (convId, params = {}) =>
  api.get(`/conversations/${convId}/messages`, { params }).then((r) => r.data);

export const sendMessage = (convId, body) =>
  api.post(`/conversations/${convId}/messages`, body).then((r) => r.data);

export const editMessage = (messageId, content) =>
  api.patch(`/messages/${messageId}`, { content }).then((r) => r.data);

export const markConversationRead = (convId) =>
  api.post(`/conversations/${convId}/read`).then((r) => r.data);

export const addAttachment = (convId, body) =>
  api.post(`/conversations/${convId}/attachments`, body).then((r) => r.data);
