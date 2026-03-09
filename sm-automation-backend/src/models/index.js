/**
 * Eksporti i të gjitha modeleve për import të përshtatshëm.
 */

const User = require('./User');
const Channel = require('./Channel');
const AutomationRule = require('./AutomationRule');
const KeywordResponse = require('./KeywordResponse');
const Conversation = require('./Conversation');
const Message = require('./Message');
const OAuthMetaSession = require('./OAuthMetaSession');
const Contact = require('./Contact');
const ContactIdentity = require('./ContactIdentity');
const Business = require('./Business');
const OutboundJob = require('./OutboundJob');

module.exports = {
  User,
  Business,
  Channel,
  AutomationRule,
  KeywordResponse,
  Conversation,
  Message,
  OAuthMetaSession,
  Contact,
  ContactIdentity,
  OutboundJob,
};
