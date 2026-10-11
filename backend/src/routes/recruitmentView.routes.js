const express = require('express');
const auth = require('../middleware/auth.middleware');
const routeError = require('../middleware/routeError.middleware');
const c = require('../controllers/recruitmentView.controller');

const router = express.Router();

router.get('/recruitments/:recruitmentId', auth, c.getRecruitment);
router.post('/recruitments/:recruitmentId/applications', auth, c.applyToRecruitment);

router.use(routeError);

module.exports = router;
