const { Deal, DEAL_STAGES, CLOSED_STAGES, ACTIVE_STAGES } = require('../models/Deal');
const { Customer } = require('../models/Customer');
const { User, ROLES } = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { NotFoundError, BusinessLogicError, AuthorizationError } = require('../utils/errors');
const { parsePagination, parseSort, parseDateRange } = require('../utils/queryBuilder');
const { createTimelineEntry } = require('../utils/timeline');

/**
 * Build deal filter based on query params and role
 */
const buildDealFilter = (query, user) => {
  const filter = {};

  if (user.role === ROLES.SALES_EXECUTIVE) {
    filter.assignedTo = user._id;
  }

  if (query.stage) filter.stage = query.stage;
  if (query.isClosed !== undefined) filter.isClosed = query.isClosed === 'true';
  if (query.assignedTo && user.role !== ROLES.SALES_EXECUTIVE) {
    filter.assignedTo = query.assignedTo;
  }
  if (query.customer) filter.customer = query.customer;

  // Amount range
  if (query.minValue || query.maxValue) {
    filter.dealValue = {};
    if (query.minValue) filter.dealValue.$gte = parseFloat(query.minValue);
    if (query.maxValue) filter.dealValue.$lte = parseFloat(query.maxValue);
  }

  // Closing date range
  if (query.closingDateStart || query.closingDateEnd) {
    filter.expectedClosingDate = {};
    if (query.closingDateStart) filter.expectedClosingDate.$gte = new Date(query.closingDateStart);
    if (query.closingDateEnd) filter.expectedClosingDate.$lte = new Date(query.closingDateEnd);
  }

  // Search
  if (query.search) {
    filter.$or = [
      { dealName: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
    ];
  }

  const dateFilter = parseDateRange(query);
  Object.assign(filter, dateFilter);

  return filter;
};

/**
 * Enforce deal stage transition business rules
 */
const validateStageTransition = (currentStage, newStage, lostReason) => {
  // Won/Lost deals cannot be moved back to active stages
  if (CLOSED_STAGES.includes(currentStage) && ACTIVE_STAGES.includes(newStage)) {
    throw new BusinessLogicError(
      `Cannot move a ${currentStage} deal back to an active stage. Create a new deal instead.`
    );
  }

  // Lost deal must have a reason
  if (newStage === 'Lost' && !lostReason) {
    throw new BusinessLogicError('A reason is required when marking a deal as Lost');
  }

  // Cannot transition from Won to Lost directly (must be intentional)
  if (currentStage === 'Won' && newStage === 'Lost') {
    throw new BusinessLogicError('Cannot move a Won deal to Lost. Please contact an administrator.');
  }
};

/**
 * @route   POST /api/deals
 * @desc    Create a new deal
 * @access  All roles
 */
const createDeal = async (req, res, next) => {
  try {
    // Verify customer exists
    const customer = await Customer.findById(req.body.customer);
    if (!customer) throw new NotFoundError('Customer not found');

    // Validate assignee
    if (req.body.assignedTo) {
      const assignee = await User.findById(req.body.assignedTo);
      if (!assignee || !assignee.isActive) {
        return sendError(res, 400, 'Assigned user not found or inactive');
      }
    }

    // Validate closing date is in the future (for new active deals)
    if (req.body.expectedClosingDate) {
      const closingDate = new Date(req.body.expectedClosingDate);
      if (closingDate < new Date()) {
        return sendError(res, 400, 'Expected closing date must be in the future');
      }
    }

    const dealData = { ...req.body, createdBy: req.user._id };
    const deal = await Deal.create(dealData);

    await createTimelineEntry({
      action: 'deal_created',
      entityType: 'Deal',
      entityId: deal._id,
      performedBy: req.user._id,
      newValue: { dealName: deal.dealName, dealValue: deal.dealValue, stage: deal.stage },
      description: `Deal "${deal.dealName}" created`,
    });

    const populated = await Deal.findById(deal._id)
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email')
      .populate('lead', 'name status');

    return sendSuccess(res, 201, 'Deal created successfully', populated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/deals
 * @desc    Get all deals with filter/sort/pagination
 * @access  All roles (role filtered)
 */
const getDeals = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query);
    const filter = buildDealFilter(req.query, req.user);

    const [deals, total] = await Promise.all([
      Deal.find(filter)
        .populate('customer', 'name email company')
        .populate('assignedTo', 'name email')
        .populate('lead', 'name status')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Deal.countDocuments(filter),
    ]);

    return sendPaginated(res, 'Deals fetched successfully', deals, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/deals/:id
 * @desc    Get deal by ID
 * @access  All roles (with access check)
 */
const getDealById = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id)
      .populate('customer', 'name email company phone')
      .populate('assignedTo', 'name email phone')
      .populate('lead', 'name email status source')
      .populate('createdBy', 'name email');

    if (!deal) throw new NotFoundError('Deal not found');

    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      deal.assignedTo?._id?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have access to this deal');
    }

    return sendSuccess(res, 200, 'Deal fetched successfully', deal);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/deals/:id
 * @desc    Update deal
 * @access  All roles (with access check)
 */
const updateDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) throw new NotFoundError('Deal not found');

    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      deal.assignedTo?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have permission to update this deal');
    }

    // If stage is being changed, run business rule validation
    if (req.body.stage && req.body.stage !== deal.stage) {
      validateStageTransition(deal.stage, req.body.stage, req.body.lostReason);
    }

    // Business rule: deal value must be > 0
    if (req.body.dealValue !== undefined && req.body.dealValue <= 0) {
      throw new BusinessLogicError('Deal value must be greater than zero');
    }

    // Business rule: probability must be 0-100
    if (req.body.probability !== undefined && (req.body.probability < 0 || req.body.probability > 100)) {
      throw new BusinessLogicError('Probability must be between 0 and 100');
    }

    const prevStage = deal.stage;

    // Only allow specific fields to be updated (prevent mass assignment)
    const allowedFields = [
      'dealName', 'dealValue', 'probability', 'expectedClosingDate',
      'stage', 'description', 'lostReason', 'assignedTo',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.stage) {
      updates.previousStage = prevStage;
    }

    const updated = await Deal.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name email company')
      .populate('assignedTo', 'name email')
      .populate('lead', 'name status');

    // Record stage changes
    if (updates.stage && updates.stage !== prevStage) {
      const action =
        updates.stage === 'Won'
          ? 'deal_won'
          : updates.stage === 'Lost'
          ? 'deal_lost'
          : 'deal_stage_changed';

      await createTimelineEntry({
        action,
        entityType: 'Deal',
        entityId: deal._id,
        performedBy: req.user._id,
        previousValue: prevStage,
        newValue: updates.stage,
        description: `Deal stage changed from "${prevStage}" to "${updates.stage}"${
          updates.lostReason ? `. Reason: ${updates.lostReason}` : ''
        }`,
      });
    }

    return sendSuccess(res, 200, 'Deal updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/deals/:id/stage
 * @desc    Update deal stage only (with business rule enforcement)
 * @access  All roles (with access check)
 */
const updateDealStage = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) throw new NotFoundError('Deal not found');

    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      deal.assignedTo?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have permission to update this deal');
    }

    const { stage, lostReason } = req.body;
    const prevStage = deal.stage;

    if (prevStage === stage) {
      return sendSuccess(res, 200, 'Deal is already at this stage', deal);
    }

    // Enforce business rules
    validateStageTransition(prevStage, stage, lostReason);

    deal.previousStage = prevStage;
    deal.stage = stage;
    if (lostReason) deal.lostReason = lostReason;
    if (stage === 'Won' && !deal.actualClosingDate) {
      deal.actualClosingDate = new Date();
    }

    await deal.save();

    const action =
      stage === 'Won' ? 'deal_won' : stage === 'Lost' ? 'deal_lost' : 'deal_stage_changed';

    await createTimelineEntry({
      action,
      entityType: 'Deal',
      entityId: deal._id,
      performedBy: req.user._id,
      previousValue: prevStage,
      newValue: stage,
      description: `Deal stage changed from "${prevStage}" to "${stage}"${
        lostReason ? `. Reason: ${lostReason}` : ''
      }`,
    });

    return sendSuccess(res, 200, 'Deal stage updated successfully', deal);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/deals/:id/assign
 * @desc    Assign deal to user
 * @access  Admin, Sales Manager
 */
const assignDeal = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const deal = await Deal.findById(req.params.id);
    if (!deal) throw new NotFoundError('Deal not found');

    const assignee = await User.findById(assignedTo);
    if (!assignee || !assignee.isActive) {
      throw new BusinessLogicError('Assigned user not found or inactive');
    }

    const prevAssignedTo = deal.assignedTo;
    deal.assignedTo = assignedTo;
    await deal.save();

    await createTimelineEntry({
      action: 'deal_assigned',
      entityType: 'Deal',
      entityId: deal._id,
      performedBy: req.user._id,
      previousValue: prevAssignedTo,
      newValue: assignedTo,
      description: `Deal assigned to "${assignee.name}"`,
    });

    return sendSuccess(res, 200, 'Deal assigned successfully', deal);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/deals/:id
 * @desc    Delete deal
 * @access  Admin only
 */
const deleteDeal = async (req, res, next) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) throw new NotFoundError('Deal not found');

    return sendSuccess(res, 200, 'Deal deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  updateDealStage,
  assignDeal,
  deleteDeal,
};
