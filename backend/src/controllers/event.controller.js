const Event = require("../models/event.model");
const Enrollment = require("../models/enrollment.model");
const Team = require("../models/team.model");
const HttpError = require("../utils/httpError");
const {
  isObjectId,
  getPagination,
  buildMeta,
  getSort,
} = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

const isAdmin = (req) => req.user && req.user.role === "admin";

// GET /api/events?type=&status=&page=&limit=
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

  // Attach enrollment counts in one query
  const eventIds = items.map((e) => e._id);
  const counts = await Enrollment.aggregate([
    { $match: { event_id: { $in: eventIds }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$event_id", count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => {
    countMap[String(c._id)] = c.count;
  });

  const data = items.map((e) => ({
    ...e,
    enrolled_count: countMap[String(e._id)] || 0,
  }));

  return res.status(200).json({
    success: true,
    data,
    meta: buildMeta(page, limit, total),
  });
};

// GET /api/events/:eventId
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
    String(event.created_by?._id) !== String(req.user.id)
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

// POST /api/events  (admin)
exports.createEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");

  const {
    title,
    description,
    type,
    team_size_min,
    team_size_max,
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

  const event = await Event.create({
    created_by: req.user.id,
    club_id: club_id || null,
    title,
    description: description || "",
    type,
    team_size_min: team_size_min || 2,
    team_size_max: team_size_max || 6,
    weights: weights || undefined,
    deadline,
    status: "draft",
  });

  return res.status(201).json({ success: true, data: event });
};

// PATCH /api/events/:eventId  (admin)
exports.updateEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const allowed = [
    "title",
    "description",
    "type",
    "team_size_min",
    "team_size_max",
    "deadline",
    "club_id",
    "weights",
  ];
  const updates = {};
  allowed.forEach((k) => {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  });

  const event = await Event.findByIdAndUpdate(eventId, updates, {
    new: true,
    runValidators: true,
  });
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  return res.status(200).json({ success: true, data: event });
};

// DELETE /api/events/:eventId  (admin)
exports.deleteEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const event = await Event.findByIdAndDelete(eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  return res.status(200).json({ success: true, message: "Event deleted" });
};

// POST /api/events/:eventId/publish  (draft -> published only)
exports.publishEvent = async (req, res) => {
  if (!isAdmin(req)) throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const event = await Event.findOneAndUpdate(
    { _id: eventId, status: "draft" },
    { $set: { status: "published" } },
    { new: true },
  );
  if (!event) {
    const exists = await Event.exists({ _id: eventId });
    if (!exists)
      throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");
    throw new HttpError(
      422,
      "INVALID_STATUS",
      "Only draft events can be published",
    );
  }

  return res.status(200).json({ success: true, data: event });
};

// POST /api/events/:eventId/close
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

  // Fire-and-forget: don't block response. Matching can take a few seconds.
  setImmediate(async () => {
    try {
           const { runMatchingInternal } = require("./matching.controller");
      await runMatchingInternal(event._id);
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