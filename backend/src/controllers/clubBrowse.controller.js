const Club = require("../models/club.model");
const ClubMember = require("../models/clubMember.model");
const ClubRecruitment = require("../models/clubRecruitment.model");
const User = require("../models/user.model");
const HttpError = require("../utils/httpError");
const {
  isObjectId,
  getPagination,
  buildMeta,
  getSort,
} = require("../utils/queryHelpers");

const CLUB_TYPES = Club.schema.path("type").enumValues;
const CLUB_STATUSES = Club.schema.path("status").enumValues;
const RECRUITMENT_STATUSES = ClubRecruitment.schema.path("status").enumValues;

// Student ko sirf ye fields dikhenge (rename_* wale admin ke liye)
const PUBLIC_CLUB_FIELDS =
  "name display_name type description secretary_id founded_year status createdAt updatedAt";

const isAdmin = (req) => Boolean(req.user) && req.user.role === "admin";
const asString = (v) => (typeof v === "string" ? v.trim() : "");

const selectClubFields = (query, req) =>
  isAdmin(req) ? query.select("-__v") : query.select(PUBLIC_CLUB_FIELDS);

// Live member count (ClubMember se, sirf active)
const getMemberCounts = async (clubIds) => {
  if (!clubIds.length) return {};
  const rows = await ClubMember.aggregate([
    { $match: { club_id: { $in: clubIds }, status: "active" } },
    { $group: { _id: "$club_id", count: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach((r) => {
    map[String(r._id)] = r.count;
  });
  return map;
};

// Club dhundo; student ke liye inactive/suspended club = 404
const findVisibleClub = async (req) => {
  const { clubId } = req.params;
  if (!isObjectId(clubId)) {
    throw new HttpError(400, "INVALID_ID", "Invalid club id");
  }
  const club = await selectClubFields(Club.findById(clubId), req).lean();
  if (!club || (!isAdmin(req) && club.status !== "active")) {
    throw new HttpError(404, "CLUB_NOT_FOUND", "Club not found");
  }
  return club;
};

// GET /api/clubs
exports.listClubs = async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSort(req.query, ["createdAt", "name", "type"], "name", "asc");
  const filter = {};

  const type = asString(req.query.type);
  if (type) {
    if (!CLUB_TYPES.includes(type)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        `type must be one of: ${CLUB_TYPES.join(", ")}`,
      );
    }
    filter.type = type;
  }

  if (isAdmin(req)) {
    const status = asString(req.query.status);
    if (status) {
      if (!CLUB_STATUSES.includes(status)) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          `status must be one of: ${CLUB_STATUSES.join(", ")}`,
        );
      }
      filter.status = status;
    }
  } else {
    filter.status = "active";
  }

  const [clubs, total] = await Promise.all([
    selectClubFields(Club.find(filter), req)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Club.countDocuments(filter),
  ]);

  const counts = await getMemberCounts(clubs.map((c) => c._id));
  const data = clubs.map((c) => ({
    ...c,
    member_count: counts[String(c._id)] || 0,
  }));

  return res
    .status(200)
    .json({ success: true, data, meta: buildMeta(page, limit, total) });
};

// GET /api/clubs/:clubId
exports.getClub = async (req, res) => {
  const club = await findVisibleClub(req);

  const [secretary, memberCount] = await Promise.all([
    club.secretary_id
      ? User.findById(club.secretary_id).select("name year").lean()
      : null,
    ClubMember.countDocuments({ club_id: club._id, status: "active" }),
  ]);

  return res.status(200).json({
    success: true,
    data: { ...club, secretary: secretary || null, member_count: memberCount },
  });
};

// GET /api/clubs/:clubId/members
// Order: secretary -> core_member -> member
exports.listMembers = async (req, res) => {
  const club = await findVisibleClub(req);
  const { page, limit, skip } = getPagination(req.query);
  const match = { club_id: club._id, status: "active" };

  const [members, total] = await Promise.all([
    ClubMember.aggregate([
      { $match: match },
      {
        $addFields: {
          roleOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$role", "secretary"] }, then: 0 },
                { case: { $eq: ["$role", "core_member"] }, then: 1 },
              ],
              default: 2,
            },
          },
        },
      },
      { $sort: { roleOrder: 1, joined_at: 1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: User.collection.name,
          localField: "user_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          role: 1,
          joined_at: 1,
          user_id: 1,
          "user.name": 1,
          "user.year": 1,
        },
      },
    ]),
    ClubMember.countDocuments(match),
  ]);

  // password_hash / email kabhi nahi bhejte
  const data = members.map((m) => ({
    _id: m._id,
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    name: m.user ? m.user.name : null,
    year: m.user ? m.user.year : null,
  }));

  return res
    .status(200)
    .json({ success: true, data, meta: buildMeta(page, limit, total) });
};

// GET /api/clubs/:clubId/recruitments
// Student: default sirf open + deadline nikli nahi. Draft kabhi nahi.
exports.listRecruitments = async (req, res) => {
  const club = await findVisibleClub(req);
  const { page, limit, skip } = getPagination(req.query);
  const sort = getSort(
    req.query,
    ["application_deadline", "createdAt", "title"],
    "application_deadline",
    "asc",
  );
  const filter = { club_id: club._id };
  const status = asString(req.query.status);

  if (isAdmin(req)) {
    if (status) {
      if (!RECRUITMENT_STATUSES.includes(status)) {
        throw new HttpError(
          400,
          "VALIDATION_ERROR",
          `status must be one of: ${RECRUITMENT_STATUSES.join(", ")}`,
        );
      }
      filter.status = status;
    }
  } else {
    const wanted = status || "open";
    if (!["open", "closed"].includes(wanted)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "status must be one of: open, closed",
      );
    }
    filter.status = wanted;
    if (wanted === "open") {
      filter.application_deadline = { $gt: new Date() };
    }
  }

  const [items, total] = await Promise.all([
    ClubRecruitment.find(filter)
      .select("-__v -created_by")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ClubRecruitment.countDocuments(filter),
  ]);

  const now = new Date();
  const data = items.map((r) => ({
    ...r,
    is_open: r.status === "open" && new Date(r.application_deadline) > now,
  }));

  return res
    .status(200)
    .json({ success: true, data, meta: buildMeta(page, limit, total) });
};
