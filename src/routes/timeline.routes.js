const express = require('express');
const router = express.Router();
const { getEntityTimeline, getAllTimeline } = require('../controllers/timeline.controller');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly, allRoles } = require('../middleware/authorize');

router.use(authenticate);

// Get timeline for a specific entity
router.get('/:entityType/:entityId', allRoles, getEntityTimeline);

// Get all timeline (admin)
router.get('/', adminOnly, getAllTimeline);

module.exports = router;
