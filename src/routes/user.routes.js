const { Router } = require('express');
const userController = require('../controllers/user.controller');
const { authRequired, requireRoles } = require('../middleware/auth.middleware');

const router = Router();

router.get('/students', authRequired, requireRoles('admin'), userController.listStudents);

router.get('/students/:studentId', authRequired, userController.getStudentById);

module.exports = router;
