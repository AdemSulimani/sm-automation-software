/**
 * Statistikat për dashboard (vetëm admin).
 */

const User = require('../models/User');
const Channel = require('../models/Channel');

const getStats = async (req, res, next) => {
  try {
    const [usersCount, channelsCount] = await Promise.all([
      User.countDocuments(),
      Channel.countDocuments(),
    ]);
    res.json({ success: true, data: { usersCount, channelsCount } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStats };
