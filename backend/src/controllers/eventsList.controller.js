const Event = require("../models/event.model");
const Enrollment = require("../models/enrollment.model");
const User = require("../models/user.model");
const TeamMember = require("../models/teamMember.model");
const Club = require("../models/club.model");
const HttpError = require("../utils/httpError");
const {
  isObjectId,
  getPagination,
  buildMeta,
  getSort,
} = require("../utils/queryHelpers");

const asString = (v) => (typeof v === "string" ? v.trim() : "");

// ===== Helpers =====

const findEventOr404 = async (eventId) => {
  if (!isObjectId(eventId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid event id");
  }
  const event = await Event.findById(eventId).lean();
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");
  return event;
};

const getEnrolledCounts = async (eventIds) => {
  if (!eventIds.length) return {};
  const rows = await Enrollment.aggregate([
    {
      $match: {
        event_id: { $in: eventIds },
        status: { $in: ["pending", "matched"] },
      },
    },
    { $group: { _id: "$event_id", count: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach((r) => {
    map[String(r._id)] = r.count;
  });
  return map;
};

const getUserEnrollmentsMap = async (eventIds, userId) => {
  if (!eventIds.length || !userId) return {};
  const rows = await Enrollment.find({
    event_id: { $in: eventIds },
    user_id: userId,
    status: { $in: ["pending", "matched"] },
  })
    .select("event_id status")
    .lean();
  const map = {};
  rows.forEach((r) => {
    map[String(r.event_id)] = r.status;
  });
  return map;
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

  const status = asString(req.query.status);
  if (status) {
    if (!["draft", "published", "closed"].includes(status)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "status must be one of: draft, published, closed",
      );
    }
    filter.status = status;
  } else {
    filter.status = "published";
  }

  const type = asString(req.query.type);
  if (type) {
    if (!["hackathon", "club", "workshop"].includes(type)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "type must be one of: hackathon, club, workshop",
      );
    }
    filter.type = type;
  }

  if (req.query.past !== "true" && status !== "closed") {
    filter.deadline = { $gt: new Date() };
  }

  const q = asString(req.query.q);
  if (q) {
    filter.title = { $regex: q, $options: "i" };
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .select("-__v -weights")
      .populate("club_id", "name display_name type")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(filter),
  ]);

  const eventIds = events.map((e) => e._id);
  const [counts, myEnrollments] = await Promise.all([
    getEnrolledCounts(eventIds),
    getUserEnrollmentsMap(eventIds, req.user.id),
  ]);

  const now = new Date();
  const data = events.map((e) => ({
    ...e,
    enrolled_count: counts[String(e._id)] || 0,
    is_enrolled: Boolean(myEnrollments[String(e._id)]),
    enrollment_status: myEnrollments[String(e._id)] || null,
    is_past: new Date(e.deadline) < now,
  }));

  return res
    .status(200)
    .json({ success: true, data, meta: buildMeta(page, limit, total) });
};

// ===== GET /api/events/:eventId =====
exports.getEvent = async (req, res) => {
  const event = await findEventOr404(req.params.eventId);

  const [club, creator, enrolledCount, myEnrollment] = await Promise.all([
    event.club_id
      ? Club.findById(event.club_id).select("name display_name type").lean()
      : null,
    event.created_by
      ? User.findById(event.created_by).select("name").lean()
      : null,
    Enrollment.countDocuments({
      event_id: event._id,
      status: { $in: ["pending", "matched"] },
    }),
    Enrollment.findOne({
      event_id: event._id,
      user_id: req.user.id,
      status: { $in: ["pending", "matched"] },
    })
      .select("status raised_at")
      .lean(),
  ]);

  const myTeamMember = await TeamMember.findOne({
    user_id: req.user.id,
    status: "accepted",
  })
    .populate({
      path: "team_id",
      match: { event_id: event._id },
      select: "name status leader_id",
    })
    .lean();

  const myTeam =
    myTeamMember && myTeamMember.team_id ? myTeamMember.team_id : null;

  return res.status(200).json({
    success: true,
    data: {
      ...event,
      club: club
        ? {
            _id: club._id,
            name: club.name,
            display_name: club.display_name,
            type: club.type,
          }
        : null,
      created_by: creator ? { _id: creator._id, name: creator.name } : null,
      enrolled_count: enrolledCount,
      is_enrolled: Boolean(myEnrollment),
      enrollment_status: myEnrollment?.status || null,
      enrolled_at: myEnrollment?.raised_at || null,
      is_past: new Date(event.deadline) < new Date(),
      my_team: myTeam,
    },
  });
};

// ===== POST /api/events/:eventId/enroll =====
exports.enrollInEvent = async (req, res) => {
  const event = await findEventOr404(req.params.eventId);

  if (event.status !== "published") {
    throw new HttpError(
      422,
      "EVENT_NOT_PUBLISHED",
      "This event is not open for enrollment",
    );
  }

  if (new Date(event.deadline) < new Date()) {
    throw new HttpError(
      422,
      "DEADLINE_PASSED",
      "The deadline for this event has passed",
    );
  }

  const existing = await Enrollment.findOne({
    event_id: event._id,
    user_id: req.user.id,
  });

  if (existing) {
    if (existing.status === "pending" || existing.status === "matched") {
      throw new HttpError(
        409,
        "ALREADY_ENROLLED",
        "You have already raised your hand for this event",
      );
    }
    existing.status = "pending";
    existing.source = "self";
    existing.raised_at = new Date();
    await existing.save();
    return res.status(200).json({
      success: true,
      message: "Hand raised again",
      data: { enrollment: existing },
    });
  }

  const enrollment = await Enrollment.create({
    event_id: event._id,
    user_id: req.user.id,
    status: "pending",
    source: "self",
    raised_at: new Date(),
  });

  res.locals.auditUser = req.user.id;
  res.locals.auditEntityId = event._id;

  return res.status(201).json({
    success: true,
    message: "Hand raised",
    data: { enrollment },
  });
};

// ===== DELETE /api/events/:eventId/enroll =====
exports.cancelEnrollment = async (req, res) => {
  const event = await findEventOr404(req.params.eventId);

  const enrollment = await Enrollment.findOne({
    event_id: event._id,
    user_id: req.user.id,
    status: { $in: ["pending", "matched"] },
  });

  if (!enrollment) {
    throw new HttpError(
      404,
      "NOT_ENROLLED",
      "You have not raised your hand for this event",
    );
  }

  if (enrollment.status === "matched") {
    throw new HttpError(
      422,
      "ALREADY_MATCHED",
      "You are already matched into a team. Leave the team first.",
    );
  }

  enrollment.status = "cancelled";
  await enrollment.save();

  res.locals.auditUser = req.user.id;
  res.locals.auditEntityId = event._id;

  return res.status(200).json({
    success: true,
    message: "Enrollment cancelled",
  });
};

// ===== GET /api/events/:eventId/enrollments =====
exports.listEnrollments = async (req, res) => {
  const event = await findEventOr404(req.params.eventId);
  const { page, limit, skip } = getPagination(req.query);

  const match = {
    event_id: event._id,
    status: { $in: ["pending", "matched"] },
  };

  const [items, total] = await Promise.all([
    Enrollment.find(match)
      .populate("user_id", "name email avatar_url year experience_level")
      .sort({ raised_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Enrollment.countDocuments(match),
  ]);

  const data = items
    .filter((e) => e.user_id)
    .map((e) => ({
      _id: e._id,
      user_id: e.user_id._id,
      name: e.user_id.name,
      avatar_url: e.user_id.avatar_url || null,
      year: e.user_id.year,
      experience_level: e.user_id.experience_level,
      status: e.status,
      source: e.source,
      raised_at: e.raised_at,
    }));

  return res
    .status(200)
    .json({ success: true, data, meta: buildMeta(page, limit, total) });
};

// ===== GET /api/users/me/enrollments =====
exports.listMyEnrollments = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const filter = {
    user_id: req.user.id,
    status: { $in: ["pending", "matched"] },
  };

  const [enrollments, total] = await Promise.all([
    Enrollment.find(filter)
      .populate({
        path: "event_id",
        select:
          "title type description deadline team_size_min team_size_max status",
      })
      .sort({ raised_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Enrollment.countDocuments(filter),
  ]);

  const data = enrollments
    .filter((e) => e.event_id)
    .map((e) => ({
      _id: e._id,
      status: e.status,
      source: e.source,
      raised_at: e.raised_at,
      event: {
        _id: e.event_id._id,
        title: e.event_id.title,
        type: e.event_id.type,
        description: e.event_id.description,
        deadline: e.event_id.deadline,
        team_size_min: e.event_id.team_size_min,
        team_size_max: e.event_id.team_size_max,
        status: e.event_id.status,
      },
    }));

  return res
    .status(200)
    .json({ success: true, data, meta: buildMeta(page, limit, total) });
};
