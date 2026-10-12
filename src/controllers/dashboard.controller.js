const { Lead } = require('../models/Lead');
const { Customer } = require('../models/Customer');
const { Deal, DEAL_STAGES } = require('../models/Deal');
const { Activity } = require('../models/Activity');
const { User, ROLES } = require('../models/User');
const { sendSuccess } = require('../utils/response');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get overall CRM statistics
 * @access  All roles
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const user = req.user;

    // Build base filters for role-based access
    const leadFilter = user.role === ROLES.SALES_EXECUTIVE ? { assignedTo: user._id } : {};
    const dealFilter = user.role === ROLES.SALES_EXECUTIVE ? { assignedTo: user._id } : {};
    const activityFilter = user.role === ROLES.SALES_EXECUTIVE ? { assignedTo: user._id } : {};

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      totalCustomers,
      totalDeals,
      openDeals,
      wonDeals,
      lostDeals,
      pendingActivities,
      overdueActivities,
      revenueAgg,
      expectedRevenueAgg,
    ] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Lead.countDocuments({ ...leadFilter, status: 'New' }),
      Lead.countDocuments({ ...leadFilter, status: 'Qualified' }),
      Lead.countDocuments({ ...leadFilter, isConverted: true }),
      Lead.countDocuments({ ...leadFilter, status: 'Lost' }),
      Customer.countDocuments(user.role === ROLES.SALES_EXECUTIVE ? { assignedTo: user._id } : {}),
      Deal.countDocuments(dealFilter),
      Deal.countDocuments({ ...dealFilter, isClosed: false }),
      Deal.countDocuments({ ...dealFilter, stage: 'Won' }),
      Deal.countDocuments({ ...dealFilter, stage: 'Lost' }),
      Activity.countDocuments({ ...activityFilter, status: 'Pending' }),
      Activity.countDocuments({ ...activityFilter, status: 'Overdue' }),
      Deal.aggregate([
        { $match: { ...dealFilter, stage: 'Won' } },
        { $group: { _id: null, totalRevenue: { $sum: '$dealValue' } } },
      ]),
      Deal.aggregate([
        { $match: { ...dealFilter, isClosed: false } },
        { $group: { _id: null, expectedRevenue: { $sum: '$expectedRevenue' } } },
      ]),
    ]);

    const conversionRate =
      totalLeads > 0 ? parseFloat(((convertedLeads / totalLeads) * 100).toFixed(2)) : 0;

    const stats = {
      leads: {
        total: totalLeads,
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        lost: lostLeads,
        conversionRate: `${conversionRate}%`,
      },
      customers: {
        total: totalCustomers,
      },
      deals: {
        total: totalDeals,
        open: openDeals,
        won: wonDeals,
        lost: lostDeals,
        totalRevenue: revenueAgg[0]?.totalRevenue || 0,
        expectedRevenue: expectedRevenueAgg[0]?.expectedRevenue || 0,
      },
      activities: {
        pending: pendingActivities,
        overdue: overdueActivities,
      },
    };

    return sendSuccess(res, 200, 'Dashboard statistics fetched successfully', stats);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/dashboard/pipeline
 * @desc    Get sales pipeline by stage
 * @access  All roles
 */
const getSalesPipeline = async (req, res, next) => {
  try {
    const matchFilter =
      req.user.role === ROLES.SALES_EXECUTIVE ? { assignedTo: req.user._id } : {};

    const pipeline = await Deal.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$dealValue' },
          expectedRevenue: { $sum: '$expectedRevenue' },
          avgProbability: { $avg: '$probability' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill missing stages with zero values
    const stageOrder = DEAL_STAGES;
    const pipelineMap = {};
    pipeline.forEach((p) => {
      pipelineMap[p._id] = p;
    });

    const fullPipeline = stageOrder.map((stage) => ({
      stage,
      count: pipelineMap[stage]?.count || 0,
      totalValue: pipelineMap[stage]?.totalValue || 0,
      expectedRevenue: pipelineMap[stage]?.expectedRevenue || 0,
      avgProbability: parseFloat((pipelineMap[stage]?.avgProbability || 0).toFixed(2)),
    }));

    return sendSuccess(res, 200, 'Sales pipeline fetched successfully', fullPipeline);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/dashboard/team-performance
 * @desc    Get team performance metrics (Admin/Manager)
 * @access  Admin, Sales Manager
 */
const getTeamPerformance = async (req, res, next) => {
  try {
    const [leadsPerUser, dealsPerUser, activitiesPerUser] = await Promise.all([
      // Leads assigned per user
      Lead.aggregate([
        { $match: { assignedTo: { $exists: true } } },
        {
          $group: {
            _id: '$assignedTo',
            totalLeads: { $sum: 1 },
            qualifiedLeads: { $sum: { $cond: [{ $eq: ['$status', 'Qualified'] }, 1, 0] } },
            convertedLeads: { $sum: { $cond: ['$isConverted', 1, 0] } },
            lostLeads: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            name: '$user.name',
            email: '$user.email',
            role: '$user.role',
            totalLeads: 1,
            qualifiedLeads: 1,
            convertedLeads: 1,
            lostLeads: 1,
          },
        },
      ]),

      // Deals per user
      Deal.aggregate([
        { $match: { assignedTo: { $exists: true } } },
        {
          $group: {
            _id: '$assignedTo',
            totalDeals: { $sum: 1 },
            wonDeals: { $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, 1, 0] } },
            lostDeals: { $sum: { $cond: [{ $eq: ['$stage', 'Lost'] }, 1, 0] } },
            totalRevenue: { $sum: { $cond: [{ $eq: ['$stage', 'Won'] }, '$dealValue', 0] } },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            totalDeals: 1,
            wonDeals: 1,
            lostDeals: 1,
            totalRevenue: 1,
          },
        },
      ]),

      // Activities per user
      Activity.aggregate([
        { $match: { assignedTo: { $exists: true } } },
        {
          $group: {
            _id: '$assignedTo',
            totalActivities: { $sum: 1 },
            completedActivities: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
            overdueActivities: { $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    // Merge results by userId
    const performanceMap = {};
    leadsPerUser.forEach((l) => {
      performanceMap[l.userId] = { ...l };
    });
    dealsPerUser.forEach((d) => {
      if (performanceMap[d.userId]) {
        Object.assign(performanceMap[d.userId], d);
      }
    });
    activitiesPerUser.forEach((a) => {
      const key = a._id.toString();
      if (performanceMap[key]) {
        performanceMap[key].totalActivities = a.totalActivities;
        performanceMap[key].completedActivities = a.completedActivities;
        performanceMap[key].overdueActivities = a.overdueActivities;
      }
    });

    const performance = Object.values(performanceMap);

    return sendSuccess(res, 200, 'Team performance fetched successfully', performance);
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/dashboard/lead-sources
 * @desc    Get leads grouped by source
 * @access  Admin, Sales Manager
 */
const getLeadsBySource = async (req, res, next) => {
  try {
    const matchFilter =
      req.user.role === ROLES.SALES_EXECUTIVE ? { assignedTo: req.user._id } : {};

    const result = await Lead.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          converted: { $sum: { $cond: ['$isConverted', 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          source: '$_id',
          count: 1,
          converted: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$count', 0] },
              { $multiply: [{ $divide: ['$converted', '$count'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return sendSuccess(res, 200, 'Lead sources statistics fetched successfully', result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getSalesPipeline,
  getTeamPerformance,
  getLeadsBySource,
};
