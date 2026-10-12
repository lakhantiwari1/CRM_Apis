const mongoose = require('mongoose');
const { Lead, LEAD_STATUSES } = require('../models/Lead');
const { Customer } = require('../models/Customer');
const { Deal } = require('../models/Deal');
const { User, ROLES } = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { NotFoundError, BusinessLogicError, AuthorizationError } = require('../utils/errors');
const { parsePagination, parseSort, parseDateRange } = require('../utils/queryBuilder');
const { createTimelineEntry } = require('../utils/timeline');

/**
 * Build lead filter from query params, respecting role-based access
 */
const buildLeadFilter = (query, user) => {
  const filter = {};

  // Sales Executive can only see their assigned leads
  if (user.role === ROLES.SALES_EXECUTIVE) {
    filter.assignedTo = user._id;
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.source) filter.source = query.source;
  if (query.assignedTo && user.role !== ROLES.SALES_EXECUTIVE) {
    filter.assignedTo = query.assignedTo;
  }
  if (query.isConverted !== undefined) filter.isConverted = query.isConverted === 'true';

  // Search
  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { company: { $regex: query.search, $options: 'i' } },
    ];
  }

  // Date range
  const dateFilter = parseDateRange(query);
  Object.assign(filter, dateFilter);

  return filter;
};

/**
 * @route   POST /api/leads
 * @desc    Create a new lead
 * @access  All authenticated users
 */
const createLead = async (req, res, next) => {
  try {
    const leadData = { ...req.body, createdBy: req.user._id };

    // Sales executive auto-assigns to themselves if no assignedTo
    if (req.user.role === ROLES.SALES_EXECUTIVE) {
      leadData.assignedTo = req.user._id;
    }

    // Validate assignedTo user exists and is active
    if (leadData.assignedTo) {
      const assignee = await User.findById(leadData.assignedTo);
      if (!assignee || !assignee.isActive) {
        return sendError(res, 400, 'Assigned user does not exist or is inactive');
      }
    }

    const lead = await Lead.create(leadData);

    await createTimelineEntry({
      action: 'lead_created',
      entityType: 'Lead',
      entityId: lead._id,
      performedBy: req.user._id,
      newValue: { name: lead.name, status: lead.status, priority: lead.priority },
      description: `Lead "${lead.name}" created`,
    });

    const populated = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 201, 'Lead created successfully', populated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/leads
 * @desc    Get leads with search, filter, sort, pagination
 * @access  All roles (filtered by role)
 */
const getLeads = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query);
    const filter = buildLeadFilter(req.query, req.user);

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Lead.countDocuments(filter),
    ]);

    return sendPaginated(res, 'Leads fetched successfully', leads, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/leads/:id
 * @desc    Get lead by ID
 * @access  All roles (with access check)
 */
const getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('convertedBy', 'name email')
      .populate('convertedCustomer', 'name email')
      .populate('convertedDeal', 'dealName stage');

    if (!lead) throw new NotFoundError('Lead not found');

    // Sales executive can only see their assigned leads
    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      lead.assignedTo?._id?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have access to this lead');
    }

    return sendSuccess(res, 200, 'Lead fetched successfully', lead);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/leads/:id
 * @desc    Update lead
 * @access  All roles (with access check)
 */
const updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw new NotFoundError('Lead not found');

    // Access control
    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      lead.assignedTo?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have permission to update this lead');
    }

    if (lead.isConverted) {
      throw new BusinessLogicError('Cannot update a converted lead');
    }

    const prevValues = { status: lead.status, priority: lead.priority };
    const allowedFields = ['name', 'email', 'phone', 'company', 'source', 'description', 'priority'];

    // Managers and admins can also update status
    if (req.user.role !== ROLES.SALES_EXECUTIVE) {
      allowedFields.push('status');
    }

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Lead.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    // Timeline entries for significant changes
    const timelinePromises = [];

    if (updates.status && updates.status !== prevValues.status) {
      timelinePromises.push(
        createTimelineEntry({
          action: 'lead_status_changed',
          entityType: 'Lead',
          entityId: lead._id,
          performedBy: req.user._id,
          previousValue: prevValues.status,
          newValue: updates.status,
          description: `Lead status changed from "${prevValues.status}" to "${updates.status}"`,
        })
      );
    }

    if (updates.priority && updates.priority !== prevValues.priority) {
      timelinePromises.push(
        createTimelineEntry({
          action: 'lead_priority_changed',
          entityType: 'Lead',
          entityId: lead._id,
          performedBy: req.user._id,
          previousValue: prevValues.priority,
          newValue: updates.priority,
          description: `Lead priority changed from "${prevValues.priority}" to "${updates.priority}"`,
        })
      );
    }

    if (timelinePromises.length > 0) {
      await Promise.all(timelinePromises);
    }

    return sendSuccess(res, 200, 'Lead updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/leads/:id/status
 * @desc    Update lead status only
 * @access  Admin, Sales Manager
 */
const updateLeadStatus = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw new NotFoundError('Lead not found');

    if (lead.isConverted) {
      throw new BusinessLogicError('Cannot change status of a converted lead');
    }

    const prevStatus = lead.status;
    const newStatus = req.body.status;

    if (prevStatus === newStatus) {
      return sendSuccess(res, 200, 'Lead status is already set to this value', lead);
    }

    lead.status = newStatus;
    await lead.save();

    await createTimelineEntry({
      action: 'lead_status_changed',
      entityType: 'Lead',
      entityId: lead._id,
      performedBy: req.user._id,
      previousValue: prevStatus,
      newValue: newStatus,
      description: `Lead status changed from "${prevStatus}" to "${newStatus}"`,
    });

    return sendSuccess(res, 200, 'Lead status updated successfully', lead);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PATCH /api/leads/:id/assign
 * @desc    Assign/reassign lead to a sales executive
 * @access  Admin, Sales Manager
 */
const assignLead = async (req, res, next) => {
  try {
    const { assignedTo } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw new NotFoundError('Lead not found');

    // Validate assignee
    const assignee = await User.findById(assignedTo);
    if (!assignee) throw new NotFoundError('Assignee user not found');
    if (!assignee.isActive) throw new BusinessLogicError('Cannot assign lead to an inactive user');
    if (assignee.role !== ROLES.SALES_EXECUTIVE) {
      throw new BusinessLogicError('Leads can only be assigned to Sales Executives');
    }

    const prevAssignedTo = lead.assignedTo;
    const action = prevAssignedTo ? 'lead_reassigned' : 'lead_assigned';

    lead.assignedTo = assignedTo;
    await lead.save();

    await createTimelineEntry({
      action,
      entityType: 'Lead',
      entityId: lead._id,
      performedBy: req.user._id,
      previousValue: prevAssignedTo,
      newValue: assignedTo,
      description: `Lead ${prevAssignedTo ? 're' : ''}assigned to "${assignee.name}"`,
    });

    const populated = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 200, `Lead ${prevAssignedTo ? 're' : ''}assigned successfully`, populated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/leads/:id/convert
 * @desc    Convert a qualified lead to customer + deal
 * @access  All roles (with access check)
 */
const convertLead = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const lead = await Lead.findById(req.params.id).session(session);
    if (!lead) throw new NotFoundError('Lead not found');

    // Access check
    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      lead.assignedTo?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have access to convert this lead');
    }

    // Eligibility checks
    if (lead.isConverted) {
      throw new BusinessLogicError('This lead has already been converted');
    }

    if (lead.status !== 'Qualified') {
      throw new BusinessLogicError(`Only "Qualified" leads can be converted. Current status: "${lead.status}"`);
    }

    const { dealName, dealValue, probability, expectedClosingDate } = req.body;

    // Create Customer
    const customer = new Customer({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      originalLead: lead._id,
      assignedTo: lead.assignedTo,
      createdBy: req.user._id,
    });
    await customer.save({ session });

    // Create Deal
    const deal = new Deal({
      dealName,
      dealValue,
      probability: probability || 50,
      expectedClosingDate,
      lead: lead._id,
      customer: customer._id,
      assignedTo: lead.assignedTo,
      createdBy: req.user._id,
      stage: 'Qualification',
    });
    await deal.save({ session });

    // Update Lead
    lead.isConverted = true;
    lead.status = 'Converted';
    lead.convertedAt = new Date();
    lead.convertedBy = req.user._id;
    lead.convertedCustomer = customer._id;
    lead.convertedDeal = deal._id;
    await lead.save({ session });

    // Timeline entries (bulk)
    const now = new Date();
    await mongoose.model('Timeline').insertMany(
      [
        {
          action: 'lead_converted',
          entityType: 'Lead',
          entityId: lead._id,
          performedBy: req.user._id,
          newValue: { customerId: customer._id, dealId: deal._id },
          description: `Lead "${lead.name}" converted to customer and deal`,
          createdAt: now,
          updatedAt: now,
        },
        {
          action: 'customer_created',
          entityType: 'Customer',
          entityId: customer._id,
          performedBy: req.user._id,
          newValue: { name: customer.name },
          description: `Customer "${customer.name}" created from lead conversion`,
          createdAt: now,
          updatedAt: now,
        },
        {
          action: 'deal_created',
          entityType: 'Deal',
          entityId: deal._id,
          performedBy: req.user._id,
          newValue: { dealName, dealValue, stage: 'Qualification' },
          description: `Deal "${dealName}" created from lead conversion`,
          createdAt: now,
          updatedAt: now,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return sendSuccess(res, 200, 'Lead converted successfully', {
      lead: { _id: lead._id, name: lead.name, status: lead.status, isConverted: lead.isConverted },
      customer,
      deal,
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete lead (Admin/Manager)
 * @access  Admin, Sales Manager
 */
const deleteLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) throw new NotFoundError('Lead not found');

    if (lead.isConverted) {
      throw new BusinessLogicError('Cannot delete a converted lead. Archive it instead.');
    }

    await Lead.findByIdAndDelete(req.params.id);

    return sendSuccess(res, 200, 'Lead deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  assignLead,
  convertLead,
  deleteLead,
};
