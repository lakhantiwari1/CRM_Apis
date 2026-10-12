const { body, param } = require('express-validator');
const { CUSTOMER_STATUSES } = require('../models/Customer');

const createCustomerValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Customer name is required')
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

  body('status')
    .optional()
    .isIn(CUSTOMER_STATUSES).withMessage(`Status must be one of: ${CUSTOMER_STATUSES.join(', ')}`),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid assignedTo user ID'),

  body('address')
    .optional()
    .isObject().withMessage('Address must be an object'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters'),
];

const updateCustomerValidator = [
  param('id').isMongoId().withMessage('Invalid customer ID'),

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

  body('status')
    .optional()
    .isIn(CUSTOMER_STATUSES).withMessage(`Status must be one of: ${CUSTOMER_STATUSES.join(', ')}`),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid assignedTo user ID'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Notes cannot exceed 2000 characters'),
];

module.exports = { createCustomerValidator, updateCustomerValidator };
