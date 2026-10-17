const Club = require("../models/club.model");
const User = require("../models/user.model");
const ClubMember = require("../models/clubMember.model");

// Lazy-require models that may not exist yet, so server doesn't crash
const safeRequire = (p) => {
  try {
    return require(p);
  } catch {
    return null;
  }
};
const Event = safeRequire("../models/event.model");
const Team = safeRequire("../models/team.model");

// GET /api/landing/stats
exports.getStats = async (req, res) => {
  const [users, teams, clubCount] = await Promise.all([
    User.countDocuments({ role: "student" }),
    Team ? Team.countDocuments() : Promise.resolve(0),
    Club.countDocuments({ status: "active" }),
  ]);

  return res.status(200).json({
    success: true,
    data: { users, teams, clubs: clubCount },
  });
};

// GET /api/landing/featured-events
exports.getFeaturedEvents = async (req, res) => {
  if (!Event) {
    return res.status(200).json({ success: true, data: [] });
  }
  const events = await Event.find({
    status: "published",
    deadline: { $gt: new Date() },
  })
    .select("title type deadline team_size_min team_size_max")
    .sort({ deadline: 1 })
    .limit(3)
    .lean();

  return res.status(200).json({ success: true, data: events });
};

// GET /api/landing/featured-clubs
exports.getFeaturedClubs = async (req, res) => {
  const clubs = await Club.find({ status: "active" })
    .select("name display_name type description member_count")
    .sort({ member_count: -1 })
    .limit(5)
    .lean();

  const ids = clubs.map((c) => c._id);
  const rows = ids.length
    ? await ClubMember.aggregate([
        { $match: { club_id: { $in: ids }, status: "active" } },
        { $group: { _id: "$club_id", count: { $sum: 1 } } },
      ])
    : [];
  const map = {};
  rows.forEach((r) => {
    map[String(r._id)] = r.count;
  });

  const data = clubs.map((c) => ({
    ...c,
    member_count: map[String(c._id)] || 0,
  }));

  return res.status(200).json({ success: true, data });
};
