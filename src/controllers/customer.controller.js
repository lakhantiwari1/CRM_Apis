const { Customer } = require('../models/Customer');
const { User, ROLES } = require('../models/User');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { NotFoundError, AuthorizationError } = require('../utils/errors');
const { parsePagination, parseSort, parseDateRange } = require('../utils/queryBuilder');
const { createTimelineEntry } = require('../utils/timeline');

/**
 * Build customer filter based on role
 */
const buildCustomerFilter = (query, user) => {
  const filter = {};

  if (user.role === ROLES.SALES_EXECUTIVE) {
    filter.assignedTo = user._id;
  }

  if (query.status) filter.status = query.status;
  if (query.assignedTo && user.role !== ROLES.SALES_EXECUTIVE) {
    filter.assignedTo = query.assignedTo;
  }

  if (query.search) {
    filter.$or = [
      { name: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } },
      { company: { $regex: query.search, $options: 'i' } },
    ];
  }

  const dateFilter = parseDateRange(query);
  Object.assign(filter, dateFilter);

  return filter;
};

/**
 * @route   POST /api/customers
 * @desc    Create customer manually
 * @access  Admin, Sales Manager
 */
const createCustomer = async (req, res, next) => {
  try {
    const customerData = { ...req.body, createdBy: req.user._id };

    if (customerData.assignedTo) {
      const assignee = await User.findById(customerData.assignedTo);
      if (!assignee || !assignee.isActive) {
        return sendError(res, 400, 'Assigned user not found or inactive');
      }
    }

    const customer = await Customer.create(customerData);

    await createTimelineEntry({
      action: 'customer_created',
      entityType: 'Customer',
      entityId: customer._id,
      performedBy: req.user._id,
      newValue: { name: customer.name },
      description: `Customer "${customer.name}" created`,
    });

    const populated = await Customer.findById(customer._id)
      .populate('assignedTo', 'name email')
      .populate('originalLead', 'name status');

    return sendSuccess(res, 201, 'Customer created successfully', populated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/customers
 * @desc    Get all customers
 * @access  All roles (role filtered)
 */
const getCustomers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sort = parseSort(req.query);
    const filter = buildCustomerFilter(req.query, req.user);

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .populate('assignedTo', 'name email')
        .populate('originalLead', 'name status source')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Customer.countDocuments(filter),
    ]);

    return sendPaginated(res, 'Customers fetched successfully', customers, { page, limit, total });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/customers/:id
 * @desc    Get customer by ID
 * @access  All roles (with access check)
 */
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedTo', 'name email phone')
      .populate('originalLead', 'name email status source')
      .populate('createdBy', 'name email');

    if (!customer) throw new NotFoundError('Customer not found');

    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      customer.assignedTo?._id?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have access to this customer');
    }

    return sendSuccess(res, 200, 'Customer fetched successfully', customer);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/customers/:id
 * @desc    Update customer
 * @access  All roles (with access check)
 */
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw new NotFoundError('Customer not found');

    if (
      req.user.role === ROLES.SALES_EXECUTIVE &&
      customer.assignedTo?.toString() !== req.user._id.toString()
    ) {
      throw new AuthorizationError('You do not have permission to update this customer');
    }

    const updated = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('assignedTo', 'name email')
      .populate('originalLead', 'name status');

    await createTimelineEntry({
      action: 'customer_updated',
      entityType: 'Customer',
      entityId: customer._id,
      performedBy: req.user._id,
      description: `Customer "${customer.name}" updated`,
    });

    return sendSuccess(res, 200, 'Customer updated successfully', updated);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/customers/:id
 * @desc    Delete customer
 * @access  Admin only
 */
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) throw new NotFoundError('Customer not found');

    return sendSuccess(res, 200, 'Customer deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
