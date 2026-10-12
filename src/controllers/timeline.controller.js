const { Timeline } = require('../models/Timeline');
const { sendSuccess, sendPaginated, sendError } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');
const { parsePagination } = require('../utils/queryBuilder');

/**
 * @route   GET /api/timeline/:entityType/:entityId
 * @desc    Get timeline entries for a specific entity
 * @access  All roles (with appropriate access check in routes)
 */
const getEntityTimeline = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { page, limit, skip } = parsePagination(req.query);

    const validEntityTypes = ['Lead', 'Customer', 'Deal', 'Activity', 'User'];
    if (!validEntityTypes.includes(entityType)) {
      return sendError(
        res,
        400,
        `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`
      );
    }

    const filter = { entityType, entityId };
    if (req.query.action) filter.action = req.query.action;

    const [entries, total] = await Promise.all([
      Timeline.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Timeline.countDocuments(filter),
    ]);

    return sendPaginated(res, 'Timeline fetched successfully', entries, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/timeline
 * @desc    Get all timeline entries (Admin)
 * @access  Admin
 */
const getAllTimeline = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.action) filter.action = req.query.action;
    if (req.query.entityType) filter.entityType = req.query.entityType;
    if (req.query.performedBy) filter.performedBy = req.query.performedBy;

    const [entries, total] = await Promise.all([
      Timeline.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Timeline.countDocuments(filter),
    ]);

    return sendPaginated(res, 'Timeline entries fetched successfully', entries, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

module.exports = { getEntityTimeline, getAllTimeline };
