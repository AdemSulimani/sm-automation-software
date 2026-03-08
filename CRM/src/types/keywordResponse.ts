/**
 * Llojet për KeywordResponse – në përputhje me backend.
 */

export interface KeywordResponse {
  _id: string;
  channelId: string;
  keywords: string[];
  keywordRegex: string | null;
  responseText: string | null;
  responsePayload: { text?: string; [k: string]: unknown } | null;
  caseSensitive: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
