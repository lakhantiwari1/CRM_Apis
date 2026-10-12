const express = require('express');
const router = express.Router();
const {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  completeActivity,
  deleteActivity,
} = require('../controllers/activity.controller');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly, managerAndAbove, allRoles } = require('../middleware/authorize');
const { createActivityValidator, updateActivityValidator } = require('../validators/activity.validator');
const { mongoIdValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.post('/', allRoles, createActivityValidator, validate, createActivity);
router.get('/', allRoles, getActivities);
router.get('/:id', allRoles, mongoIdValidator('id'), validate, getActivityById);
router.put('/:id', allRoles, updateActivityValidator, validate, updateActivity);
router.patch('/:id/complete', allRoles, mongoIdValidator('id'), validate, completeActivity);
router.delete('/:id', managerAndAbove, mongoIdValidator('id'), validate, deleteActivity);

module.exports = router;
