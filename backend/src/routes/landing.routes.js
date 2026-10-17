const express = require("express");
const routeError = require("../middleware/routeError.middleware");
const c = require("../controllers/landing.controller");

const router = express.Router();

// Public — no auth needed (matches Landing.jsx which has no token)
router.get("/landing/stats", c.getStats);
router.get("/landing/featured-events", c.getFeaturedEvents);
router.get("/landing/featured-clubs", c.getFeaturedClubs);

router.use(routeError);

module.exports = router;
