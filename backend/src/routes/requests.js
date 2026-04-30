const express = require('express');
const { body, validationResult } = require('express-validator');
const Request = require('../models/Request');
const Connection = require('../models/Connection');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendConnectionRequestEmail, sendAcceptedEmail } = require('../utils/email');

const router = express.Router();

// POST /api/requests — send a connection request
router.post(
  '/',
  protect,
  [
    body('to_user').notEmpty().withMessage('Recipient is required'),
    body('intro_message').trim().notEmpty().withMessage('Intro message is required')
      .isLength({ max: 500 }).withMessage('Intro message too long (max 500 chars)'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { to_user, intro_message, tags = [] } = req.body;
      const fromUser = req.user;

      if (to_user === fromUser._id.toString()) {
        return res.status(400).json({ message: 'You cannot connect with yourself.' });
      }

      // Check target user exists
      const targetUser = await User.findById(to_user);
      if (!targetUser) return res.status(404).json({ message: 'User not found.' });

      // Check if blocked
      if (fromUser.blocked_users.some((id) => id.toString() === to_user)) {
        return res.status(403).json({ message: 'You have blocked this user.' });
      }
      if (targetUser.blocked_users.some((id) => id.toString() === fromUser._id.toString())) {
        return res.status(403).json({ message: 'This action is not allowed.' });
      }

      // Check already connected
      const alreadyConnected = await Connection.areConnected(fromUser._id, to_user);
      if (alreadyConnected) {
        return res.status(400).json({ message: 'You are already connected with this user.' });
      }

      // Check existing pending request
      const existingRequest = await Request.findOne({
        from_user: fromUser._id,
        to_user,
        status: 'pending',
      });
      if (existingRequest) {
        return res.status(400).json({ message: 'You already have a pending request to this user.' });
      }

      // Check daily rate limit
      const freshUser = await User.findById(fromUser._id);
      if (!freshUser.canSendRequest()) {
        return res.status(429).json({
          message: `Daily limit reached. You can send up to ${process.env.MAX_REQUESTS_PER_DAY || 10} requests per day.`,
        });
      }

      // Validate tags
      const validTags = ['accommodation', 'travel', 'same university', 'networking'];
      const filteredTags = (tags || []).filter((t) => validTags.includes(t));

      const request = await Request.create({
        from_user: fromUser._id,
        to_user,
        intro_message,
        tags: filteredTags,
      });

      await freshUser.incrementDailyRequests();

      // Send email notification if target has it enabled
      if (targetUser.emailNotifications) {
        sendConnectionRequestEmail({
          toEmail: targetUser.email,
          toName: targetUser.name,
          fromName: fromUser.name,
          introMessage: intro_message,
          requestId: request._id,
        });
      }

      res.status(201).json({ request, message: 'Connection request sent!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to send request.' });
    }
  }
);

// GET /api/requests/incoming — pending requests received
router.get('/incoming', protect, async (req, res) => {
  try {
    const requests = await Request.find({ to_user: req.user._id, status: 'pending' })
      .populate('from_user', 'name university course city country interests bio')
      .sort({ created_at: -1 });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch incoming requests.' });
  }
});

// GET /api/requests/outgoing — requests I sent
router.get('/outgoing', protect, async (req, res) => {
  try {
    const requests = await Request.find({ from_user: req.user._id })
      .populate('to_user', 'name university course city country interests bio')
      .sort({ created_at: -1 });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch outgoing requests.' });
  }
});

// PATCH /api/requests/:id/accept
router.patch('/:id/accept', protect, async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.id,
      to_user: req.user._id,
      status: 'pending',
    });

    if (!request) return res.status(404).json({ message: 'Request not found.' });

    request.status = 'accepted';
    await request.save();

    // Create connection
    await Connection.createConnection(request.from_user, request.to_user);

    // Notify the sender
    const fromUser = await User.findById(request.from_user);
    if (fromUser && fromUser.emailNotifications) {
      sendAcceptedEmail({
        toEmail: fromUser.email,
        toName: fromUser.name,
        acceptedByName: req.user.name,
      });
    }

    res.json({ message: 'Request accepted! You are now connected.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to accept request.' });
  }
});

// PATCH /api/requests/:id/reject
router.patch('/:id/reject', protect, async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.id,
      to_user: req.user._id,
      status: 'pending',
    });

    if (!request) return res.status(404).json({ message: 'Request not found.' });

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Request declined.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to reject request.' });
  }
});

// DELETE /api/requests/:id — withdraw a sent request
router.delete('/:id', protect, async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.id,
      from_user: req.user._id,
      status: 'pending',
    });

    if (!request) return res.status(404).json({ message: 'Request not found.' });

    await request.deleteOne();
    res.json({ message: 'Request withdrawn.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to withdraw request.' });
  }
});

module.exports = router;
