const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getSalesPipeline,
  getTeamPerformance,
  getLeadsBySource,
} = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/authenticate');
const { managerAndAbove, allRoles } = require('../middleware/authorize');

router.use(authenticate);

router.get('/stats', allRoles, getDashboardStats);
router.get('/pipeline', allRoles, getSalesPipeline);
router.get('/team-performance', managerAndAbove, getTeamPerformance);
router.get('/lead-sources', allRoles, getLeadsBySource);

module.exports = router;
