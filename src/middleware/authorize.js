const { ROLES } = require('../models/User');
const { sendError } = require('../utils/response');

/**
 * Role-based authorization middleware factory
 * @param {...string} allowedRoles - Roles permitted to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      );
    }

    next();
  };
};

/**
 * Shorthand role guards
 */
const adminOnly = authorize(ROLES.ADMIN);
const managerAndAbove = authorize(ROLES.ADMIN, ROLES.SALES_MANAGER);
const allRoles = authorize(ROLES.ADMIN, ROLES.SALES_MANAGER, ROLES.SALES_EXECUTIVE);

module.exports = { authorize, adminOnly, managerAndAbove, allRoles, ROLES };
