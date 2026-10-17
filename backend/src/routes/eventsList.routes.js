const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const c = require("../controllers/eventsList.controller");

const router = express.Router();

router.get("/events", auth, c.listEvents);
router.get("/events/:eventId", auth, c.getEvent);

router.use(routeError);

module.exports = router;
