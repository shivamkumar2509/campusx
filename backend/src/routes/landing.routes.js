const express = require("express");
const routeError = require("../middleware/routeError.middleware");
const lc = require("../controllers/landing.controller");

const router = express.Router();

router.get("/landing/featured-events", lc.featuredEvents);
router.get("/landing/featured-clubs", lc.featuredClubs);
router.get("/landing/stats", lc.stats);

router.use(routeError);
module.exports = router;
