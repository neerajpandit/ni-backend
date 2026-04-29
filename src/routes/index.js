const { Router } = require('express');
const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');
const registrationRoutes = require('./registration.routes');
const adminRoutes = require('./admin.routes');
const userRoutes = require('./user.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
