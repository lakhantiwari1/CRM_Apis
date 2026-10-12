const express = require('express');
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  activateUser,
  deactivateUser,
  deleteUser,
  getSalesExecutives,
} = require('../controllers/user.controller');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly, managerAndAbove } = require('../middleware/authorize');
const { registerValidator, updateUserValidator, mongoIdValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// Special routes
router.get('/sales-executives', managerAndAbove, getSalesExecutives);

// Admin-only routes
router.post('/', adminOnly, registerValidator, validate, createUser);
router.get('/', adminOnly, getUsers);
router.get('/:id', adminOnly, mongoIdValidator('id'), validate, getUserById);
router.put('/:id', adminOnly, updateUserValidator, validate, updateUser);
router.patch('/:id/activate', adminOnly, mongoIdValidator('id'), validate, activateUser);
router.patch('/:id/deactivate', adminOnly, mongoIdValidator('id'), validate, deactivateUser);
router.delete('/:id', adminOnly, mongoIdValidator('id'), validate, deleteUser);

module.exports = router;
