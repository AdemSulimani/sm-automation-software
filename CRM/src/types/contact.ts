/**
 * Llojet për Contact – në përputhje me backend.
 */

export interface Contact {
  _id: string;
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactIdentity {
  _id: string;
  contactId: string;
  channelId: string | { _id: string; name: string | null; platform: string };
  platformUserId: string;
}

export interface ContactDetail {
  contact: Contact;
  identities: ContactIdentity[];
  conversations: Array<{
    _id: string;
    channelId: string | { _id: string; name: string | null; platform: string };
    platformUserId: string;
    lastMessageAt: string | null;
  }>;
}
