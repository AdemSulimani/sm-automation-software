/**
 * Llojet për AutomationRule – në përputhje me backend.
 */

export type AutomationTrigger = 'first_message' | 'after_X_min' | 'keyword_regex';
export type AutomationResponseType = 'text' | 'template';

export type AutomationTriggerSource = 'any' | 'dm' | 'comment' | 'button';

export interface AutomationRule {
  _id: string;
  channelId: string;
  trigger: AutomationTrigger;
  triggerValue: number | null;
  triggerRegex: string | null;
  triggerSource?: AutomationTriggerSource;
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

export const TRIGGER_SOURCE_LABELS: Record<AutomationTriggerSource, string> = {
  any: 'Çdo event',
  dm: 'Vetëm DM / mesazh',
  comment: 'Vetëm komente / story replies',
  button: 'Vetëm klikime butonash',
};
