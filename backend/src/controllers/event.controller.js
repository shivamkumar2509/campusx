const Event = require("../models/event.model");
const Enrollment = require("../models/enrollment.model");
const Team = require("../models/team.model");
const HttpError = require("../utils/httpError");
const User = require("../models/user.model");
const {
  isObjectId,
  getPagination,
  buildMeta,
  getSort,
} = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

const isAdmin = (req) => req.user && req.user.role === "admin";

// ===== HELPER: validate team rules =====
const validateTeamRules = (body) => {
  const { team_size_min, team_size_max, max_teams } = body || {};

  if (team_size_min !== undefined && team_size_min !== null) {
    const n = Number(team_size_min);
    if (!Number.isInteger(n) || n < 1) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "team_size_min must be an integer >= 1",
      );
    }
  }
  if (team_size_max !== undefined && team_size_max !== null) {
    const n = Number(team_size_max);
    if (!Number.isInteger(n) || n < 1) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "team_size_max must be an integer >= 1",
      );
    }
  }
  if (team_size_min != null && team_size_max != null) {
    if (Number(team_size_max) < Number(team_size_min)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "team_size_max must be >= team_size_min",
      );
    }
  }
  if (max_teams !== undefined && max_teams !== null) {
    const n = Number(max_teams);
    if (!Number.isInteger(n) || n < 1) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "max_teams must be an integer >= 1 or null",
      );
    }
  }
};

// ===== GET /api/events =====
exports.listEvents = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSort(
    req.query,
    ["deadline", "createdAt", "title"],
    "deadline",
    "asc",
  );
  const filter = {};

  if (isAdmin(req)) {
    if (req.query.status) filter.status = req.query.status;
  } else {
    filter.status = "published";
  }
  if (req.query.type) filter.type = req.query.type;

  const [items, total] = await Promise.all([
    Event.find(filter)
      .populate("created_by", "name")
      .populate("club_id", "name display_name type")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  const eventIds = items.map((e) => e._id);
  const counts = await Enrollment.aggregate([
    { $match: { event_id: { $in: eventIds }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$event_id", count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => {
    countMap[String(c._id)] = c.count;
  });

  // Attach teams_formed count (for admin UI)
  const teamCounts = await Team.aggregate([
    { $match: { event_id: { $in: eventIds } } },
    { $group: { _id: "$event_id", count: { $sum: 1 } } },
  ]);
  const teamCountMap = {};
  teamCounts.forEach((c) => {
    teamCountMap[String(c._id)] = c.count;
  });

  const data = items.map((e) => ({
    ...e,
    enrolled_count: countMap[String(e._id)] || 0,
    teams_formed: teamCountMap[String(e._id)] || 0,
  }));

  return res.status(200).json({
    success: true,
    data,
    meta: buildMeta(page, limit, total),
  });
};

// ===== GET /api/events/:eventId =====
exports.getEvent = async (req, res) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const event = await Event.findById(eventId)
    .populate("created_by", "name avatar_url")
    .populate("club_id", "name display_name type")
    .lean();

  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");
  if (
    event.status === "draft" &&
    !isAdmin(req) &&
    String(event.created_by._id) !== String(req.user.id)
  ) {
    throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");
  }

  const [enrolledCount, userEnrollment, teamCount] = await Promise.all([
    Enrollment.countDocuments({
      event_id: eventId,
      status: { $ne: "cancelled" },
    }),
    Enrollment.findOne({ event_id: eventId, user_id: req.user.id }).lean(),
    Team.countDocuments({ event_id: eventId }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      ...event,
      enrolled_count: enrolledCount,
      team_count: teamCount,
      user_enrollment: userEnrollment
        ? { _id: userEnrollment._id, status: userEnrollment.status }
        : null,
    },
  });
};

// ===== POST /api/events  (admin) =====
exports.createEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");

  const {
    title,
    description,
    type,
    team_size_min,
    team_size_max,
    max_teams,
    deadline,
    club_id,
    weights,
  } = req.body || {};

  if (!title || !type || !deadline) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "title, type, deadline are required",
    );
  }

  validateTeamRules({ team_size_min, team_size_max, max_teams });

  const event = await Event.create({
    created_by: req.user.id,
    club_id: club_id || null,
    title,
    description: description || "",
    type,
    team_size_min: team_size_min != null ? Number(team_size_min) : 2,
    team_size_max: team_size_max != null ? Number(team_size_max) : 6,
    max_teams: max_teams != null ? Number(max_teams) : null,
    weights: weights || undefined,
    deadline,
    status: "draft",
  });

  return res.status(201).json({ success: true, data: event });
};

// ===== PATCH /api/events/:eventId  (admin) =====
exports.updateEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  const allowed = [
    "title",
    "description",
    "type",
    "team_size_min",
    "team_size_max",
    "max_teams",
    "deadline",
    "club_id",
    "weights",
  ];
  const updates = {};
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });

  // Validate rules (merge existing + updates)
  validateTeamRules({
    team_size_min:
      updates.team_size_min !== undefined
        ? updates.team_size_min
        : event.team_size_min,
    team_size_max:
      updates.team_size_max !== undefined
        ? updates.team_size_max
        : event.team_size_max,
    max_teams:
      updates.max_teams !== undefined ? updates.max_teams : event.max_teams,
  });

  // If event is closed/published and team rules change → warn via 422
  const rulesChanged =
    (updates.team_size_min !== undefined &&
      updates.team_size_min !== event.team_size_min) ||
    (updates.team_size_max !== undefined &&
      updates.team_size_max !== event.team_size_max) ||
    (updates.max_teams !== undefined && updates.max_teams !== event.max_teams);

  if (rulesChanged && event.status === "closed") {
    throw new HttpError(
      422,
      "EVENT_CLOSED",
      "Cannot change team rules after event is closed",
    );
  }

  const updated = await Event.findByIdAndUpdate(eventId, updates, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json({ success: true, data: updated });
};

// ===== DELETE /api/events/:eventId  (admin) =====
exports.deleteEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const event = await Event.findByIdAndDelete(eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  return res.status(200).json({ success: true, message: "Event deleted" });
};

// ===== POST /api/events/:eventId/publish =====
// ===== POST /api/events/:eventId/publish =====
exports.publishEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  // Agar pehle se published hai toh dobara notification na bheje
  if (event.status === "published") {
    return res.status(200).json({ success: true, data: event });
  }

  event.status = "published";
  await event.save();

  // ✅ NAYA CODE: Sabhi active students ko notification bhejo
  try {
    // Sirf active students ko nikalo (suspended/pending ko nahi)
    const students = await User.find({ role: "student", status: "active" })
      .select("_id")
      .lean();

    // Background mein notifications bhejo taaki API response slow na ho
    setImmediate(async () => {
      for (const student of students) {
        await createNotification({
          user: student._id,
          type: "enrollment_confirmed", // ya naya type 'event_published' bhi bana sakte hain
          title: "New Event Published! 🚀",
          message: `"${event.title}" is now open for registration. Raise your hand to join!`,
          link: `/events/${event._id}`,
          priority: "high",
        });
      }
    });
  } catch (err) {
    console.error(
      "Failed to broadcast event publish notifications:",
      err.message,
    );
    // Error aaye toh bhi event publish toh ho hi chuka hai, isliye response fail mat karo
  }

  return res.status(200).json({ success: true, data: event });
};

// ===== POST /api/events/:eventId/close =====
exports.closeEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const event = await Event.findByIdAndUpdate(
    eventId,
    { $set: { status: "closed" } },
    { new: true },
  );
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  setImmediate(async () => {
    try {
      const matching = require("./matching.controller");
      await matching.runMatchingInternal(event._id);
      console.log(`[auto-match] done for event ${event._id}`);
    } catch (err) {
      console.error("[auto-match] failed:", err.message);
    }
  });

  return res.status(200).json({
    success: true,
    data: event,
    message: "Event closed. AI matching will start shortly.",
  });
};
