const Event = require("../models/event.model");
const Club = require("../models/club.model");
const User = require("../models/user.model");
const Team = require("../models/team.model");
const ClubMember = require("../models/clubMember.model");

// GET /api/landing/featured-events
exports.featuredEvents = async (req, res) => {
  const events = await Event.find({ status: "published" })
    .select("title type deadline team_size_min team_size_max")
    .sort({ deadline: 1 })
    .limit(3)
    .lean();

  return res.status(200).json({
    success: true,
    data: events.map((e) => ({
      _id: e._id,
      title: e.title,
      type: e.type,
      deadline: e.deadline,
      team_size_min: e.team_size_min,
      team_size_max: e.team_size_max,
    })),
  });
};

// GET /api/landing/featured-clubs
exports.featuredClubs = async (req, res) => {
  const clubs = await Club.find({ status: "active" })
    .select("name display_name type")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Live member counts
  const ids = clubs.map((c) => c._id);
  const counts = await ClubMember.aggregate([
    { $match: { club_id: { $in: ids }, status: "active" } },
    { $group: { _id: "$club_id", count: { $sum: 1 } } },
  ]);
  const map = {};
  counts.forEach((c) => {
    map[String(c._id)] = c.count;
  });

  return res.status(200).json({
    success: true,
    data: clubs.map((c) => ({
      ...c,
      member_count: map[String(c._id)] || 0,
    })),
  });
};

// GET /api/landing/stats
exports.stats = async (req, res) => {
  const [users, teams, clubs] = await Promise.all([
    User.countDocuments({}),
    Team.countDocuments({ status: { $in: ["confirmed", "completed"] } }),
    Club.countDocuments({ status: "active" }),
  ]);

  return res.status(200).json({
    success: true,
    data: { users, teams, clubs },
  });
};
