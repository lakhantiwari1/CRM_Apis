const mongoose = require('mongoose');
const { sendError } = require('../utils/response');

/**
 * Centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error details (server-side only)
  if (!isProduction) {
    console.error('❌ Error:', err);
  } else {
    console.error(`❌ [${new Date().toISOString()}] ${err.message} - ${req.method} ${req.originalUrl}`);
  }

  // Operational errors (known, expected errors)
  if (err.isOperational) {
    return sendError(res, err.statusCode, err.message, err.errors || null);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return sendError(res, 400, 'Validation failed', errors);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'unknown';
    return sendError(res, 409, `Duplicate value: '${value}' already exists for '${field}'`);
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, 400, `Invalid ${err.path}: '${err.value}' is not a valid ID`);
  }

  // JWT Errors (should be caught in middleware, but as fallback)
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Token has expired');
  }

  // Mongoose transaction abort error
  if (err.errorLabels && err.errorLabels.includes('TransientTransactionError')) {
    return sendError(res, 503, 'Transaction failed, please retry');
  }

  // Unknown / unhandled errors - don't leak details in production
  const message = isProduction
    ? 'An unexpected error occurred. Please try again later.'
    : err.message || 'Internal server error';

  return sendError(res, 500, message);
};

/**
 * 404 Not Found handler for unmatched routes
 */
const notFound = (req, res) => {
  return sendError(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

module.exports = { errorHandler, notFound };
