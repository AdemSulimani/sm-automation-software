import { useLocation } from 'react-router-dom';

const PATH_TITLES: Record<string, string> = {
  '/app/profile': 'Profili im',
  '/app/channels': 'Kanale',
  '/app/inbox': 'Inbox',
  '/app/settings': 'Cilësime',
  '/app/automation': 'Automatikë',
  '/app/keyword-responses': 'Përgjigje me fjalëkyç',
  '/app/chatbot': 'Chatbot ON/OFF',
  '/app/manual-reply': 'Përgjigje manuale',
};

/**
 * Faqe placeholder për rrugët që do të implementohen më vonë.
 */
export function Placeholder() {
  const { pathname } = useLocation();
  const title = PATH_TITLES[pathname] ?? 'Faqe';
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>Kjo faqe është në ndërtim.</p>
    </div>
  );
}
