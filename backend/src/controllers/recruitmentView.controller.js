const Club = require('../models/club.model');
const ClubMember = require('../models/clubMember.model');
const ClubRecruitment = require('../models/clubRecruitment.model');
const ClubApplication = require('../models/clubApplication.model');
const User = require('../models/user.model');
const HttpError = require('../utils/httpError');
const { isObjectId } = require('../utils/queryHelpers');
const { createNotification } = require('../services/notification.service');

const isAdmin = (req) => Boolean(req.user) && req.user.role === 'admin';

const isOpen = (recruitment) =>
  recruitment.status === 'open' &&
  new Date(recruitment.application_deadline) > new Date();

const isValidHttpUrl = (value) => {
  if (typeof value !== 'string' || !value || value.length > 500) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

// Recruitment + club load karo. Draft sirf admin/creator ko dikhta hai.
const loadRecruitment = async (req) => {
  const { recruitmentId } = req.params;
  if (!isObjectId(recruitmentId)) {
    throw new HttpError(400, 'INVALID_ID', 'Invalid recruitment id');
  }

  const recruitment = await ClubRecruitment.findById(recruitmentId)
    .select('-__v')
    .lean();
  const notFound = new HttpError(
    404,
    'RECRUITMENT_NOT_FOUND',
    'Recruitment not found'
  );
  if (!recruitment) throw notFound;

  const isCreator = String(recruitment.created_by) === String(req.user.id);
  if (recruitment.status === 'draft' && !isAdmin(req) && !isCreator) {
    throw notFound;
  }

  const club = await Club.findById(recruitment.club_id)
    .select('name display_name type status secretary_id')
    .lean();
  if (!club || (!isAdmin(req) && club.status !== 'active')) throw notFound;

  return { recruitment, club };
};

// GET /api/recruitments/:recruitmentId
exports.getRecruitment = async (req, res) => {
  const { recruitment, club } = await loadRecruitment(req);

  const application = await ClubApplication.findOne({
    recruitment_id: recruitment._id,
    user_id: req.user.id,
  })
    .select('status')
    .lean();

  return res.status(200).json({
    success: true,
    data: {
      ...recruitment,
      is_open: isOpen(recruitment),
      has_applied: Boolean(application),
      application: application
        ? { _id: application._id, status: application.status }
        : null,
      club: {
        _id: club._id,
        name: club.name,
        display_name: club.display_name,
        type: club.type,
      },
    },
  });
};

// POST /api/recruitments/:recruitmentId/applications
exports.applyToRecruitment = async (req, res) => {
  const { recruitment, club } = await loadRecruitment(req);
  const body =
    req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body
      : {};

  // Rule 1: recruitment open + deadline nahi nikli
  if (!isOpen(recruitment)) {
    throw new HttpError(
      422,
      'RECRUITMENT_CLOSED',
      'Applications are closed for this recruitment'
    );
  }

  // Rule 2: club ka active member apply nahi kar sakta
  const alreadyMember = await ClubMember.exists({
    club_id: club._id,
    user_id: req.user.id,
    status: 'active',
  });
  if (alreadyMember) {
    throw new HttpError(
      422,
      'ALREADY_CLUB_MEMBER',
      'You are already a member of this club'
    );
  }

  // Rule 3: ek recruitment mein ek hi baar apply
  const existing = await ClubApplication.exists({
    recruitment_id: recruitment._id,
    user_id: req.user.id,
  });
  if (existing) {
    throw new HttpError(
      409,
      'ALREADY_APPLIED',
      'You have already applied to this recruitment'
    );
  }

  // Verification type: recruitment se aata hai; 'both' ho to student chunta hai
  let verificationType = recruitment.verification_type;
  if (verificationType === 'both') {
    if (!['physical', 'online'].includes(body.verification_type)) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        "verification_type must be 'physical' or 'online' for this recruitment"
      );
    }
    verificationType = body.verification_type;
  }

  let videoUrl = '';
  if (verificationType === 'video') {
    videoUrl = typeof body.video_url === 'string' ? body.video_url.trim() : '';
    if (!isValidHttpUrl(videoUrl)) {
      throw new HttpError(
        400,
        'VALIDATION_ERROR',
        'video_url must be a valid http(s) link'
      );
    }
  }

  let application;
  try {
    application = await ClubApplication.create({
      recruitment_id: recruitment._id,
      user_id: req.user.id,
      verification_type: verificationType,
      verification_data: { video_url: videoUrl },
    });
  } catch (err) {
    // double-click / race: unique index pakad leta hai
    if (err && err.code === 11000) {
      throw new HttpError(
        409,
        'ALREADY_APPLIED',
        'You have already applied to this recruitment'
      );
    }
    throw err;
  }

  // Secretary ko notification (fail ho to bhi application save rehti hai)
  try {
    if (club.secretary_id && String(club.secretary_id) !== String(req.user.id)) {
      const applicant = await User.findById(req.user.id).select('name').lean();
      await createNotification({
        user: club.secretary_id,
        type: 'application_received',
        title: 'New club application',
        message: `${applicant ? applicant.name : 'A student'} applied for "${recruitment.title}"`,
        link: `/recruitments/${recruitment._id}`,
        priority: 'medium',
      });
    }
  } catch (err) {
    console.error('Notification failed (application saved):', err.message);
  }

  return res.status(201).json({
    success: true,
    data: {
      application: {
        _id: application._id,
        recruitment_id: application.recruitment_id,
        status: application.status,
        verification_type: application.verification_type,
        applied_at: application.applied_at,
      },
    },
  });
};
