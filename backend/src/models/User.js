const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [80, 'Name too long'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password_hash: {
    type: String,
    required: true,
    select: false,
  },
  university: {
    type: String,
    trim: true,
    default: '',
  },
  campus: {
    type: String,
    trim: true,
    default: '',
  },
  intake_year: {
    type: Number,
    default: null,
  },
  course: {
    type: String,
    trim: true,
    default: '',
  },
  city: {
    type: String,
    trim: true,
    default: '',
  },
  country: {
    type: String,
    trim: true,
    default: '',
  },
  interests: {
    type: [String],
    default: [],
  },
  bio: {
    type: String,
    maxlength: [300, 'Bio too long'],
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  // Privacy: email visible to connections only
  showEmailToConnections: {
    type: Boolean,
    default: false,
  },
  // Contact info — only revealed to accepted connections
  contact_info: {
    phone:     { type: String, trim: true, default: '' },
    whatsapp:  { type: String, trim: true, default: '' },
    instagram: { type: String, trim: true, default: '' },
    linkedin:  { type: String, trim: true, default: '' },
    telegram:  { type: String, trim: true, default: '' },
    other:     { type: String, trim: true, default: '' },
  },
  blocked_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reported_users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Daily request rate limiting
  daily_requests: {
    count: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
  },
  emailNotifications: {
    type: Boolean,
    default: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password_hash')) return next();
  this.password_hash = await bcrypt.hash(this.password_hash, 12);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password_hash);
};

// Reset daily count if it's a new day
userSchema.methods.canSendRequest = function () {
  const today = new Date();
  const lastDate = new Date(this.daily_requests.date);
  const isSameDay =
    today.getFullYear() === lastDate.getFullYear() &&
    today.getMonth() === lastDate.getMonth() &&
    today.getDate() === lastDate.getDate();

  if (!isSameDay) {
    this.daily_requests.count = 0;
    this.daily_requests.date = today;
  }

  const MAX = parseInt(process.env.MAX_REQUESTS_PER_DAY) || 10;
  return this.daily_requests.count < MAX;
};

userSchema.methods.incrementDailyRequests = async function () {
  const today = new Date();
  const lastDate = new Date(this.daily_requests.date);
  const isSameDay =
    today.getFullYear() === lastDate.getFullYear() &&
    today.getMonth() === lastDate.getMonth() &&
    today.getDate() === lastDate.getDate();

  if (!isSameDay) {
    this.daily_requests.count = 1;
    this.daily_requests.date = today;
  } else {
    this.daily_requests.count += 1;
  }
  await this.save();
};

module.exports = mongoose.model('User', userSchema);
