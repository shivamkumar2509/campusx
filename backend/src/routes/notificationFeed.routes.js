const express = require('express');
const auth = require('../middleware/auth.middleware');
const routeError = require('../middleware/routeError.middleware');
const c = require('../controllers/notificationFeed.controller');

const router = express.Router();

router.get('/notifications', auth, c.listNotifications);
router.patch('/notifications/:notificationId/read', auth, c.markNotificationRead);
router.get('/users/me/notification-preferences', auth, c.getPreferences);
router.patch('/users/me/notification-preferences', auth, c.updatePreferences);

router.use(routeError);

module.exports = router;
