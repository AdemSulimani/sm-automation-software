/**
 * Eksporti i të gjitha modeleve për import të përshtatshëm.
 */

const User = require('./User');
const Channel = require('./Channel');
const AutomationRule = require('./AutomationRule');
const KeywordResponse = require('./KeywordResponse');
const Conversation = require('./Conversation');
const Message = require('./Message');

module.exports = {
  User,
  Channel,
  AutomationRule,
  KeywordResponse,
  Conversation,
  Message,
};
