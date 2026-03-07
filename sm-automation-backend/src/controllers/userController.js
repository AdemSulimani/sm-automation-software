/**
 * Kontrolleri për operacione admin mbi përdorues (lista e klientëve, etj.).
 * Të gjitha rrugët kërkojnë protect + requireAdmin.
 */

const User = require('../models/User');

/**
 * Listo të gjithë përdoruesit (vetëm admin). Kthen id, name, email, role (jo fjalëkalim).
 */
const listUsers = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('name email role createdAt companyInfo')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

/**
 * Merr një përdorues sipas id (vetëm admin). Për cilësimet e klientit.
 */
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * Përditëson një përdorues (vetëm admin). Fushat: companyInfo, name. Për “edit përgjigjet e chatbotit” të klientit.
 */
const updateUser = async (req, res, next) => {
  try {
    const { companyInfo, name } = req.body;
    const updates = {};
    if (companyInfo !== undefined) updates.companyInfo = companyInfo;
    if (name !== undefined) updates.name = name;
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .select('-password')
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Përdoruesi nuk u gjet.' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUser, updateUser };
