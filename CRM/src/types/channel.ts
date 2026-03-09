/**
 * Llojet për Channel – në përputhje me backend (platform enum).
 */

export type ChannelPlatform = 'instagram' | 'facebook' | 'whatsapp' | 'viber';
export type ChannelStatus = 'active' | 'inactive' | 'pending' | 'throttled' | 'suspended';
export type ChannelTokenStatus = 'valid' | 'invalid' | 'needs_reconnect';

export interface Channel {
  _id: string;
  userId: string;
  platform: ChannelPlatform;
  platformPageId: string | null;
  viberBotId: string | null;
  accessToken?: string; // backend e fsheh ose e maskon si ***
  webhookVerifyToken: string | null;
  status: ChannelStatus;
  tokenStatus?: ChannelTokenStatus;
  name: string | null;
  aiInstructions: string;
  createdAt: string;
  updatedAt: string;
}

export const CHANNEL_PLATFORM_LABELS: Record<ChannelPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
};

export const CHANNEL_STATUS_LABELS: Record<ChannelStatus, string> = {
  active: 'Aktiv',
  inactive: 'Jo aktiv',
  pending: 'Në pritje',
  throttled: 'I kufizuar (rate limit / risk)',
  suspended: 'I pezulluar',
};
