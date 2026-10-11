const Notification = require('../models/notification.model');
const HttpError = require('../utils/httpError');
const {
  isObjectId,
  getPagination,
  buildMeta,
  getSort,
} = require('../utils/queryHelpers');
const { getOrCreatePreference } = require('../services/notification.service');

const PREFERENCE_KEYS = [
  'email_enabled',
  'push_enabled',
  'chat_enabled',
  'match_enabled',
  'deadline_enabled',
  'club_enabled',
];

const asString = (v) => (typeof v === 'string' ? v.trim() : '');

const formatPreference = (pref) => {
  const out = { user_id: pref.user_id };
  PREFERENCE_KEYS.forEach((k) => {
    out[k] = pref[k];
  });
  out.updatedAt = pref.updatedAt;
  return out;
};

// GET /api/notifications?status=read|unread&type=...&page=&limit=
exports.listNotifications = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSort(req.query, ['createdAt'], 'createdAt', 'desc');
  const filter = { user_id: req.user.id };

  const status = asString(req.query.status);
  if (status) {
    if (status !== 'read' && status !== 'unread') {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        "status must be 'read' or 'unread'"
      );
    }
    filter.read = status === 'read';
  }

  const type = asString(req.query.type);
  if (type) filter.type = type;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .select('-__v -channels -is_broadcast')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user_id: req.user.id, read: false }),
  ]);

  return res.status(200).json({
    success: true,
    data: items,
    meta: { ...buildMeta(page, limit, total), unread_count: unreadCount },
  });
};

// PATCH /api/notifications/:notificationId/read
// Doosre user ki notification = 404 (existence reveal nahi karte). Idempotent.
exports.markNotificationRead = async (req, res) => {
  const { notificationId } = req.params;
  if (!isObjectId(notificationId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid notification id');
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user_id: req.user.id },
    { $set: { read: true } },
    { returnDocument: 'after' }
  )
    .select('-__v -channels -is_broadcast')
    .lean();

  if (!notification) {
    throw new HttpError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  }
  return res.status(200).json({ success: true, data: notification });
};

// GET /api/users/me/notification-preferences
exports.getPreferences = async (req, res) => {
  const pref = await getOrCreatePreference(req.user.id);
  return res.status(200).json({ success: true, data: formatPreference(pref) });
};

// PATCH /api/users/me/notification-preferences
// Body: sirf in 6 keys mein se kuch bhi, values true/false
exports.updatePreferences = async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Request body is required');
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      'At least one preference is required'
    );
  }

  const unknown = keys.filter((k) => !PREFERENCE_KEYS.includes(k));
  if (unknown.length) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      `Unknown preference: ${unknown.join(', ')}`
    );
  }

  const notBoolean = keys.filter((k) => typeof body[k] !== 'boolean');
  if (notBoolean.length) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      `Value must be true or false: ${notBoolean.join(', ')}`
    );
  }

  const pref = await getOrCreatePreference(req.user.id);
  keys.forEach((k) => {
    pref[k] = body[k];
  });
  await pref.save();

  return res.status(200).json({ success: true, data: formatPreference(pref) });
};
