const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

/**
 * Middleware to check express-validator results and return formatted errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    return sendError(res, 400, 'Validation failed', formattedErrors);
  }

  next();
};

module.exports = { validate };
