const { body, param } = require('express-validator');
const { LEAD_SOURCES, LEAD_STATUSES, LEAD_PRIORITIES } = require('../models/Lead');

const createLeadValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Lead name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-().]{7,20}$/).withMessage('Please provide a valid phone number'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage('Company name cannot exceed 150 characters'),

  body('source')
    .optional()
    .isIn(LEAD_SOURCES).withMessage(`Source must be one of: ${LEAD_SOURCES.join(', ')}`),

  body('status')
    .optional()
    .isIn(LEAD_STATUSES).withMessage(`Status must be one of: ${LEAD_STATUSES.join(', ')}`),

  body('priority')
    .optional()
    .isIn(LEAD_PRIORITIES).withMessage(`Priority must be one of: ${LEAD_PRIORITIES.join(', ')}`),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid assignedTo user ID'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
];

const updateLeadValidator = [
  param('id').isMongoId().withMessage('Invalid lead ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[\d\s\-().]{7,20}$/).withMessage('Please provide a valid phone number'),

  body('company')
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage('Company name cannot exceed 150 characters'),

  body('source')
    .optional()
    .isIn(LEAD_SOURCES).withMessage(`Source must be one of: ${LEAD_SOURCES.join(', ')}`),

  body('status')
    .optional()
    .isIn(LEAD_STATUSES).withMessage(`Status must be one of: ${LEAD_STATUSES.join(', ')}`),

  body('priority')
    .optional()
    .isIn(LEAD_PRIORITIES).withMessage(`Priority must be one of: ${LEAD_PRIORITIES.join(', ')}`),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid assignedTo user ID'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
];

const updateLeadStatusValidator = [
  param('id').isMongoId().withMessage('Invalid lead ID'),

  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(LEAD_STATUSES).withMessage(`Status must be one of: ${LEAD_STATUSES.join(', ')}`),
];

const assignLeadValidator = [
  param('id').isMongoId().withMessage('Invalid lead ID'),

  body('assignedTo')
    .notEmpty().withMessage('assignedTo is required')
    .isMongoId().withMessage('Invalid user ID'),
];

const convertLeadValidator = [
  param('id').isMongoId().withMessage('Invalid lead ID'),

  body('dealName')
    .trim()
    .notEmpty().withMessage('Deal name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Deal name must be between 2 and 200 characters'),

  body('dealValue')
    .notEmpty().withMessage('Deal value is required')
    .isFloat({ min: 0.01 }).withMessage('Deal value must be greater than zero'),

  body('probability')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),

  body('expectedClosingDate')
    .optional()
    .isISO8601().withMessage('Invalid date format for expectedClosingDate'),
];

module.exports = {
  createLeadValidator,
  updateLeadValidator,
  updateLeadStatusValidator,
  assignLeadValidator,
  convertLeadValidator,
};
