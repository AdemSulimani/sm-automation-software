/**
 * Kontrolleri për Contact – CRUD, listë, detaj me identitete dhe konversacione.
 * Klienti sheh vetëm kontaktet e veta (Contact.userId = req.userId); admin mund të filtrojë me userId.
 */

const Contact = require('../models/Contact');
const ContactIdentity = require('../models/ContactIdentity');
const Conversation = require('../models/Conversation');
const Channel = require('../models/Channel');

/**
 * Përcakton filter për listë: sipas businessId ose userId.
 */
async function getListFilter(req) {
  const { search } = req.query;
  let filter = {};
  if (req.user.role === 'admin' && req.query.userId) {
    const User = require('../models/User');
    const target = await User.findById(req.query.userId).select('businessId').lean();
    if (target && target.businessId) filter = { businessId: target.businessId };
    else filter = { userId: req.query.userId };
  } else if (req.user.businessId) {
    filter = { businessId: req.user.businessId };
  } else {
    filter = { userId: req.userId };
  }
  if (search && typeof search === 'string' && search.trim()) {
    const term = search.trim();
    filter.$or = [
      { name: new RegExp(term, 'i') },
      { email: new RegExp(term, 'i') },
      { phone: new RegExp(term, 'i') },
    ];
  }
  return filter;
}

/**
 * Listo kontaktet. Klienti: kontaktet e biznesit; admin: filtron me userId.
 */
const list = async (req, res, next) => {
  try {
    const filter = await getListFilter(req);
    const contacts = await Contact.find(filter).sort({ updatedAt: -1 }).lean();
    res.json({ success: true, data: contacts });
  } catch (err) {
    next(err);
  }
};

/**
 * Merr një kontakt me identitetet (channel + platformUserId) dhe konversacionet e lidhura.
 */
const getOne = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id).lean();
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Kontakti nuk u gjet.' });
    }
    const canAccess =
      req.user.role === 'admin' ||
      contact.userId.toString() === req.userId.toString() ||
      (contact.businessId && req.user.businessId && contact.businessId.toString() === req.user.businessId.toString());
    if (!canAccess) {
      return res.status(404).json({ success: false, message: 'Kontakti nuk u gjet.' });
    }
    const identities = await ContactIdentity.find({ contactId: contact._id })
      .populate('channelId', 'name platform')
      .lean();
    const conversations = await Conversation.find({ contactId: contact._id })
      .populate('channelId', 'name platform')
      .sort({ lastMessageAt: -1 })
      .lean();
    res.json({
      success: true,
      data: {
        contact,
        identities,
        conversations,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Krijon një kontakt (emër, email, telefon, shënime). userId dhe businessId nga përdoruesi.
 */
const create = async (req, res, next) => {
  try {
    const { name, email, phone, notes } = req.body;
    const contact = await Contact.create({
      userId: req.userId,
      businessId: req.user.businessId || null,
      name: name && String(name).trim() ? String(name).trim() : null,
      email: email && String(email).trim() ? String(email).trim() : null,
      phone: phone && String(phone).trim() ? String(phone).trim() : null,
      notes: notes && String(notes).trim() ? String(notes).trim() : '',
    });
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

/**
 * Përditëson kontaktin. Vetëm nëse i përket përdoruesit (ose admin).
 */
const update = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Kontakti nuk u gjet.' });
    }
    const canAccess =
      req.user.role === 'admin' ||
      contact.userId.toString() === req.userId.toString() ||
      (contact.businessId && req.user.businessId && contact.businessId.toString() === req.user.businessId.toString());
    if (!canAccess) {
      return res.status(404).json({ success: false, message: 'Kontakti nuk u gjet.' });
    }
    const { name, email, phone, notes } = req.body;
    if (name !== undefined) contact.name = name && String(name).trim() ? String(name).trim() : null;
    if (email !== undefined) contact.email = email && String(email).trim() ? String(email).trim() : null;
    if (phone !== undefined) contact.phone = phone && String(phone).trim() ? String(phone).trim() : null;
    if (notes !== undefined) contact.notes = notes && String(notes).trim() ? String(notes).trim() : '';
    await contact.save();
    res.json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

/**
 * Fshin kontaktin dhe identitetet e tij. Konversacionet mbeten por contactId bëhet null.
 */
const remove = async (req, res, next) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) {
      return res.status(404).json({ success: false, message: 'Kontakti nuk u gjet.' });
    }
    const canAccess =
      req.user.role === 'admin' ||
      contact.userId.toString() === req.userId.toString() ||
      (contact.businessId && req.user.businessId && contact.businessId.toString() === req.user.businessId.toString());
    if (!canAccess) {
      return res.status(404).json({ success: false, message: 'Kontakti nuk u gjet.' });
    }
    await ContactIdentity.deleteMany({ contactId: contact._id });
    await Conversation.updateMany({ contactId: contact._id }, { $set: { contactId: null } });
    await Contact.findByIdAndDelete(contact._id);
    res.json({ success: true, message: 'Kontakti u fshi.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { list, getOne, create, update, remove };
