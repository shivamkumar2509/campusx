const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const mc = require("../controllers/matching.controller");

const router = express.Router();

router.post("/events/:eventId/matching/run", auth, mc.runMatching);
router.get("/events/:eventId/suggestions", auth, mc.listSuggestions);
router.post("/suggestions/:suggestionId/accept", auth, mc.acceptSuggestion);
router.post("/suggestions/:suggestionId/reject", auth, mc.rejectSuggestion);

router.use(routeError);
module.exports = router;
