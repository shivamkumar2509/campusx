const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/user.model");
const { signToken } = require("../utils/jwt");
// const nodemailer = require("nodemailer");

// Allowed college email domains
const ALLOWED_DOMAINS = ["@iiitv.ac.in", "@iiitvadodara.ac.in"];

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, year, batch, branch, role, admin_code } =
      req.body;

    const isAdminSignup = role === "admin";

    // ✅ SECURITY CHECK: Ab admin code ke bina koi signup nahi kar sakta
    if (isAdminSignup) {
      if (admin_code !== "CAMPUSX_ADMIN_2026") {
        return res.status(403).json({
          success: false,
          error_code: "INVALID_ADMIN_CODE",
          message: "Invalid Admin Access Code. Access Denied.",
        });
      }
    }

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

    // ✅ LOGIC CHANGE: Ab admin ho ya student, dono ko pending_approval mein daalo
    // Admin ko bhi existing admin hi approve karega.
    const newUser = await User.create({
      name,
      email,
      password_hash,
      year: year || 1,
      batch: batch || null,
      branch: branch || "",
      role: isAdminSignup ? "admin" : "student",
      status: "pending_approval", // Ab dono pending rahenge
    });

    res.locals.auditUser = newUser._id;
    res.locals.auditEntityId = newUser._id;

    // ✅ Token tabhi denge jab active ho, par yahan ab token null hi jayega kyunki status pending hai
    const token = null;

    res.status(201).json({
      success: true,
      message: isAdminSignup
        ? "Admin account request submitted. Please wait for existing admin approval."
        : "Account created successfully. Please wait for admin approval.",
      data: {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
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

const sendEmail = async (to, subject, text) => {
  console.log(
    `\n📧 [EMAIL SENT] To: ${to}\nSubject: ${subject}\nBody: ${text}\n`,
  );
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(200)
        .json({ success: true, message: "If email exists, reset link sent." });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetExpires = Date.now() + 15 * 60 * 1000; // 15 mins

    user.reset_password_token = resetToken;
    user.reset_password_expires = resetExpires;
    await user.save();

    const resetLink = `http://localhost:5173/forgot-password?token=${resetToken}`;

    await sendEmail(
      user.email,
      "Reset Your CampusX Password",
      `Click here to reset your password: ${resetLink}\nLink expires in 15 minutes.`,
    );

    res
      .status(200)
      .json({ success: true, message: "Reset link sent to email." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      reset_password_token: token,
      reset_password_expires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    user.password_hash = await bcrypt.hash(password, 10);
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/auth/oauth/google
exports.googleOAuth = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    let user = await User.findOne({ email });

    if (!user) {
      const password_hash = await bcrypt.hash(googleId + "dummy", 10);
      user = await User.create({
        name,
        email,
        password_hash,
        year: 1,
        status: "active",
        college: "IIITV",
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
          status: user.status,
          must_change_password: user.must_change_password,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "OAuth failed" });
  }
};
