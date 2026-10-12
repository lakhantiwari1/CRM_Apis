const { body, param } = require('express-validator');
const { DEAL_STAGES } = require('../models/Deal');

const createDealValidator = [
  body('dealName')
    .trim()
    .notEmpty().withMessage('Deal name is required')
    .isLength({ min: 2, max: 200 }).withMessage('Deal name must be between 2 and 200 characters'),

  body('customer')
    .notEmpty().withMessage('Customer is required')
    .isMongoId().withMessage('Invalid customer ID'),

  body('lead')
    .optional()
    .isMongoId().withMessage('Invalid lead ID'),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid assignedTo user ID'),

  body('dealValue')
    .notEmpty().withMessage('Deal value is required')
    .isFloat({ min: 0.01 }).withMessage('Deal value must be greater than zero'),

  body('probability')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),

  body('expectedClosingDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),

  body('stage')
    .optional()
    .isIn(DEAL_STAGES).withMessage(`Stage must be one of: ${DEAL_STAGES.join(', ')}`),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),
];

const updateDealValidator = [
  param('id').isMongoId().withMessage('Invalid deal ID'),

  body('dealName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Deal name must be between 2 and 200 characters'),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid assignedTo user ID'),

  body('dealValue')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('Deal value must be greater than zero'),

  body('probability')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('Probability must be between 0 and 100'),

  body('expectedClosingDate')
    .optional()
    .isISO8601().withMessage('Invalid date format'),

  body('stage')
    .optional()
    .isIn(DEAL_STAGES).withMessage(`Stage must be one of: ${DEAL_STAGES.join(', ')}`),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('lostReason')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Lost reason cannot exceed 500 characters'),
];

const updateDealStageValidator = [
  param('id').isMongoId().withMessage('Invalid deal ID'),

  body('stage')
    .notEmpty().withMessage('Stage is required')
    .isIn(DEAL_STAGES).withMessage(`Stage must be one of: ${DEAL_STAGES.join(', ')}`),

  body('lostReason')
    .if(body('stage').equals('Lost'))
    .notEmpty().withMessage('Lost reason is required when marking a deal as Lost')
    .isLength({ max: 500 }).withMessage('Lost reason cannot exceed 500 characters'),
];

module.exports = {
  createDealValidator,
  updateDealValidator,
  updateDealStageValidator,
};
