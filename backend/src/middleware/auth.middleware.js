const { verifyToken } = require("../utils/jwt");

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error_code: "NO_TOKEN",
      message: "Authorization token missing",
    });
  }

  try {
    const token = header.split(" ")[1];
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error_code: "INVALID_TOKEN",
      message: "Invalid or expired token",
    });
  }
};
