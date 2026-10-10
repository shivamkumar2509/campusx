const crypto = require('crypto');

// Error format = API_ENDPOINTS.md wala format
module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = err.statusCode || 500;
  let errorCode = err.errorCode || 'SERVER_ERROR';
  let message = err.message || 'Something went wrong';

  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid id format';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  } else if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_RESOURCE';
    message = 'Resource already exists';
  }

  if (statusCode >= 500) {
    console.error(err);
    message = 'Something went wrong';
  }

  return res.status(statusCode).json({
    success: false,
    error_code: errorCode,
    message,
    request_id: `req_${crypto.randomBytes(4).toString('hex')}`,
    timestamp: new Date().toISOString(),
  });
};
