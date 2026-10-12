const express = require('express');
const router = express.Router();
const {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  updateLeadStatus,
  assignLead,
  convertLead,
  deleteLead,
} = require('../controllers/lead.controller');
const { authenticate } = require('../middleware/authenticate');
const { managerAndAbove, allRoles } = require('../middleware/authorize');
const {
  createLeadValidator,
  updateLeadValidator,
  updateLeadStatusValidator,
  assignLeadValidator,
  convertLeadValidator,
} = require('../validators/lead.validator');
const { mongoIdValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// CRUD
router.post('/', allRoles, createLeadValidator, validate, createLead);
router.get('/', allRoles, getLeads);
router.get('/:id', allRoles, mongoIdValidator('id'), validate, getLeadById);
router.put('/:id', allRoles, updateLeadValidator, validate, updateLead);

// Status management (Admin + Manager)
router.patch('/:id/status', managerAndAbove, updateLeadStatusValidator, validate, updateLeadStatus);

// Assignment (Admin + Manager)
router.patch('/:id/assign', managerAndAbove, assignLeadValidator, validate, assignLead);

// Conversion (All roles — access check happens in controller)
router.post('/:id/convert', allRoles, convertLeadValidator, validate, convertLead);

// Delete (Admin + Manager)
router.delete('/:id', managerAndAbove, mongoIdValidator('id'), validate, deleteLead);

module.exports = router;
