/**
 * Modeli User për të dhënat e përdoruesve.
 * Përfshin emër, email, fjalëkalim (të hash-uar) dhe të dhëna të tjera.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Emri është i detyrueshëm'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email është i detyrueshëm'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Fjalëkalimi është i detyrueshëm'],
      minlength: 6,
      select: false,
    },
    // Informacione për AI: përshkrimi i kompanisë, produkte, çmime, FAQ, etj. (default për të gjitha kanalet)
    companyInfo: {
      type: String,
      trim: true,
      default: '',
    },
    // Rol për ndarje admin / client: admin sheh të gjithë klientët dhe mund të “hyjë si” klient; client sheh vetëm të dhënat e veta.
    role: {
      type: String,
      enum: ['admin', 'client'],
      default: 'client',
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// Hash fjalëkalimin para ruajtjes
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Metodë për të krahasuar fjalëkalimin
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
