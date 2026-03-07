import { useLocation } from 'react-router-dom';

const PATH_TITLES: Record<string, string> = {
  '/profile': 'Profili im',
  '/channels': 'Kanale',
  '/inbox': 'Inbox',
  '/settings': 'Cilësime',
  '/automation': 'Automatikë',
  '/keyword-responses': 'Përgjigje me fjalëkyç',
  '/chatbot': 'Chatbot ON/OFF',
  '/manual-reply': 'Përgjigje manuale',
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
