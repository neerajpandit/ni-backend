const { Router } = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authRequired } = require('../middleware/auth.middleware');

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['student', 'organizer']).withMessage('Invalid role'),
    body('university').optional().trim(),
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  authController.login
);

router.get('/me', authRequired, authController.me);

module.exports = router;
