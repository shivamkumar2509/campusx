import api from "./axios";

// GET /notifications -> { success, data: [...], meta: { ..., unread_count } }
export const fetchNotifications = (params = {}) =>
  api.get("/notifications", { params }).then((res) => res.data);

// PATCH /notifications/:id/read
export const markNotificationRead = (notificationId) =>
  api
    .patch(`/notifications/${notificationId}/read`)
    .then((res) => res.data.data);

// GET /users/me/notification-preferences
export const fetchPreferences = () =>
  api.get("/users/me/notification-preferences").then((res) => res.data.data);

// PATCH /users/me/notification-preferences
export const updatePreferences = (body) =>
  api
    .patch("/users/me/notification-preferences", body)
    .then((res) => res.data.data);
