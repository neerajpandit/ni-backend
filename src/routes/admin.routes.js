const { Router } = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/admin.controller');
const { authRequired, requireRoles } = require('../middleware/auth.middleware');

const router = Router();

router.use(authRequired, requireRoles('admin'));

router.get('/stats', adminController.stats);

router.get('/events/pending', adminController.pendingEvents);

router.get('/events', adminController.listAllEvents);

router.patch(
  '/events/:id/status',
  [body('status').isIn(['Approved', 'Rejected', 'Pending']).withMessage('Invalid status')],
  adminController.setEventStatus
);

module.exports = router;
