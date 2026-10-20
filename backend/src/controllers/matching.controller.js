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

/**
 * Score two users for compatibility based on complementary skills,
 * availability, and experience.
 */
const scorePair = (userA, skillsA, userB, skillsB) => {
  const setA = new Set((skillsA || []).map((s) => s.skill_name.toLowerCase()));
  const setB = new Set((skillsB || []).map((s) => s.skill_name.toLowerCase()));
  const overlap = [...setA].filter((s) => setB.has(s)).length;
  const union = new Set([...setA, ...setB]).size;
  const overlapRatio = union === 0 ? 0 : overlap / union; // 0..1

  // Complementary skills are GOOD (low overlap), but not zero
  const complementScore = 1 - Math.abs(overlapRatio - 0.3) / 0.7; // peaks at 30% overlap

  const availA = Number(userA.availability) || 0;
  const availB = Number(userB.availability) || 0;
  const availScore = Math.min((availA + availB) / 40, 1);

  const expMap = { beginner: 0.3, intermediate: 0.6, advanced: 1 };
  const expA = expMap[userA.experience_level] || 0.3;
  const expB = expMap[userB.experience_level] || 0.3;
  const expScore = 1 - Math.abs(expA - expB); // similar level = good

  return Math.max(
    0,
    Math.min(1, complementScore * 0.5 + availScore * 0.3 + expScore * 0.2),
  );
};

/**
 * Naive greedy team builder:
 *  - pull all pending enrollees
 *  - pick a seed (highest availability)
 *  - greedily add the best-scoring remaining candidate until team max is reached
 *  - leader = seed
 */
const buildBestTeam = async (event, candidates) => {
  if (candidates.length < event.team_size_min) return null;

  // Prefetch skills for all candidates
  const ids = candidates.map((c) => c.user._id);
  const allSkills = await Skill.find({ user_id: { $in: ids } }).lean();
  const skillMap = {};
  allSkills.forEach((s) => {
    const key = String(s.user_id);
    (skillMap[key] = skillMap[key] || []).push(s);
  });

  // Sort by availability (desc) as a seed heuristic
  const sorted = [...candidates].sort(
    (a, b) => (b.user.availability || 0) - (a.user.availability || 0),
  );

  const leader = sorted[0];
  const team = [leader];
  const remaining = sorted.slice(1);

  while (team.length < event.team_size_max && remaining.length > 0) {
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
    if (team.length >= event.team_size_min && bestScore < 0.3) break; // weak additions stop
  }

  return {
    leader: leader.user,
    members: team.map((t) => t.user),
    score: 0.6 + Math.random() * 0.3, // placeholder overall team score
  };
};

// POST /api/events/:eventId/matching/run  (admin)
// ===== INTERNAL REUSABLE MATCHING (used by auto-close + manual admin trigger) =====
// Returns { created: [...], suggestions: [...] }
const runMatchingInternal = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "Event not found");

  // Delete old pending suggestions for a fresh run
  await Suggestion.deleteMany({ event_id: eventId, status: "pending" });

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

  while (
    copy.filter((c) => !usedIds.has(String(c.user._id))).length >=
    event.team_size_min
  ) {
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

  // Notify each member
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

  return { created: created.length, suggestions: created };
};

// Export for reuse
exports.runMatchingInternal = runMatchingInternal;

// ===== ADMIN MANUAL TRIGGER =====
// POST /api/events/:eventId/matching/run
exports.runMatching = async (req, res) => {
  if (req.user.role !== "admin")
    throw new HttpError(403, "FORBIDDEN", "Admin only");
  const { eventId } = req.params;
  if (!isObjectId(eventId))
    throw new HttpError(400, "INVALID_ID", "Invalid event id");

  const result = await runMatchingInternal(eventId);
  return res.status(200).json({
    success: true,
    data: { created: result.created, suggestions: result.suggestions },
  });
};

// GET /api/events/:eventId/suggestions
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

// POST /api/suggestions/:suggestionId/accept
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

  // Create team
  const team = await Team.create({
    event_id: suggestion.event_id,
    leader_id: suggestion.leader_candidate,
    name: `${event.title} Team ${Date.now().toString(36).slice(-4)}`,
    description: "AI-matched team",
    status: "draft",
  });

  // Add members
  const memberOps = suggestion.team_members.map((uid) => ({
    team_id: team._id,
    user_id: uid,
    role:
      String(uid) === String(suggestion.leader_candidate) ? "leader" : "member",
    status: "accepted",
    joined_at: new Date(),
  }));
  await TeamMember.insertMany(memberOps, { ordered: false });

  // Update enrollments
  await Enrollment.updateMany(
    {
      user_id: { $in: suggestion.team_members },
      event_id: suggestion.event_id,
    },
    { $set: { status: "matched" } },
  );

  // Create conversation
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

  // Mark suggestion accepted
  suggestion.status = "accepted";
  await suggestion.save();

  // Notify all members
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
};

// POST /api/suggestions/:suggestionId/reject
// POST /api/suggestions/:suggestionId/reject
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

  // 🔥 TRY A RE-MATCH for the same user
  // Option A (simplest): just re-run matching for the event
  // The current rejected suggestion's members become free candidates again,
  // and matching picks fresh combos.
  setImmediate(async () => {
    try {
      const { runMatchingInternal } = require("./matching.controller");
      await runMatchingInternal(suggestion.event_id);
      console.log(`[re-match] done for event ${suggestion.event_id}`);
    } catch (err) {
      console.error("[re-match] failed:", err.message);
    }
  });

  return res.status(200).json({
    success: true,
    data: suggestion,
    message: "Suggestion rejected. Re-running matching in the background.",
  });
};
