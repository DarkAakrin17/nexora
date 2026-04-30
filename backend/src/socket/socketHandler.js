const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Connection = require('../models/Connection');

// Map userId -> Set of socket IDs (user can have multiple tabs)
const onlineUsers = new Map();

const setupSocket = (io) => {
  // Socket auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password_hash');
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`[Socket] User connected: ${userId}`);

    // Track online users
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for targeted notifications
    socket.join(userId);

    // Broadcast online status to connections
    broadcastOnlineStatus(io, userId, true);

    // Handle sending a message
    socket.on('send_message', async (data, callback) => {
      try {
        const { receiverId, message } = data;
        if (!receiverId || !message?.trim()) {
          return callback?.({ error: 'Invalid message data.' });
        }

        // Verify connection
        const connected = await Connection.areConnected(userId, receiverId);
        if (!connected) {
          return callback?.({ error: 'You must be connected to chat.' });
        }

        // Check blocked
        const receiver = await User.findById(receiverId);
        if (!receiver) return callback?.({ error: 'User not found.' });

        const savedMessage = await Message.create({
          sender: userId,
          receiver: receiverId,
          message: message.trim(),
        });

        const msgData = {
          _id: savedMessage._id,
          sender: userId,
          receiver: receiverId,
          message: savedMessage.message,
          timestamp: savedMessage.timestamp,
          seen: false,
        };

        // Send to receiver if online
        io.to(receiverId).emit('new_message', msgData);

        // Confirm back to sender
        callback?.({ success: true, message: msgData });
      } catch (err) {
        console.error('[Socket] send_message error:', err);
        callback?.({ error: 'Failed to send message.' });
      }
    });

    // Mark messages as seen
    socket.on('mark_seen', async ({ senderId }) => {
      try {
        await Message.updateMany(
          { sender: senderId, receiver: userId, seen: false },
          { $set: { seen: true } }
        );
        // Notify sender that messages were seen
        io.to(senderId).emit('messages_seen', { by: userId });
      } catch (err) {
        console.error('[Socket] mark_seen error:', err);
      }
    });

    // Typing indicators
    socket.on('typing', ({ receiverId, isTyping }) => {
      io.to(receiverId).emit('user_typing', { userId, isTyping });
    });

    // Get online status of a user
    socket.on('check_online', ({ userId: checkId }, callback) => {
      callback?.({ isOnline: onlineUsers.has(checkId) && onlineUsers.get(checkId).size > 0 });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${userId}`);
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          broadcastOnlineStatus(io, userId, false);
        }
      }
    });
  });
};

const broadcastOnlineStatus = async (io, userId, isOnline) => {
  try {
    const connections = await Connection.find({
      $or: [{ user1: userId }, { user2: userId }],
    });
    connections.forEach((conn) => {
      const otherId = conn.user1.toString() === userId ? conn.user2.toString() : conn.user1.toString();
      io.to(otherId).emit('user_online_status', { userId, isOnline });
    });
  } catch (err) {
    // Non-critical
  }
};

module.exports = setupSocket;
