const express = require('express');
const Message = require('../models/Message');
const Connection = require('../models/Connection');
const { protect } = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:userId — get chat history with a connected user
router.get('/:userId', protect, async (req, res) => {
  try {
    const otherId = req.params.userId;
    const myId = req.user._id;

    // Verify connected
    const connected = await Connection.areConnected(myId, otherId);
    if (!connected) {
      return res.status(403).json({ message: 'You must be connected to view messages.' });
    }

    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId },
      ],
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Mark unread messages as seen
    await Message.updateMany(
      { sender: otherId, receiver: myId, seen: false },
      { $set: { seen: true } }
    );

    res.json({ messages: messages.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch messages.' });
  }
});

// GET /api/messages — get all conversations (last message per connection)
router.get('/', protect, async (req, res) => {
  try {
    const myId = req.user._id;

    // Get all connections
    const connections = await Connection.find({
      $or: [{ user1: myId }, { user2: myId }],
    }).populate('user1 user2', 'name university city country');

    const conversations = await Promise.all(
      connections.map(async (conn) => {
        const otherId = conn.user1._id.toString() === myId.toString() ? conn.user2._id : conn.user1._id;
        const otherUser = conn.user1._id.toString() === myId.toString() ? conn.user2 : conn.user1;

        const lastMessage = await Message.findOne({
          $or: [
            { sender: myId, receiver: otherId },
            { sender: otherId, receiver: myId },
          ],
        }).sort({ timestamp: -1 });

        const unreadCount = await Message.countDocuments({
          sender: otherId,
          receiver: myId,
          seen: false,
        });

        return {
          user: otherUser,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by last message timestamp
    conversations.sort((a, b) => {
      const ta = a.lastMessage?.timestamp || 0;
      const tb = b.lastMessage?.timestamp || 0;
      return new Date(tb) - new Date(ta);
    });

    res.json({ conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch conversations.' });
  }
});

module.exports = router;
