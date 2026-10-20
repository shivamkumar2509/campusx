import api from "./axios";

export const fetchEvents = (params) =>
  api.get("/events", { params }).then((r) => r.data);

export const fetchEvent = (eventId) =>
  api.get(`/events/${eventId}`).then((r) => r.data.data);

export const enrollInEvent = (eventId) =>
  api.post(`/events/${eventId}/enroll`).then((r) => r.data);

export const fetchEventEnrollments = (eventId) =>
  api.get(`/events/${eventId}/enrollments`).then((r) => r.data.data);

export const fetchMyEnrollments = () =>
  api.get("/users/me/enrollments").then((r) => r.data.data);

export const submitFeedback = (teamId, payload) =>
  api.post(`/teams/${teamId}/feedback`, payload).then((r) => r.data);

export const fetchEventFeedback = (eventId) =>
  api.get(`/events/${eventId}/feedback`).then((r) => r.data);
