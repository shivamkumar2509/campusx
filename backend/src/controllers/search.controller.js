
const Club = require("../models/club.model");
const Event = require("../models/event.model");
const Team = require("../models/team.model");

const getQuery = (req) =>
  typeof req.query.q === "string" ? req.query.q.trim() : "";

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getLimit = (req) => {
  const value = Number.parseInt(req.query.limit, 10);

  if (!Number.isInteger(value) || value < 1) return 100;

  return Math.min(value, 100);
};

const validateQuery = (q, res) => {
  if (q.length > 100) {
    res.status(400).json({
      success: false,
      message: "Search query must be 100 characters or fewer.",
    });
    return false;
  }

  return true;
};

const searchEventsData = async (q, limit) => {
  const filter = {
    status: "published",
    deadline: { $gt: new Date() },
  };

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");

    filter.$or = [
      { title: regex },
      { description: regex },
      { type: regex },
    ];
  }

  return Event.find(filter)
    .select("-__v -weights")
    .populate("club_id", "name display_name type")
    .sort({ deadline: 1 })
    .limit(limit)
    .lean();
};

const searchTeamsData = async (q, limit) => {
  const filter = {
    status: "confirmed",
  };

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");

    filter.$or = [
      { name: regex },
      { description: regex },
    ];
  }

  return Team.find(filter)
    .select("name description status event_id createdAt")
    .populate("event_id", "title type deadline")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

const searchClubsData = async (q, limit) => {
  const filter = {
    status: "active",
  };

  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");

    filter.$or = [
      { name: regex },
      { display_name: regex },
      { description: regex },
      { type: regex },
    ];
  }

  return Club.find(filter)
    .select("name display_name description type member_count")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// GET /api/search
exports.searchAll = async (req, res, next) => {
  try {
    const q = getQuery(req);

    if (!validateQuery(q, res)) return;

    const limit = getLimit(req);

    const [events, teams, clubs] = await Promise.all([
      searchEventsData(q, limit),
      searchTeamsData(q, limit),
      searchClubsData(q, limit),
    ]);

    return res.json({
      success: true,
      data: { events, teams, clubs },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/search/events
exports.searchEvents = async (req, res, next) => {
  try {
    const q = getQuery(req);

    if (!validateQuery(q, res)) return;

    const events = await searchEventsData(q, getLimit(req));

    return res.json({ success: true, data: events });
  } catch (error) {
    return next(error);
  }
};

// GET /api/search/teams
exports.searchTeams = async (req, res, next) => {
  try {
    const q = getQuery(req);

    if (!validateQuery(q, res)) return;

    const teams = await searchTeamsData(q, getLimit(req));

    return res.json({ success: true, data: teams });
  } catch (error) {
    return next(error);
  }
};

// GET /api/search/clubs
exports.searchClubs = async (req, res, next) => {
  try {
    const q = getQuery(req);

    if (!validateQuery(q, res)) return;

    const clubs = await searchClubsData(q, getLimit(req));

    return res.json({ success: true, data: clubs });
  } catch (error) {
    return next(error);
  }
};
