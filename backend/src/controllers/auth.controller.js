const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user.model");
const { signToken } = require("../utils/jwt");

// Allowed college email domains
const ALLOWED_DOMAINS = ["@iiitv.ac.in", "@iiitvadodara.ac.in"];

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, year, batch } = req.body;

    const isValidCollegeEmail = ALLOWED_DOMAINS.some((domain) =>
      email.toLowerCase().endsWith(domain),
    );

    if (!isValidCollegeEmail) {
      return res.status(422).json({
        success: false,
        error_code: "INVALID_COLLEGE_EMAIL",
        message: "Only @iiitv.ac.in or @iiitvadodara.ac.in email allowed",
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        error_code: "EMAIL_EXISTS",
        message: "Email already registered",
      });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password_hash,
      year: year || 1,
      batch: batch || null,
      status: "active",
    });

    const token = signToken({ id: user._id, role: user.role });

    res.locals.auditUser = user._id;
    res.locals.auditEntityId = user._id;

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    // Password check first (so we don't leak account status via
    // wrong-password path)
    if (!user) {
      return res.status(401).json({
        success: false,
        error_code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error_code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    // Now check account status
    if (user.status === "pending_approval") {
      return res.status(403).json({
        success: false,
        error_code: "ACCOUNT_PENDING_APPROVAL",
        message:
          "Your account is pending admin approval. You'll be able to log in once approved.",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        error_code: "ACCOUNT_SUSPENDED",
        message: "Your account has been suspended. Contact admin.",
      });
    }

    const token = signToken({ id: user._id, role: user.role });

    res.locals.auditUser = user._id;
    res.locals.auditEntityId = user._id;

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          must_change_password: user.must_change_password,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password_hash");
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};

// POST /api/auth/change-password
// Body: { current_password, new_password }
// Used when must_change_password is true, or by any user to rotate password
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "current_password and new_password are required",
      });
    }

    if (typeof new_password !== "string" || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "New password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error_code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error_code: "INVALID_CREDENTIALS",
        message: "Current password is incorrect",
      });
    }

    user.password_hash = await bcrypt.hash(new_password, 10);
    user.must_change_password = false;
    await user.save();

    res.locals.auditUser = user._id;
    res.locals.auditEntityId = user._id;

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error_code: "SERVER_ERROR",
      message: "Something went wrong",
    });
  }
};
