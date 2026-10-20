const Feedback = require("../models/feedback.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const Event = require("../models/event.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");

// POST /api/teams/:teamId/feedback
exports.submitFeedback = async (req, res) => {
  const { teamId } = req.params;
  const { rating, comments = "" } = req.body || {};

  if (!isObjectId(teamId))
    throw new HttpError(400, "INVALID_ID", "Invalid team id");
  if (!rating || rating < 1 || rating > 5) {
    throw new HttpError(400, "VALIDATION_ERROR", "rating must be 1-5");
  }

  const team = await Team.findById(teamId).lean();
  if (!team) throw new HttpError(404, "TEAM_NOT_FOUND", "Team not found");

  const member = await TeamMember.exists({
    team_id: teamId,
    user_id: req.user.id,
    status: "accepted",
  });
  if (!member)
    throw new HttpError(
      403,
      "FORBIDDEN",
      "Only team members can give feedback",
    );

  const event = await Event.findById(team.event_id).lean();
  if (!event || event.status !== "closed") {
    throw new HttpError(
      422,
      "EVENT_NOT_CLOSED",
      "Feedback opens after the event closes",
    );
  }

  const existing = await Feedback.findOne({
    event_id: team.event_id,
    user_id: req.user.id,
  });
  if (existing)
    throw new HttpError(
      409,
      "ALREADY_SUBMITTED",
      "You already submitted feedback",
    );

  const feedback = await Feedback.create({
    team_id: teamId,
    event_id: team.event_id,
    user_id: req.user.id,
    rating,
    comments,
  });

  return res.status(201).json({ success: true, data: feedback });
};

// GET /api/events/:eventId/feedback
exports.getEventFeedback = async (req, res) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const feedbacks = await Feedback.find({ event_id: eventId })
    .populate("user_id", "name avatar_url")
    .populate("team_id", "name")
    .sort({ createdAt: -1 })
    .lean();

  const avg =
    feedbacks.length > 0
      ? feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length
      : 0;

  return res.status(200).json({
    success: true,
    data: feedbacks,
    meta: {
      total: feedbacks.length,
      average_rating: Math.round(avg * 100) / 100,
    },
  });
};
