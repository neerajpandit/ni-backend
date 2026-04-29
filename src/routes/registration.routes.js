const { Router } = require('express');
const registrationController = require('../controllers/registration.controller');
const { authRequired, requireRoles } = require('../middleware/auth.middleware');

const router = Router();

router.post('/', authRequired, requireRoles('student'), registrationController.registerForEvent);

router.get('/mine', authRequired, registrationController.listMine);

module.exports = router;
