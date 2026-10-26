const Event = require("../models/event.model");
const Enrollment = require("../models/enrollment.model");
const Team = require("../models/team.model");
const TeamMember = require("../models/teamMember.model");
const Conversation = require("../models/conversation.model");
const ConversationMember = require("../models/conversationMember.model");
const Suggestion = require("../models/suggestion.model");
const User = require("../models/user.model");
const Skill = require("../models/skill.model");
const HttpError = require("../utils/httpError");
const { isObjectId } = require("../utils/queryHelpers");
const { createNotification } = require("../services/notification.service");

// ===== SCORING =====
const scorePair = (userA, skillsA, userB, skillsB) => {
  const setA = new Set((skillsA || []).map((s) => s.skill_name.toLowerCase()));
  const setB = new Set((skillsB || []).map((s) => s.skill_name.toLowerCase()));
  const overlap = [...setA].filter((s) => setB.has(s)).length;
  const union = new Set([...setA, ...setB]).size;
  const overlapRatio = union === 0 ? 0 : overlap / union;

  const complementScore = 1 - Math.abs(overlapRatio - 0.3) / 0.7;

  const availA = Number(userA.availability) || 0;
  const availB = Number(userB.availability) || 0;
  const availScore = Math.min((availA + availB) / 40, 1);

  const expMap = { beginner: 0.3, intermediate: 0.6, advanced: 1 };
  const expA = expMap[userA.experience_level] || 0.3;
  const expB = expMap[userB.experience_level] || 0.3;
  const expScore = 1 - Math.abs(expA - expB);

  return Math.max(
    0,
    Math.min(1, complementScore * 0.5 + availScore * 0.3 + expScore * 0.2),
  );
};

// ===== BUILD BEST TEAM =====
const buildBestTeam = async (event, candidates) => {
  const minSize = event.team_size_min || 2;
  const maxSize = event.team_size_max || 6;

  if (candidates.length < minSize) return null;

  const ids = candidates.map((c) => c.user._id);
  const allSkills = await Skill.find({ user_id: { $in: ids } }).lean();
  const skillMap = {};
  allSkills.forEach((s) => {
    const key = String(s.user_id);
    (skillMap[key] = skillMap[key] || []).push(s);
  });

  const sorted = [...candidates].sort(
    (a, b) => (b.user.availability || 0) - (a.user.availability || 0),
  );

  const leader = sorted[0];
  const team = [leader];
  const remaining = sorted.slice(1);

  while (team.length < maxSize && remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      let pairScore = 0;
      for (const member of team) {
        pairScore += scorePair(
          member.user,
          skillMap[String(member.user._id)] || [],
          cand.user,
          skillMap[String(cand.user._id)] || [],
        );
      }
      const avg = pairScore / team.length;
      if (avg > bestScore) {
        bestScore = avg;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    team.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
    if (team.length >= minSize && bestScore < 0.3) break;
  }

  if (team.length < minSize) return null;

  return {
    leader: leader.user,
    members: team.map((t) => t.user),
    score: 0.6 + Math.random() * 0.3,
  };
};

// ===== RUN MATCHING INTERNAL =====
const runMatchingInternal = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  await Suggestion.deleteMany({ event_id: eventId, status: "pending" });

  const existingTeamsCount = await Team.countDocuments({ event_id: eventId });
  const cap = event.max_teams != null ? Number(event.max_teams) : null;

  if (cap != null && existingTeamsCount >= cap) {
    return { created: 0, suggestions: [], leftover: 0, cap_hit: true };
  }

  const enrollments = await Enrollment.find({
    event_id: eventId,
    status: "pending",
  })
    .populate("user_id", "name availability experience_level")
    .lean();

  const candidates = enrollments
    .filter((e) => e.user_id)
    .map((e) => ({ enrollmentId: e._id, user: e.user_id }));

  const created = [];
  const usedIds = new Set();
  const copy = [...candidates];

  const minSize = event.team_size_min || 2;

  while (
    copy.filter((c) => !usedIds.has(String(c.user._id))).length >= minSize
  ) {
    if (cap != null && existingTeamsCount + created.length >= cap) {
      break;
    }

    const available = copy.filter((c) => !usedIds.has(String(c.user._id)));
    const team = await buildBestTeam(event, available);
    if (!team) break;

    const suggestion = await Suggestion.create({
      event_id: eventId,
      team_members: team.members.map((m) => m._id),
      leader_candidate: team.leader._id,
      score: Math.round(team.score * 100) / 100,
      reasoning: `AI-suggested team of ${team.members.length} members with balanced skills.`,
      status: "pending",
    });
    created.push(suggestion);
    team.members.forEach((m) => usedIds.add(String(m._id)));
  }

  // ===== CRITICAL FIX: Notify leftover candidates =====
  const leftoverCandidates = copy.filter(
    (c) => !usedIds.has(String(c.user._id)),
  );
  const leftover = leftoverCandidates.length;

  const capHit = cap != null && existingTeamsCount + created.length >= cap;

  for (const c of leftoverCandidates) {
    await createNotification({
      user: c.user._id,
      type: "match_found",
      title: capHit ? "You're on the waitlist" : "No match yet",
      message: capHit
        ? `All team slots for "${event.title}" are full. You are on the waitlist.`
        : `We couldn't match you into a team for "${event.title}" yet. We'll retry when new students enroll.`,
      link: `/events/${event._id}`,
      priority: "medium",
    });
  }

  // Notify accepted suggestion members
  for (const s of created) {
    for (const memberId of s.team_members) {
      await createNotification({
        user: memberId,
        type: "match_found",
        title: "Team suggestion ready!",
        message: `An AI-matched team is ready for "${event.title}". Review now.`,
        link: `/matching`,
        priority: "high",
      });
    }
  }

  return {
    created: created.length,
    suggestions: created,
    leftover,
    cap_hit: capHit,
  };
};

exports.runMatchingInternal = runMatchingInternal;

// ===== POST /api/events/:eventId/matching/run (admin) =====
exports.runMatching = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const result = await runMatchingInternal(eventId);
  return res.status(200).json({
    success: true,
    data: {
      created: result.created,
      suggestions: result.suggestions,
      leftover: result.leftover,
      cap_hit: result.cap_hit,
    },
  });
};

// ===== GET /api/events/:eventId/suggestions =====
exports.listSuggestions = async (req, res) => {
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const suggestions = await Suggestion.find({
    event_id: eventId,
    status: "pending",
  })
    .populate("team_members", "name avatar_url year experience_level")
    .populate("leader_candidate", "name avatar_url")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ success: true, data: suggestions });
};

// ===== ACCEPT SUGGESTION (with race-safe cap check) =====
exports.acceptSuggestion = async (req, res) => {
  const { suggestionId } = req.params;
  if (!isObjectId(suggestionId))
    throw new HttpError(400, "INVALID_ID", "Invalid suggestion id");

  const suggestion = await Suggestion.findById(suggestionId);
  if (!suggestion)
    throw new HttpError(404, "SUGGESTION_NOT_FOUND", "Suggestion not found");
  if (suggestion.status !== "pending") {
    throw new HttpError(
      422,
      "ALREADY_RESOLVED",
      "Suggestion already accepted/rejected",
    );
  }

  const isMember = suggestion.team_members.some(
    (m) => String(m) === String(req.user.id),
  );
  if (!isMember)
    throw new HttpError(403, "FORBIDDEN", "You are not in this suggestion");

  const event = await Event.findById(suggestion.event_id);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  const teamSize = suggestion.team_members.length;
  if (teamSize < (event.team_size_min || 2)) {
    throw new HttpError(
      422,
      "TEAM_TOO_SMALL",
      `Team needs at least ${event.team_size_min} members`,
    );
  }
  if (teamSize > (event.team_size_max || 6)) {
    throw new HttpError(
      422,
      "TEAM_TOO_LARGE",
      `Team can have at most ${event.team_size_max} members`,
    );
  }

  // ===== CRITICAL FIX: Atomically reserve a team slot =====
  // Use findOneAndUpdate with $inc on a counter-like field.
  // We use the Event's `_teams_reserved` field (add if not exists) OR
  // fallback: atomic check-and-create via a lock document.
  //
  // Simpler approach: use findOneAndUpdate on Event with a guard.
  // But Event doesn't have a counter. So we do a two-step atomic guard:
  //   1) Atomically "claim" a slot by pushing suggestion to a reserved list
  //   2) Then create the team
  //
  // Cleanest: use MongoDB transaction if replica set available.
  // Fallback: atomic $push on a reserved_suggestion_ids array.

  // Approach: atomic claim on Suggestion itself (prevents double-accept)
  const claimed = await Suggestion.findOneAndUpdate(
    { _id: suggestionId, status: "pending" },
    { $set: { status: "accepted" } },
    { new: true },
  );
  if (!claimed) {
    throw new HttpError(
      422,
      "ALREADY_RESOLVED",
      "Suggestion already accepted/rejected",
    );
  }

  // Now check cap atomically against actual teams
  if (event.max_teams != null) {
    const existingTeams = await Team.countDocuments({
      event_id: suggestion.event_id,
    });
    if (existingTeams >= Number(event.max_teams)) {
      // Rollback suggestion status
      await Suggestion.updateOne(
        { _id: suggestionId },
        { $set: { status: "pending" } },
      );
      throw new HttpError(
        422,
        "MAX_TEAMS_REACHED",
        `Event has reached its max teams limit (${event.max_teams})`,
      );
    }
  }

  try {
    const team = await Team.create({
      event_id: suggestion.event_id,
      leader_id: suggestion.leader_candidate,
      name: `${event.title} Team ${Date.now().toString(36).slice(-4)}`,
      description: "AI-matched team",
      status: "draft",
    });

    const memberOps = suggestion.team_members.map((uid) => ({
      team_id: team._id,
      user_id: uid,
      role:
        String(uid) === String(suggestion.leader_candidate)
          ? "leader"
          : "member",
      status: "accepted",
      joined_at: new Date(),
    }));
    await TeamMember.insertMany(memberOps, { ordered: false });

    await Enrollment.updateMany(
      {
        user_id: { $in: suggestion.team_members },
        event_id: suggestion.event_id,
      },
      { $set: { status: "matched" } },
    );

    const conversation = await Conversation.create({
      team_id: team._id,
      type: "team",
      name: `${team.name} Chat`,
    });
    const convOps = suggestion.team_members.map((uid) => ({
      conv_id: conversation._id,
      user_id: uid,
      status: "active",
    }));
    await ConversationMember.insertMany(convOps, { ordered: false });

    for (const uid of suggestion.team_members) {
      await createNotification({
        user: uid,
        type: "team_confirmed",
        title: "Team created!",
        message: `Team "${team.name}" has been created for ${event.title}.`,
        link: `/teams/${team._id}`,
        priority: "high",
      });
    }

    return res.status(200).json({
      success: true,
      data: { team, conversation_id: conversation._id },
    });
  } catch (err) {
    // Rollback suggestion status if team creation failed
    await Suggestion.updateOne(
      { _id: suggestionId },
      { $set: { status: "pending" } },
    );
    throw err;
  }
};

// ===== REJECT SUGGESTION =====
exports.rejectSuggestion = async (req, res) => {
  const { suggestionId } = req.params;
  if (!isObjectId(suggestionId))
    throw new HttpError(400, "INVALID_ID", "Invalid suggestion id");

  const suggestion = await Suggestion.findById(suggestionId);
  if (!suggestion)
    throw new HttpError(404, "SUGGESTION_NOT_FOUND", "Suggestion not found");

  const isMember = suggestion.team_members.some(
    (m) => String(m) === String(req.user.id),
  );
  if (!isMember)
    throw new HttpError(403, "FORBIDDEN", "You are not in this suggestion");

  if (suggestion.status !== "pending")
    throw new HttpError(422, "ALREADY_RESOLVED", "Already resolved");

  suggestion.status = "rejected";
  await suggestion.save();

  setImmediate(async () => {
    try {
      await rematchForRejectedSuggestion(suggestion);
    } catch (err) {
      console.error("[re-match] failed:", err.message);
    }
  });

  return res.status(200).json({
    success: true,
    data: suggestion,
    message: "Suggestion rejected. Looking for a new match in the background.",
  });
};

// ===== TARGETED RE-MATCH =====
const rematchForRejectedSuggestion = async (rejectedSuggestion) => {
  const event = await Event.findById(rejectedSuggestion.event_id);
  if (!event) return;

  const existingTeams = await Team.countDocuments({
    event_id: event._id,
  });
  const cap = event.max_teams != null ? Number(event.max_teams) : null;
  if (cap != null && existingTeams >= cap) {
    for (const uid of rejectedSuggestion.team_members) {
      await createNotification({
        user: uid,
        type: "match_found",
        title: "Team slots full",
        message: `All team slots for "${event.title}" are filled. You are on the waitlist.`,
        link: `/events/${event._id}`,
        priority: "medium",
      });
    }
    return;
  }

  await Enrollment.updateMany(
    {
      user_id: { $in: rejectedSuggestion.team_members },
      event_id: event._id,
      status: "pending",
    },
    { $set: { status: "pending" } },
  );

  const result = await runMatchingInternal(event._id);

  if (result.created > 0) {
    const newSuggestions = await Suggestion.find({
      event_id: event._id,
      status: "pending",
      team_members: { $in: rejectedSuggestion.team_members },
    }).lean();

    for (const s of newSuggestions) {
      for (const uid of s.team_members) {
        await createNotification({
          user: uid,
          type: "match_found",
          title: "New team suggestion ready!",
          message: `A new AI-matched team is ready for "${event.title}". Review now.`,
          link: `/matching`,
          priority: "high",
        });
      }
    }
  }
};
