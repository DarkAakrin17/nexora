const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  from_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  to_user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  intro_message: {
    type: String,
    required: [true, 'Intro message is required'],
    maxlength: [500, 'Intro message too long'],
    trim: true,
  },
  tags: {
    type: [String],
    enum: ['accommodation', 'travel', 'same university', 'networking'],
    default: [],
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  // Email notification token for accept/reject links
  action_token: {
    type: String,
    select: false,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

// Unique pending request per pair
requestSchema.index({ from_user: 1, to_user: 1, status: 1 });

requestSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Request', requestSchema);
