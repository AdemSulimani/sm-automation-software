/**
 * Përcaktimi i faqesh dhe menysë sipas role (admin / client).
 * Admin: Paneli, Klientët, Inbox, Kanale, Automation, Settings, Chatbot ON/OFF, Përgjigje manuale.
 * Client: Paneli, Profili im, Kanale, Inbox, Automation, Settings, Chatbot ON/OFF (asnjë link "Klientët").
 */

export type UserRole = 'admin' | 'client';

export interface NavItem {
  path: string;
  label: string;
  /** 'admin' = vetëm admin; 'client' = admin dhe client */
  role: UserRole;
}

/** Rrugët e panelit (nën /app). Radhitja e menysë: së pari faqet e përbashkëta, pastaj vetëm admin. */
export const navItems: NavItem[] = [
  // Të dyja rolet
  { path: '/app', label: 'Paneli', role: 'client' },
  { path: '/app/profile', label: 'Profili im', role: 'client' },
  { path: '/app/channels', label: 'Kanale', role: 'client' },
  { path: '/app/inbox', label: 'Inbox', role: 'client' },
  { path: '/app/automation', label: 'Automatikë', role: 'client' },
  { path: '/app/settings', label: 'Cilësime', role: 'client' },
  { path: '/app/chatbot', label: 'Chatbot ON/OFF', role: 'client' },
  // Vetëm admin
  { path: '/app/klientet', label: 'Klientët', role: 'admin' },
  { path: '/app/manual-reply', label: 'Përgjigje manuale', role: 'admin' },
];

/**
 * Kthen elementet e menysë që përdoruesi mund të shohë sipas role.
 * Klienti nuk sheh asnjëherë "Klientët" apo "Të gjithë përdoruesit".
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter((item) => item.role === 'client' || (item.role === 'admin' && role === 'admin'));
}
