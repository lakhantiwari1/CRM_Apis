const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateMe,
  changePassword,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/authenticate');
const { registerValidator, loginValidator } = require('../validators/user.validator');
const { validate } = require('../middleware/validate');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

// Public routes
router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.post('/refresh', refreshToken);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.get('/me', getMe);
router.patch('/me', updateMe);
router.patch('/change-password', changePassword);

module.exports = router;
