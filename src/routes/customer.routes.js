const express = require('express');
const router = express.Router();
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customer.controller');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly, managerAndAbove, allRoles } = require('../middleware/authorize');
const { createCustomerValidator, updateCustomerValidator } = require('../validators/customer.validator');
const { mongoIdValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.post('/', managerAndAbove, createCustomerValidator, validate, createCustomer);
router.get('/', allRoles, getCustomers);
router.get('/:id', allRoles, mongoIdValidator('id'), validate, getCustomerById);
router.put('/:id', allRoles, updateCustomerValidator, validate, updateCustomer);
router.delete('/:id', adminOnly, mongoIdValidator('id'), validate, deleteCustomer);

module.exports = router;
