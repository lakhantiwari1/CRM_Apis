const { verifyAccessToken } = require('../utils/jwt');
const { User } = require('../models/User');
const { AuthenticationError } = require('../utils/errors');
const { sendError } = require('../utils/response');

/**
 * Authenticate user via JWT (Bearer token or HTTP-only cookie)
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Try Authorization Bearer header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // 2. Try HTTP-only cookie
    if (!token && req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AuthenticationError('Access token is required. Please log in.');
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError('Access token has expired. Please refresh your token.');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new AuthenticationError('Invalid access token.');
      }
      throw new AuthenticationError('Token verification failed.');
    }

    // Fetch user
    const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user) {
      throw new AuthenticationError('User no longer exists.');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Your account has been deactivated. Please contact an administrator.');
    }

    // Check if password was changed after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      throw new AuthenticationError('Password recently changed. Please log in again.');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.isOperational) {
      return sendError(res, error.statusCode, error.message);
    }
    return sendError(res, 401, 'Authentication failed');
  }
};

module.exports = { authenticate };
