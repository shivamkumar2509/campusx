const Event = require("../models/event.model");
const { getPagination, buildMeta, getSort } = require("../utils/queryHelpers");

const asString = (v) => (typeof v === "string" ? v.trim() : "");

// GET /api/events?status=published&type=&page=&limit=
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
      return res.status(400).json({
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "status must be one of: draft, published, closed",
      });
    }
    filter.status = status;
  } else {
    // default: only published events for public listing
    filter.status = "published";
  }

  const type = asString(req.query.type);
  if (type) {
    if (!["hackathon", "club", "workshop"].includes(type)) {
      return res.status(400).json({
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "type must be one of: hackathon, club, workshop",
      });
    }
    filter.type = type;
  }

  // By default: only future-deadline events (unless ?past=true)
  if (req.query.past !== "true") {
    filter.deadline = { $gt: new Date() };
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

  return res.status(200).json({
    success: true,
    data: events,
    meta: buildMeta(page, limit, total),
  });
};

// GET /api/events/:eventId
exports.getEvent = async (req, res) => {
  const { eventId } = req.params;
  if (!/^[0-9a-fA-F]{24}$/.test(eventId)) {
    return res.status(400).json({
      success: false,
      error_code: "INVALID_ID",
      message: "Invalid event id",
    });
  }

  const event = await Event.findById(eventId)
    .select("-__v")
    .populate("club_id", "name display_name type")
    .populate("created_by", "name")
    .lean();

  if (!event) {
    return res.status(404).json({
      success: false,
      error_code: "EVENT_NOT_FOUND",
      message: "Event not found",
    });
  }

  return res.status(200).json({ success: true, data: event });
};
