const express = require('express');
const auth = require('../middleware/auth.middleware');
const routeError = require('../middleware/routeError.middleware');
const searchController = require('../controllers/search.controller');

const router = express.Router();

// Mount this router at /api in server.js.
router.get('/search', auth, searchController.searchAll);
router.get('/search/events', auth, searchController.searchEvents);
router.get('/search/teams', auth, searchController.searchTeams);
router.get('/search/clubs', auth, searchController.searchClubs);

router.use(routeError);

module.exports = router;
