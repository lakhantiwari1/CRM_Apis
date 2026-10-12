const { Activity } = require('../models/Activity');
const { User, ROLES } = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { NotFoundError, AuthorizationError, BusinessLogicError } = require('../utils/errors');
const { parsePagination, parseSort, parseDateRange } = require('../utils/queryBuilder');
const { createTimelineEntry } = require('../utils/timeline');

/**
 * Auto-update overdue activities in the DB
 */
const updateOverdueActivities = async () => {
  const now = new Date();
  await Activity.updateMany(
    { status: 'Pending', dueDate: { $lt: now } },
    { $set: { status: 'Overdue' } }
  );
};

/**
 * Build activity filter based on role and query params
 */
const buildActivityFilter = (query, user) => {
  const filter = {};

  if (user.role === ROLES.SALES_EXECUTIVE) {
    filter.assignedTo = user._id;
  }

  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.assignedTo && user.role !== ROLES.SALES_EXECUTIVE) {
    filter.assignedTo = query.assignedTo;
  }
  if (query.relatedEntityId) filter.relatedEntityId = query.relatedEntityId;
  if (query.relatedEntityType) filter.relatedEntityType = query.relatedEntityType;

  // Due date range
  if (query.dueDateStart || query.dueDateEnd) {
    filter.dueDate = {};
    if (query.dueDateStart) filter.dueDate.$gte = new Date(query.dueDateStart);
    if (query.dueDateEnd) filter.dueDate.$lte = new Date(query.dueDateEnd);
  }

  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }

  const dateFilter = parseDateRange(query);
  Object.assign(filter, dateFilter);

  return filter;
};

/**
 * @route   POST /api/activities
 * @desc    Create activity
 * @access  All roles
 */
const createActivity = async (req, res, next) => {
  try {
    const activityData = { ...req.body, createdBy: req.user._id };

    // Validate assignee
    const assignee = await User.findById(activityData.assignedTo);
    if (!assignee || !assignee.isActive) {
      return sendError(res, 400, 'Assigned user not found or inactive');
    }

    // Sales executive can only assign to themselves
    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      activityData.assignedTo?.toString() !== req.user._id.toString()
    ) {
      activityData.assignedTo = req.user._id;
    }

    const activity = await Activity.create(activityData);

    // Create timeline entry if related to an entity
    if (activity.relatedEntityId && activity.relatedEntityType) {
      await createTimelineEntry({
        action: 'activity_created',
        entityType: activity.relatedEntityType,
        entityId: activity.relatedEntityId,
        performedBy: req.user._id,
        newValue: { type: activity.type, title: activity.title, dueDate: activity.dueDate },
        description: `Activity "${activity.title}" created`,
      });
    }

    const populated = await Activity.findById(activity._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 201, 'Activity created successfully', populated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/activities
 * @desc    Get all activities
 * @access  All roles (filtered)
 */
const getActivities = async (req, res, next) => {
  try {
    // Auto-mark overdue activities
    await updateOverdueActivities();

    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query, { dueDate: 1 });
    const filter = buildActivityFilter(req.query, req.user);

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Activity.countDocuments(filter),
    ]);

    return sendPaginated(res, 'Activities fetched successfully', activities, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/activities/:id
 * @desc    Get activity by ID
 * @access  All roles (with access check)
 */
const getActivityById = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name email');

    if (!activity) throw new NotFoundError('Activity not found');

    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      activity.assignedTo?._id?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have access to this activity');
    }

    return sendSuccess(res, 200, 'Activity fetched successfully', activity);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/activities/:id
 * @desc    Update activity
 * @access  All roles (with access check)
 */
const updateActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) throw new NotFoundError('Activity not found');

    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      activity.assignedTo?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have permission to update this activity');
    }

    if (activity.status === 'Completed') {
      throw new BusinessLogicError('Cannot update a completed activity');
    }

    const updated = await Activity.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 200, 'Activity updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/activities/:id/complete
 * @desc    Mark activity as completed
 * @access  All roles (with access check)
 */
const completeActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findById(req.params.id);
    if (!activity) throw new NotFoundError('Activity not found');

    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      activity.assignedTo?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have permission to complete this activity');
    }

    if (activity.status === 'Completed') {
      return sendSuccess(res, 200, 'Activity is already completed', activity);
    }

    activity.status = 'Completed';
    activity.completedDate = new Date();
    await activity.save();

    // Timeline entry
    if (activity.relatedEntityId && activity.relatedEntityType) {
      await createTimelineEntry({
        action: 'activity_completed',
        entityType: activity.relatedEntityType,
        entityId: activity.relatedEntityId,
        performedBy: req.user._id,
        description: `Activity "${activity.title}" marked as completed`,
      });
    }

    return sendSuccess(res, 200, 'Activity marked as completed', activity);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/activities/:id
 * @desc    Delete activity
 * @access  Admin, Sales Manager
 */
const deleteActivity = async (req, res, next) => {
  try {
    const activity = await Activity.findByIdAndDelete(req.params.id);
    if (!activity) throw new NotFoundError('Activity not found');

    return sendSuccess(res, 200, 'Activity deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  completeActivity,
  deleteActivity,
};
