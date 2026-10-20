const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const { audit } = require("../middleware/audit.middleware");
const c = require("../controllers/eventsList.controller");

const router = express.Router();

router.get("/events", auth, c.listEvents);
router.get("/events/:eventId", auth, c.getEvent);
router.get("/events/:eventId/enrollments", auth, c.listEnrollments);
router.post(
  "/events/:eventId/enroll",
  auth,
  audit("event.enroll", "Event"),
  c.enrollInEvent,
);
router.delete(
  "/events/:eventId/enroll",
  auth,
  audit("event.unenroll", "Event"),
  c.cancelEnrollment,
);
router.get("/users/me/enrollments", auth, c.listMyEnrollments);

router.use(routeError);

module.exports = router;
