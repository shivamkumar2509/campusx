const Enrollment = require("../models/enrollment.model");
const Event = require("../models/event.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

// POST /api/events/:eventId/enroll
exports.enrollInEvent = async (req, res) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");
  if (event.status !== "published") {
    throw new HttpError(
      422,
      "EVENT_NOT_OPEN",
      "This event is not open for enrollment",
    );
  }
  if (new Date() > event.deadline) {
    throw new HttpError(
      422,
      "DEADLINE_PASSED",
      "Registration deadline has passed",
    );
  }

  const existing = await Enrollment.findOne({
    user_id: req.user.id,
    event_id: eventId,
  });
  if (existing) {
    if (existing.status === "cancelled") {
      existing.status = "pending";
      existing.raised_at = new Date();
      existing.source = "self";
      await existing.save();
      return res.status(200).json({ success: true, data: existing });
    }
    throw new HttpError(409, "ALREADY_ENROLLED", "You are already enrolled");
  }

  const enrollment = await Enrollment.create({
    user_id: req.user.id,
    event_id: eventId,
    status: "pending",
    source: "self",
  });

  await createNotification({
    user: req.user.id,
    type: "enrollment_confirmed",
    title: "Enrolled!",
    message: `You enrolled in "${event.title}". Deadline: ${new Date(event.deadline).toDateString()}`,
    link: `/events/${eventId}`,
    priority: "medium",
  });

  return res.status(201).json({ success: true, data: enrollment });
};

// GET /api/events/:eventId/enrollments
exports.listEventEnrollments = async (req, res) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const enrollments = await Enrollment.find({
    event_id: eventId,
    status: { $ne: "cancelled" },
  })
    .populate("user_id", "name avatar_url year experience_level")
    .lean();

  return res.status(200).json({ success: true, data: enrollments });
};

// GET /api/users/me/enrollments
exports.listMyEnrollments = async (req, res) => {
  const enrollments = await Enrollment.find({
    user_id: req.user.id,
    status: { $ne: "cancelled" },
  })
    .populate(
      "event_id",
      "title type deadline status team_size_min team_size_max",
    )
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ success: true, data: enrollments });
};
