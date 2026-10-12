const { User } = require('../models/User');
const {
  generateTokenPair,
  verifyRefreshToken,
  setTokenCookies,
  clearTokenCookies,
} = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');
const { NotFoundError, AuthenticationError, ConflictError } = require('../utils/errors');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Admin only in production flow)
 * @access  Public (first admin) / Admin
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || 'sales_executive',
    });

    const { accessToken, refreshToken } = generateTokenPair(user);

    // Store refresh token in DB (hashed or raw — here raw, can be hashed)
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, refreshToken);

    return sendSuccess(res, 201, 'User registered successfully', {
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field included
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Your account has been deactivated. Please contact an administrator.');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password');
    }

    const { accessToken, refreshToken } = generateTokenPair(user);

    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, refreshToken);

    // Remove password from output
    user.password = undefined;

    return sendSuccess(res, 200, 'Logged in successfully', {
      user,
      accessToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    // Clear refresh token in DB
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { refreshToken: '' },
    });

    clearTokenCookies(res);

    return sendSuccess(res, 200, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (with valid refresh token)
 */
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      throw new AuthenticationError('Refresh token is required');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      throw new AuthenticationError('Invalid refresh token. Please log in again.');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account deactivated');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    setTokenCookies(res, accessToken, newRefreshToken);

    return sendSuccess(res, 200, 'Token refreshed successfully', { accessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user profile
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw new NotFoundError('User not found');

    return sendSuccess(res, 200, 'Profile fetched successfully', user);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/auth/me
 * @desc    Update own profile
 * @access  Private
 */
const updateMe = async (req, res, next) => {
  try {
    // Prevent role/password change via this route
    const { name, email, phone } = req.body;

    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existing) throw new ConflictError('Email is already in use by another account');
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email, phone },
      { new: true, runValidators: true }
    );

    return sendSuccess(res, 200, 'Profile updated successfully', user);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Change own password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(res, 400, 'Current password and new password are required');
    }

    if (newPassword.length < 8) {
      return sendError(res, 400, 'New password must be at least 8 characters');
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return sendError(res, 400, 'Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();

    clearTokenCookies(res);

    return sendSuccess(res, 200, 'Password changed successfully. Please log in again.');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, logout, refreshToken, getMe, updateMe, changePassword };
