const express = require('express');
const User = require('../models/User');
const Connection = require('../models/Connection');
const Request = require('../models/Request');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Escape regex special characters to prevent injection / errors
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── Scoring weights for smart matching ──────────────────────────────────────
const WEIGHTS = {
  same_university:  30,
  same_campus:      20,
  same_intake_year: 20,
  same_city:        15,
  same_country:     10,
  shared_interest:   5, // per shared interest, capped at 4
};

function scoreMatch(me, other) {
  let score = 0;
  const reasons = [];

  if (me.university && other.university &&
      me.university.toLowerCase() === other.university.toLowerCase()) {
    score += WEIGHTS.same_university;
    reasons.push('Same university');
  }
  if (me.campus && other.campus &&
      me.campus.toLowerCase() === other.campus.toLowerCase()) {
    score += WEIGHTS.same_campus;
    reasons.push('Same campus');
  }
  if (me.intake_year && other.intake_year && me.intake_year === other.intake_year) {
    score += WEIGHTS.same_intake_year;
    reasons.push('Same intake year');
  }
  if (me.city && other.city &&
      me.city.toLowerCase() === other.city.toLowerCase()) {
    score += WEIGHTS.same_city;
    reasons.push('Same city');
  }
  if (me.country && other.country &&
      me.country.toLowerCase() === other.country.toLowerCase()) {
    score += WEIGHTS.same_country;
    reasons.push('Same country');
  }
  const shared = (me.interests || []).filter((i) =>
    (other.interests || []).map((x) => x.toLowerCase()).includes(i.toLowerCase())
  );
  const cappedShared = shared.slice(0, 4);
  score += cappedShared.length * WEIGHTS.shared_interest;
  if (cappedShared.length > 0)
    reasons.push(`Shared interests: ${cappedShared.join(', ')}`);

  return { score, reasons };
}

// ── Shared helper: get IDs to exclude for a given user ──────────────────────
async function getExcludeIds(userId, blockedUsers = []) {
  const excludeIds = [userId.toString(), ...blockedUsers.map((b) => b.toString())];

  // Existing connections (bidirectional)
  const myConns = await Connection.find({ $or: [{ user1: userId }, { user2: userId }] });
  myConns.forEach((c) => {
    const other = c.user1.toString() === userId.toString() ? c.user2 : c.user1;
    excludeIds.push(other.toString());
  });

  // Any pending request — sent OR received
  const pendingReqs = await Request.find({
    $or: [{ from_user: userId }, { to_user: userId }],
    status: 'pending',
  }).select('from_user to_user');
  pendingReqs.forEach((r) => {
    const other = r.from_user.toString() === userId.toString() ? r.to_user : r.from_user;
    excludeIds.push(other.toString());
  });

  return [...new Set(excludeIds)]; // deduplicate
}

// GET /api/users/suggestions — smart matched suggestions
router.get('/suggestions', protect, async (req, res) => {
  try {
    const me = req.user;
    const excludeIds = await getExcludeIds(me._id, me.blocked_users);

    // Only fetch users with at least one matching attribute
    const orConditions = [];
    if (me.university)       orConditions.push({ university:  { $regex: `^${escapeRegex(me.university)}$`,  $options: 'i' } });
    if (me.campus)           orConditions.push({ campus:      { $regex: `^${escapeRegex(me.campus)}$`,      $options: 'i' } });
    if (me.city)             orConditions.push({ city:        { $regex: `^${escapeRegex(me.city)}$`,        $options: 'i' } });
    if (me.country)          orConditions.push({ country:     { $regex: `^${escapeRegex(me.country)}$`,     $options: 'i' } });
    if (me.intake_year)      orConditions.push({ intake_year: me.intake_year });
    if (me.interests?.length) orConditions.push({ interests:  { $in: me.interests } });

    const query = {
      _id:           { $nin: excludeIds },
      blocked_users: { $nin: [me._id] },
      ...(orConditions.length > 0 ? { $or: orConditions } : {}),
    };

    const candidates = await User.find(query)
      .select('name university campus intake_year course city country interests bio created_at')
      .limit(100)
      .lean();

    const scored = candidates
      .map((u) => ({ ...u, ...scoreMatch(me, u) }))
      .filter((u) => u.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    res.json({ suggestions: scored });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch suggestions.' });
  }
});

// GET /api/users/filter-options — distinct values for dropdowns
router.get('/filter-options', protect, async (req, res) => {
  try {
    const universities = await User.distinct('university',  { university:  { $ne: '' }   });
    const campuses     = await User.distinct('campus',      { campus:      { $ne: '' }   });
    const cities       = await User.distinct('city',        { city:        { $ne: '' }   });
    const countries    = await User.distinct('country',     { country:     { $ne: '' }   });
    const intakeYears  = await User.distinct('intake_year', { intake_year: { $ne: null } });
    const interests    = await User.distinct('interests');
    res.json({ universities, campuses, cities, countries, intakeYears, interests });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch filter options.' });
  }
});

// GET /api/users/connections — my accepted connections
router.get('/connections', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const connections = await Connection.find({
      $or: [{ user1: userId }, { user2: userId }],
    }).populate('user1 user2', 'name university campus intake_year course city country interests bio contact_info');

    const peers = connections.map((c) => {
      const other = c.user1._id.toString() === userId.toString() ? c.user2 : c.user1;
      return { ...other.toObject(), connectionId: c._id, connectedAt: c.created_at };
    });

    res.json({ connections: peers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch connections.' });
  }
});

// GET /api/users — discover users with filters (excludes connections + pending)
router.get('/', protect, async (req, res) => {
  try {
    const { university, campus, city, country, interests, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const excludeIds = await getExcludeIds(userId, req.user.blocked_users);

    const filter = {
      _id:           { $nin: excludeIds },
      blocked_users: { $nin: [userId] },
    };

    if (university) filter.university = { $regex: university, $options: 'i' };
    if (campus)     filter.campus     = { $regex: campus,     $options: 'i' };
    if (city)       filter.city       = { $regex: city,       $options: 'i' };
    if (country)    filter.country    = { $regex: country,    $options: 'i' };
    if (interests)  filter.interests  = { $in: interests.split(',').map((i) => i.trim()) };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('name university campus intake_year course city country interests bio created_at')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ created_at: -1 });

    res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

// GET /api/users/:id — public profile (contact info only for accepted connections)
router.get('/:id', protect, async (req, res) => {
  try {
    const userId     = req.params.id;
    const targetUser = await User.findById(userId).select(
      'name university campus intake_year course city country interests bio showEmailToConnections email contact_info created_at'
    );
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    const connected = await Connection.areConnected(req.user._id, userId);
    const profile   = targetUser.toObject();

    if (!connected) {
      delete profile.contact_info;
      delete profile.email;
    } else {
      if (!profile.showEmailToConnections) delete profile.email;
    }

    res.json({ user: profile, isConnected: connected });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch user.' });
  }
});

// POST /api/users/:id/block
router.post('/:id/block', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString())
      return res.status(400).json({ message: 'Cannot block yourself.' });

    // Add to blocked list
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blocked_users: targetId } });

    // Bug fix #2: Delete connection using canonical sorted order (same as areConnected)
    const [u1, u2] = [req.user._id.toString(), targetId].sort();
    await Connection.deleteOne({ user1: u1, user2: u2 });

    // Bug fix #17: Also remove any pending requests between the two users
    await Request.deleteMany({
      $or: [
        { from_user: req.user._id, to_user: targetId },
        { from_user: targetId,     to_user: req.user._id },
      ],
      status: 'pending',
    });

    res.json({ message: 'User blocked successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to block user.' });
  }
});

// POST /api/users/:id/report
router.post('/:id/report', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { reported_users: targetId } });
    res.json({ message: 'User reported. Our team will review this.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to report user.' });
  }
});

module.exports = router;
