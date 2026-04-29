const { Router } = require('express');
const { body } = require('express-validator');
const eventController = require('../controllers/event.controller');
const registrationController = require('../controllers/registration.controller');
const { authRequired, requireRoles } = require('../middleware/auth.middleware');

const router = Router();

router.get('/', eventController.list);

router.get('/mine', authRequired, requireRoles('organizer', 'admin'), eventController.listMine);

router.post(
  '/',
  authRequired,
  requireRoles('organizer', 'admin'),
  [
    body('title').trim().notEmpty(),
    body('venue').trim().notEmpty(),
    body('category').trim().notEmpty(),
  ],
  eventController.create
);

/** Organizer / admin — must be registered before generic `/:id` GET */
router.get('/:id/enrollments', authRequired, registrationController.listForEvent);

router.patch(
  '/:id',
  authRequired,
  requireRoles('organizer', 'admin'),
  eventController.update
);

router.get('/:id', eventController.optionalAuth, eventController.getById);

module.exports = router;
