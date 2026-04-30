const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema({
  user1: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  user2: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

// Ensure user1 < user2 (stored in canonical order to avoid duplicates)
connectionSchema.index({ user1: 1, user2: 1 }, { unique: true });

// Helper static: check if two users are connected
connectionSchema.statics.areConnected = async function (userA, userB) {
  const [u1, u2] = [userA, userB].map((id) => id.toString()).sort();
  const conn = await this.findOne({ user1: u1, user2: u2 });
  return !!conn;
};

connectionSchema.statics.createConnection = async function (userA, userB) {
  const [u1, u2] = [userA, userB].map((id) => id.toString()).sort();
  return this.findOneAndUpdate(
    { user1: u1, user2: u2 },
    { user1: u1, user2: u2 },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Connection', connectionSchema);
