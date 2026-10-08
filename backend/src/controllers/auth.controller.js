const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { signToken } = require("../utils/jwt");

// Allowed college email domains
const ALLOWED_DOMAINS = ["@iiitv.ac.in", "@iiitvadodara.ac.in"];

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, year } = req.body;

    // College email check (multiple domains)
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
    });

    const token = signToken({ id: user._id, role: user.role });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
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

    const token = signToken({ id: user._id, role: user.role });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
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
