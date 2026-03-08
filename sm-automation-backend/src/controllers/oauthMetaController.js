/**
 * Kontrolleri për OAuth Meta: start, callback, selection dhe krijimi i channel nga OAuth.
 */

const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const OAuthMetaSession = require('../models/OAuthMetaSession');
const Channel = require('../models/Channel');
const metaOAuthService = require('../services/metaOAuthService');
const { encrypt } = require('../services/tokenEncryption');

const JWT_SECRET = process.env.JWT_SECRET || 'sm-automation-secret';

/**
 * GET /api/oauth/meta/start?token=JWT
 * Verifikon JWT, krijon sesion me stateId, ridrejton te Meta Login.
 */
async function start(req, res, next) {
  try {
    const token = req.query.token;
    if (!token) {
      return res.redirect(
        metaOAuthService.getAppConfig().frontendUrl + '/app/channels?oauth_error=missing_token'
      );
    }
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.redirect(
        metaOAuthService.getAppConfig().frontendUrl + '/app/channels?oauth_error=invalid_token'
      );
    }
    const userId = decoded.id;
    if (!userId) {
      return res.redirect(
        metaOAuthService.getAppConfig().frontendUrl + '/app/channels?oauth_error=invalid_token'
      );
    }
    const stateId = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await OAuthMetaSession.create({
      stateId,
      userId,
      expiresAt,
    });
    const authUrl = metaOAuthService.getAuthorizationUrl(stateId);
    res.redirect(302, authUrl);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/oauth/meta/callback?code=...&state=stateId
 * Meta ridrejton këtu. Shkëmben kodin, merr faqet/Instagram, ruan në sesion, ridrejton te frontend me key.
 */
async function callback(req, res, next) {
  const { frontendUrl } = metaOAuthService.getAppConfig();
  try {
    const { code, state: stateId } = req.query;
    const errorRedirect = (msg) =>
      res.redirect(302, `${frontendUrl}/app/channels?oauth_error=${encodeURIComponent(msg)}`);
    if (!code || !stateId) {
      return errorRedirect('missing_code_or_state');
    }
    const session = await OAuthMetaSession.findOne({
      stateId: String(stateId),
      expiresAt: { $gt: new Date() },
    }).exec();
    if (!session) {
      return errorRedirect('session_expired_or_invalid');
    }
    const accessToken = await metaOAuthService.exchangeCodeForToken(code);
    const { pages, instagram } = await metaOAuthService.fetchPagesAndInstagram(accessToken);
    const key = randomUUID();
    await OAuthMetaSession.findByIdAndUpdate(session._id, {
      key,
      pages: pages.map((p) => ({ id: p.id, name: p.name, accessToken: p.accessToken })),
      instagram: instagram.map((i) => ({
        id: i.id,
        username: i.username,
        pageId: i.pageId,
        pageName: i.pageName,
        accessToken: i.accessToken,
      })),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    res.redirect(302, `${frontendUrl}/app/channels?oauth=meta&key=${key}`);
  } catch (err) {
    console.error('OAuth Meta callback error:', err);
    const msg = err.message || 'oauth_failed';
    res.redirect(302, `${frontendUrl}/app/channels?oauth_error=${encodeURIComponent(msg)}`);
  }
}

/**
 * GET /api/oauth/meta/selection?key=...
 * Kërkesa duhet të ketë JWT. Kthen listën e faqeve dhe Instagram (pa tokena).
 */
async function selection(req, res, next) {
  try {
    const key = req.query.key;
    if (!key) {
      return res.status(400).json({ success: false, message: 'key është i detyrueshëm.' });
    }
    const session = await OAuthMetaSession.findOne({
      key: String(key),
      expiresAt: { $gt: new Date() },
    }).exec();
    if (!session) {
      return res.status(400).json({ success: false, message: 'Sesioni ka skaduar ose është i pavlefshëm.' });
    }
    if (session.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Nuk keni qasje në këtë sesion.' });
    }
    const pages = (session.pages || []).map((p) => ({ id: p.id, name: p.name }));
    const instagram = (session.instagram || []).map((i) => ({
      id: i.id,
      username: i.username,
      pageId: i.pageId,
      pageName: i.pageName,
    }));
    res.json({ success: true, data: { pages, instagram } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/channels/from-oauth (ose POST /api/oauth/meta/connect)
 * Body: { oauthKey, platform: 'facebook'|'instagram', platformPageId, name? }
 * Krijon një channel duke përdorur tokenin e ruajtur në sesion.
 */
async function createChannelFromOAuth(req, res, next) {
  try {
    const { oauthKey, platform, platformPageId, name } = req.body;
    if (!oauthKey || !platform || !platformPageId) {
      return res.status(400).json({
        success: false,
        message: 'oauthKey, platform dhe platformPageId janë të detyrueshme.',
      });
    }
    if (!['facebook', 'instagram'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Platforma duhet të jetë facebook ose instagram.',
      });
    }
    const session = await OAuthMetaSession.findOne({
      key: String(oauthKey),
      expiresAt: { $gt: new Date() },
    }).exec();
    if (!session) {
      return res.status(400).json({
        success: false,
        message: 'Sesioni OAuth ka skaduar. Filloni përsëri lidhjen.',
      });
    }
    if (session.userId.toString() !== req.userId.toString()) {
      return res.status(403).json({ success: false, message: 'Nuk keni qasje.' });
    }
    let accessToken = null;
    if (platform === 'facebook') {
      const page = (session.pages || []).find((p) => p.id === platformPageId);
      if (!page) {
        return res.status(400).json({ success: false, message: 'Faqja nuk u gjet në sesion.' });
      }
      accessToken = page.accessToken;
    } else {
      const ig = (session.instagram || []).find((i) => i.id === platformPageId);
      if (!ig) {
        return res.status(400).json({ success: false, message: 'Llogaria Instagram nuk u gjet në sesion.' });
      }
      accessToken = ig.accessToken;
    }
    const existing = await Channel.findOne({
      userId: req.userId,
      platform,
      platformPageId: String(platformPageId),
    }).exec();
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Ky kanal është i lidhur tashmë.',
      });
    }
    const channel = await Channel.create({
      userId: req.userId,
      businessId: req.user.businessId || null,
      platform,
      platformPageId: String(platformPageId),
      viberBotId: null,
      accessToken: encrypt(accessToken),
      webhookVerifyToken: null,
      status: 'active',
      name: name && String(name).trim() ? String(name).trim() : null,
      aiInstructions: '',
    });
    const data = channel.toObject();
    data.accessToken = '***';
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  start,
  callback,
  selection,
  createChannelFromOAuth,
};
