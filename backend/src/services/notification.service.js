// Notification models Shivam ke hain. Lazy require: models main mein na hon
// to bhi server crash nahi karta (error sirf notification step mein pakda jata hai).
const loadModels = () => ({
  Notification: require('../models/notification.model'),
  NotificationPreference: require('../models/notificationPreference.model'),
});

// Kaunsa notification type kis preference toggle ke under aata hai
const TYPE_TO_CATEGORY = {
  application_received: 'club',
  club_application_status: 'club',
  club_recruitment_open: 'club',
  club_member_approved: 'club',
  club_member_removed: 'club',
  club_rename_request: 'club',
  club_rename_approved: 'club',
};

// Preferences row nahi hai to defaults (sab true) ke saath bana deta hai
const getOrCreatePreference = async (userId) => {
  const { NotificationPreference } = loadModels();
  const existing = await NotificationPreference.findOne({ user_id: userId });
  if (existing) return existing;
  try {
    return await NotificationPreference.create({ user_id: userId });
  } catch (err) {
    if (err && err.code === 11000) {
      return NotificationPreference.findOne({ user_id: userId });
    }
    throw err;
  }
};

/**
 * Doosre modules bhi ye function call kar sakte hain.
 * createNotification({ user, type, title, message, link, priority })
 * - agar user ne us category ka toggle OFF kiya hai to null return hota hai
 */
const createNotification = async ({
  user,
  type,
  title,
  message,
  link = '',
  priority = 'medium',
}) => {
  const { Notification, NotificationPreference } = loadModels();
  const category = TYPE_TO_CATEGORY[type];
  if (category) {
    const pref = await NotificationPreference.findOne({ user_id: user }).lean();
    if (pref && pref[`${category}_enabled`] === false) return null;
  }
  return Notification.create({
    user_id: user,
    type,
    title,
    message,
    link,
    priority,
  });
};

module.exports = { createNotification, getOrCreatePreference };