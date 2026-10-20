import api from "./axios";

export const fetchNotifications = (params = {}) =>
  api.get("/notifications", { params }).then((r) => r.data);

export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read`).then((r) => r.data);

export const fetchPreferences = () =>
  api.get("/users/me/notification-preferences").then((r) => r.data.data);

export const updatePreferences = (body) =>
  api
    .patch("/users/me/notification-preferences", body)
    .then((r) => r.data.data);
