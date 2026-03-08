/**
 * Kontrolleri për Business – profili i biznesit të përdoruesit (emër, logo).
 * GET /api/business/me: kthen biznesin; nëse përdoruesi nuk ka businessId, krijon një (lazy) dhe e lidh.
 * PATCH /api/business/me: përditëson emrin dhe/ose logon.
 */

const Business = require('../models/Business');
const User = require('../models/User');

/**
 * Kthen biznesin e përdoruesit. Nëse nuk ka, krijon një dhe e lidh me përdoruesin.
 */
const getMe = async (req, res, next) => {
  try {
    let user = await User.findById(req.userId).select('businessId name').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    let business = null;
    if (user.businessId) {
      business = await Business.findById(user.businessId).lean();
    }
    if (!business) {
      business = await Business.create({
        name: (user.name && user.name.trim()) ? `${user.name.trim()} – Biznes` : 'Biznesi im',
        logo: null,
      });
      await User.findByIdAndUpdate(req.userId, { $set: { businessId: business._id } });
      business = business.toObject ? business.toObject() : business;
    }
    res.json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
};

/**
 * Përditëson biznesin e përdoruesit (emër, logo). Vetëm nëse biznesi i përket përdoruesit.
 */
const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('businessId').lean();
    if (!user || !user.businessId) {
      return res.status(404).json({ success: false, message: 'Biznesi nuk u gjet. Hapni një herë faqen e biznesit.' });
    }
    const { name, logo, workHoursStart, workHoursEnd } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name && String(name).trim() ? String(name).trim() : 'Biznesi im';
    if (logo !== undefined) updates.logo = logo && String(logo).trim() ? String(logo).trim() : null;
    if (workHoursStart !== undefined) updates.workHoursStart = workHoursStart && String(workHoursStart).trim() ? String(workHoursStart).trim() : null;
    if (workHoursEnd !== undefined) updates.workHoursEnd = workHoursEnd && String(workHoursEnd).trim() ? String(workHoursEnd).trim() : null;
    const business = await Business.findByIdAndUpdate(user.businessId, updates, {
      new: true,
      runValidators: true,
    }).lean();
    if (!business) {
      return res.status(404).json({ success: false, message: 'Biznesi nuk u gjet.' });
    }
    res.json({ success: true, data: business });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMe, updateMe };
