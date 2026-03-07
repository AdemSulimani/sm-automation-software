/**
 * Llojet për AutomationRule – në përputhje me backend.
 */

export type AutomationTrigger = 'first_message' | 'after_X_min' | 'keyword_regex';
export type AutomationResponseType = 'text' | 'template';

export interface AutomationRule {
  _id: string;
  channelId: string;
  trigger: AutomationTrigger;
  triggerValue: number | null;
  triggerRegex: string | null;
  responseType: AutomationResponseType;
  responsePayload: { text?: string; [k: string]: unknown };
  priority: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  first_message: 'Mesazhi i parë',
  after_X_min: 'Pas X minutash',
  keyword_regex: 'Fjalë kyçe / regex',
};
