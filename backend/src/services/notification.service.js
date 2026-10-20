const Notification = require("../models/notification.model");
const NotificationPreference = require("../models/notificationPreference.model");

// Respect user's preferences by mapping notification type -> pref key
const TYPE_TO_PREF = {
  chat: "chat_enabled",
  new_message: "chat_enabled",
  match_found: "match_enabled",
  replacement_found: "match_enabled",
  team_invite: "match_enabled",
  deadline_reminder: "deadline_enabled",
  feedback_request: "deadline_enabled",
  club_recruitment_open: "club_enabled",
  club_application_status: "club_enabled",
  club_member_approved: "club_enabled",
  club_member_removed: "club_enabled",
  club_rename_request: "club_enabled",
  club_rename_approved: "club_enabled",

  admin_broadcast: null, // always respect email_enabled? ya ignore? — abhi null rakho (no pref gate)
  account_approved: null,
  account_rejected: null,
  // Naye types for Phase 2:
  club_join_request: "club_enabled",
  club_verification_scheduled: "club_enabled",
  club_join_approved: "club_enabled",
  club_join_rejected: "club_enabled",
};

/**
 * Create a notification. Never throws — callers rely on this being safe.
 * @param {Object} opts
 * @param {String} opts.user     - recipient user id
 * @param {String} opts.type     - notification type (see model)
 * @param {String} opts.title
 * @param {String} opts.message
 * @param {String} [opts.link]
 * @param {String} [opts.priority] - 'high' | 'medium' | 'low'
 * @param {Array}  [opts.channels]
 * @param {Boolean}[opts.is_broadcast]
 */
async function createNotification(opts) {
  try {
    const {
      user,
      type,
      title,
      message,
      link = "",
      priority = "medium",
      channels = ["in-app"],
      is_broadcast = false,
    } = opts || {};

    if (!user || !type || !title || !message) return null;

    // Enforce user preference (if it exists)
    try {
      const prefKey = TYPE_TO_PREF[type];
      if (prefKey) {
        const pref = await NotificationPreference.findOne({
          user_id: user,
        }).lean();
        if (pref && pref[prefKey] === false) {
          return null; // user opted out
        }
      }
    } catch (e) {
      // Preference lookup failure should not block delivery
    }

    const doc = await Notification.create({
      user_id: user,
      type,
      title,
      message,
      link,
      priority,
      channels,
      is_broadcast,
    });

    // TODO: hook real email/push here when configured
    return doc;
  } catch (err) {
    console.error("createNotification failed:", err.message);
    return null;
  }
}

/**
 * Get or lazily-create the preference row for a user.
 */
async function getOrCreatePreference(userId) {
  let pref = await NotificationPreference.findOne({ user_id: userId });
  if (!pref) {
    try {
      pref = await NotificationPreference.create({ user_id: userId });
    } catch (err) {
      if (err.code === 11000) {
        pref = await NotificationPreference.findOne({ user_id: userId });
      } else {
        throw err;
      }
    }
  }
  return pref;
}

module.exports = { createNotification, getOrCreatePreference };
