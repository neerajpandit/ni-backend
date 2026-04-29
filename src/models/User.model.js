const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['student', 'organizer', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'student' },
    university: { type: String, trim: true },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
};

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    university: this.university || undefined,
    isLoggedIn: true,
  };
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
