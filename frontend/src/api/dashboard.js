import api from "./axios";

export const fetchUpcomingEvents = (limit = 3) =>
  api
    .get("/events", { params: { status: "published", limit } })
    .then((r) => r.data);

export const fetchRecentNotifications = (limit = 3) =>
  api.get("/notifications", { params: { limit } }).then((r) => r.data);

export const fetchMySuggestions = (eventId) =>
  api.get(`/events/${eventId}/suggestions`).then((r) => r.data);
