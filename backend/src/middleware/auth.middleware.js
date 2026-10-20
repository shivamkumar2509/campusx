const { verifyToken } = require("../utils/jwt");

module.exports = (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        error_code: "UNAUTHORIZED",
        message: "Missing or invalid authorization header",
      });
    }

    const decoded = verifyToken(token);
    // Controllers expect req.user = { id, role }
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error_code: "INVALID_TOKEN",
      message: "Invalid or expired token",
    });
  }
};
