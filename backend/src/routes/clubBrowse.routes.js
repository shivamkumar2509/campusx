const express = require('express');
const auth = require('../middleware/auth.middleware');
const routeError = require('../middleware/routeError.middleware');
const c = require('../controllers/clubBrowse.controller');

const router = express.Router();

router.get('/clubs', auth, c.listClubs);
router.get('/clubs/:clubId', auth, c.getClub);
router.get('/clubs/:clubId/members', auth, c.listMembers);
router.get('/clubs/:clubId/recruitments', auth, c.listRecruitments);

router.use(routeError);

module.exports = router;
