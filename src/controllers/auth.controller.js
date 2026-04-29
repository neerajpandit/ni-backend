const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User.model');
const logger = require('../config/logger');

function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

async function register(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { name, email, password, role = 'student', university } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      university,
    });

    const token = signToken(user);
    logger.info(`User registered: ${user.email} (${user.role})`);

    return res.status(201).json({
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    logger.error(`register error: ${err.message}`, err);
    return res.status(500).json({ message: 'Registration failed' });
  }
}

async function login(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user);
    logger.info(`User login: ${user.email}`);

    return res.json({
      token,
      user: user.toPublicJSON(),
    });
  } catch (err) {
    logger.error(`login error: ${err.message}`, err);
    return res.status(500).json({ message: 'Login failed' });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ user: user.toPublicJSON() });
  } catch (err) {
    logger.error(`me error: ${err.message}`, err);
    return res.status(500).json({ message: 'Failed to load profile' });
  }
}

module.exports = { register, login, me };
