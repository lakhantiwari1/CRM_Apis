const express = require('express');
const router = express.Router();
const {
  createDeal,
  getDeals,
  getDealById,
  updateDeal,
  updateDealStage,
  assignDeal,
  deleteDeal,
} = require('../controllers/deal.controller');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly, managerAndAbove, allRoles } = require('../middleware/authorize');
const { createDealValidator, updateDealValidator, updateDealStageValidator } = require('../validators/deal.validator');
const { mongoIdValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');
const { body } = require('express-validator');

router.use(authenticate);

router.post('/', allRoles, createDealValidator, validate, createDeal);
router.get('/', allRoles, getDeals);
router.get('/:id', allRoles, mongoIdValidator('id'), validate, getDealById);
router.put('/:id', allRoles, updateDealValidator, validate, updateDeal);
router.patch('/:id/stage', allRoles, updateDealStageValidator, validate, updateDealStage);
router.patch(
  '/:id/assign',
  managerAndAbove,
  [
    mongoIdValidator('id'),
    body('assignedTo').notEmpty().withMessage('assignedTo is required').isMongoId().withMessage('Invalid user ID'),
  ],
  validate,
  assignDeal
);
router.delete('/:id', adminOnly, mongoIdValidator('id'), validate, deleteDeal);

module.exports = router;
