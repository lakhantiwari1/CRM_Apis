const { body, param } = require('express-validator');
const { ACTIVITY_TYPES, ACTIVITY_STATUSES, ENTITY_TYPES } = require('../models/Activity');

const createActivityValidator = [
  body('type')
    .notEmpty().withMessage('Activity type is required')
    .isIn(ACTIVITY_TYPES).withMessage(`Type must be one of: ${ACTIVITY_TYPES.join(', ')}`),

  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('assignedTo')
    .notEmpty().withMessage('Assigned user is required')
    .isMongoId().withMessage('Invalid user ID'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid date format for dueDate'),

  body('relatedEntityType')
    .optional()
    .isIn(ENTITY_TYPES).withMessage(`Entity type must be one of: ${ENTITY_TYPES.join(', ')}`),

  body('relatedEntityId')
    .optional()
    .isMongoId().withMessage('Invalid entity ID'),

  body('relatedEntityType')
    .if(body('relatedEntityId').exists({ checkFalsy: true }))
    .notEmpty().withMessage('relatedEntityType is required when relatedEntityId is provided'),
];

const updateActivityValidator = [
  param('id').isMongoId().withMessage('Invalid activity ID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Title must be between 2 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description cannot exceed 2000 characters'),

  body('assignedTo')
    .optional()
    .isMongoId().withMessage('Invalid user ID'),

  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid date format for dueDate'),

  body('status')
    .optional()
    .isIn(ACTIVITY_STATUSES).withMessage(`Status must be one of: ${ACTIVITY_STATUSES.join(', ')}`),
];

module.exports = { createActivityValidator, updateActivityValidator };
