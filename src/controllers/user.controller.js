const User = require('../models/User.model');
const logger = require('../config/logger');
const { escapeRegex } = require('../utils/eventConflict');

async function listStudents(req, res) {
  try {
    const search = req.query.search?.trim();
    const filter = { role: 'student' };
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }
    const docs = await User.find(filter).sort({ createdAt: -1 }).limit(500).lean();

    const students = docs.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      university: u.university || '',
      role: u.role,
      createdAt: u.createdAt,
    }));

    res.json({ students });
  } catch (err) {
    logger.error(`user.listStudents: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to list students' });
  }
}

async function getStudentById(req, res) {
  try {
    const { studentId } = req.params;
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.role === 'student' && req.user.id === studentId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const u = await User.findById(studentId).lean();
    if (!u || u.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({
      student: {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        university: u.university || '',
        role: u.role,
        createdAt: u.createdAt,
      },
    });
  } catch (err) {
    logger.error(`user.getStudentById: ${err.message}`, err);
    res.status(500).json({ message: 'Failed to load student' });
  }
}

module.exports = { listStudents, getStudentById };
