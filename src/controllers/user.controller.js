const { User, ROLES } = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { NotFoundError, ConflictError, AuthorizationError } = require('../utils/errors');
const { parsePagination, parseSort, parseDateRange, parseSearch } = require('../utils/queryBuilder');

/**
 * @route   POST /api/users
 * @desc    Create a new user (Admin only)
 * @access  Admin
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError('An account with this email already exists');

    const user = await User.create({ name, email, phone, password, role });

    return sendSuccess(res, 201, 'User created successfully', user);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/users
 * @desc    Get all users with search, filter, sort, pagination
 * @access  Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query);
    const dateFilter = parseDateRange(req.query);

    const filter = { ...dateFilter };

    // Search
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Filter by role
    if (req.query.role && Object.values(ROLES).includes(req.query.role)) {
      filter.role = req.query.role;
    }

    // Filter by status
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort(sort).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return sendPaginated(res, 'Users fetched successfully', users, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw new NotFoundError('User not found');

    return sendSuccess(res, 200, 'User fetched successfully', user);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, isActive } = req.body;

    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) throw new ConflictError('Email is already in use');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, role, isActive },
      { new: true, runValidators: true }
    );

    if (!user) throw new NotFoundError('User not found');

    return sendSuccess(res, 200, 'User updated successfully', user);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/users/:id/activate
 * @desc    Activate user
 * @access  Admin
 */
const activateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!user) throw new NotFoundError('User not found');

    return sendSuccess(res, 200, 'User activated successfully', user);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/users/:id/deactivate
 * @desc    Deactivate user
 * @access  Admin
 */
const deactivateUser = async (req, res, next) => {
  try {
    // Prevent self-deactivation
    if (req.params.id === req.user._id.toString()) {
      return sendError(res, 400, 'You cannot deactivate your own account');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user) throw new NotFoundError('User not found');

    return sendSuccess(res, 200, 'User deactivated successfully', user);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft/hard)
 * @access  Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return sendError(res, 400, 'You cannot delete your own account');
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new NotFoundError('User not found');

    return sendSuccess(res, 200, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/users/sales-executives
 * @desc    Get all active sales executives (for assignment dropdowns)
 * @access  Admin, Sales Manager
 */
const getSalesExecutives = async (req, res, next) => {
  try {
    const executives = await User.find({
      role: ROLES.SALES_EXECUTIVE,
      isActive: true,
    }).select('name email phone').sort({ name: 1 });

    return sendSuccess(res, 200, 'Sales executives fetched successfully', executives);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  activateUser,
  deactivateUser,
  deleteUser,
  getSalesExecutives,
};
