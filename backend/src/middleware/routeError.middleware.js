const HttpError = require("../utils/httpError");

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      success: false,
      error_code: err.errorCode,
      message: err.message,
    });
  }

  if (err && err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error_code: "INVALID_ID",
      message: "Invalid identifier",
    });
  }

  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "field";
    return res.status(409).json({
      success: false,
      error_code: "DUPLICATE_KEY",
      message: `${field} already exists`,
    });
  }

  if (err && err.name === "ValidationError") {
    const first = Object.values(err.errors || {})[0];
    return res.status(422).json({
      success: false,
      error_code: "VALIDATION_ERROR",
      message: first ? first.message : "Validation failed",
    });
  }

  console.error("Unhandled error:", err);
  return res.status(500).json({
    success: false,
    error_code: "SERVER_ERROR",
    message: "Something went wrong",
  });
};
