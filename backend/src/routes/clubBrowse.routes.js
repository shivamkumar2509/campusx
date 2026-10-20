const express = require("express");
const auth = require("../middleware/auth.middleware");
const routeError = require("../middleware/routeError.middleware");
const c = require("../controllers/clubBrowse.controller");
const cac = require("../controllers/clubAdmin.controller");
const router = express.Router();

router.get("/clubs", auth, c.listClubs);
router.get("/clubs/:clubId", auth, c.getClub);
router.get("/clubs/:clubId/members", auth, c.listMembers);
router.get("/clubs/:clubId/recruitments", auth, c.listRecruitments);
router.post("/clubs/:clubId/rename-request", auth, cac.requestRename);

router.use(routeError);

module.exports = router;
