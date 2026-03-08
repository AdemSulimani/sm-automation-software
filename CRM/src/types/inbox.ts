/**
 * Llojet për Inbox – konversacione dhe mesazhe.
 */

export interface ConversationChannel {
  _id: string;
  name: string | null;
  platform: string;
}

export interface ConversationContact {
  _id: string;
  name: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface Conversation {
  _id: string;
  channelId: string | ConversationChannel;
  platformUserId: string;
  platformConversationId: string | null;
  lastMessageAt: string | null;
  metadata: Record<string, unknown>;
  contactId?: string | ConversationContact | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  direction: 'in' | 'out';
  content: { text?: string; [k: string]: unknown };
  timestamp: string;
  platformMessageId: string | null;
}

export interface ConversationWithMessages {
  conversation: Conversation;
  messages: Message[];
}
