
const Club = require('../models/club.model');

const getQuery = (req) =>
  typeof req.query.q === 'string' ? req.query.q.trim() : '';

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getLimit = (req) => {
  const value = Number.parseInt(req.query.limit, 10);

  if (!Number.isInteger(value)) return 10;

  return Math.min(Math.max(value, 1), 50);
};

const searchClubsData = async (q, limit) => {
  return Club.find({
    status: 'active',
    $or: [
      { name: { $regex: q, $options: 'i' } },
      { display_name: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
      { type: { $regex: q, $options: 'i' } },
    ],
  })
    .select('name display_name description type member_count')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

exports.searchAll = async (req, res, next) => {
  try {
    const q = getQuery(req);

    if (!q) {
      return res.json({
        success: true,
        data: { events: [], teams: [], clubs: [] },
      });
    }

    if (q.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be 100 characters or fewer.',
      });
    }

    const clubs = await searchClubsData(
      escapeRegex(q),
      getLimit(req)
    );

    return res.json({
      success: true,
      data: {
        events: [],
        teams: [],
        clubs,
      },
    });
  } catch (error) {
    return next(error);
  }
};

exports.searchEvents = async (req, res, next) => {
  return res.json({ success: true, data: [] });
};

exports.searchTeams = async (req, res, next) => {
  return res.json({ success: true, data: [] });
};

exports.searchClubs = async (req, res, next) => {
  try {
    const q = getQuery(req);

    if (!q) {
      return res.json({ success: true, data: [] });
    }

    if (q.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be 100 characters or fewer.',
      });
    }

    const clubs = await searchClubsData(
      escapeRegex(q),
      getLimit(req)
    );

    return res.json({ success: true, data: clubs });
  } catch (error) {
    return next(error);
  }
};
