/**
 * Përcaktimi i faqesh dhe menysë sipas role (admin / client).
 * Chatbot ON/OFF ridrejton te Kanale; Përgjigje manuale ridrejton te Inbox.
 * Profili im është faqja e vërtetë e profilit (emër, email, fjalëkalim).
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
  { path: '/app/business', label: 'Biznesi im', role: 'client' },
  { path: '/app/channels', label: 'Kanale', role: 'client' },
  { path: '/app/inbox', label: 'Inbox', role: 'client' },
  { path: '/app/contacts', label: 'Kontaktet', role: 'client' },
  { path: '/app/automation', label: 'Automatikë', role: 'client' },
  { path: '/app/keyword-responses', label: 'Përgjigje me fjalë kyçe', role: 'client' },
  { path: '/app/settings', label: 'Cilësime', role: 'client' },
  { path: '/app/statistics', label: 'Statistika', role: 'client' },
  { path: '/app/chatbot', label: 'Chatbot ON/OFF', role: 'client' },
  { path: '/app/feedback', label: 'Feedback & Cilësi', role: 'client' },
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
