/**
 * Konfigurim për funksionalitetin e feedback-ut mbi mesazhet.
 * Këto vendime pasqyrojnë "hapin 1 – qartësimi i sjelljes":
 * - Kush mund të japë feedback
 * - Çfarë do të thotë "learning" në v1
 * - Çfarë entitetesh mund të vlerësohen (per mesazh / per bisedë)
 */

// Kush mund të japë feedback mbi bisedat.
// Aktualisht: klientët (bizneset) dhe admin mund të japin feedback.
// Nëse në të ardhmen shtohen role të tjera (p.sh. "agent"), mund të përditësohet ky listim.
const FEEDBACK_ALLOWED_ROLES = ['client', 'admin'];

// Niveli i "learning" për v1.
// - 'coaching_only'  -> feedback ruhet dhe shfaqet si coaching për përdoruesit (agjentët).
// - 'ai_and_coaching' -> feedback përdoret edhe si sinjal i strukturuar për AI (p.sh. në prompt / retrival).
const FEEDBACK_LEARNING_MODE = 'coaching_only';

// Çfarë mund të vlerësohet.
// Për v1 fokusohemi në "per mesazh". Mund të zgjerohet me 'conversation' më vonë.
const FEEDBACK_ALLOWED_TARGETS = ['message'];

module.exports = {
  FEEDBACK_ALLOWED_ROLES,
  FEEDBACK_LEARNING_MODE,
  FEEDBACK_ALLOWED_TARGETS,
};

