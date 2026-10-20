const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const ec = require("../controllers/event.controller");
const en = require("../controllers/enrollment.controller");
const fb = require("../controllers/feedback.controller");

const router = express.Router();

// Events
router.get("/events", auth, ec.listEvents);
router.post("/events", auth, ec.createEvent);
router.get("/events/:eventId", auth, ec.getEvent);
router.patch("/events/:eventId", auth, ec.updateEvent);
router.delete("/events/:eventId", auth, ec.deleteEvent);
router.post("/events/:eventId/publish", auth, ec.publishEvent);
router.post("/events/:eventId/close", auth, ec.closeEvent);

// Enrollment
router.post("/events/:eventId/enroll", auth, en.enrollInEvent);
router.get("/events/:eventId/enrollments", auth, en.listEventEnrollments);
router.get("/users/me/enrollments", auth, en.listMyEnrollments);

// Feedback
router.post("/teams/:teamId/feedback", auth, fb.submitFeedback);
router.get("/events/:eventId/feedback", auth, fb.getEventFeedback);

router.use(routeError);
module.exports = router;
