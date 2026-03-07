/**
 * Shërbimi AI për përgjigje kur nuk ka automation/keyword match.
 * Përdor Groq API (Llama) me GROQ_API_KEY; përndryshe kthen mesazh fallback.
 * GROQ_API_URL në .env mund të override-ojë URL-in (base ose full chat/completions).
 */

const DEFAULT_GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getGroqChatUrl() {
  const base = (process.env.GROQ_API_URL || '').trim();
  if (!base) return DEFAULT_GROQ_CHAT_URL;
  return base.endsWith('/chat/completions') ? base : base.replace(/\/$/, '') + '/chat/completions';
}

/**
 * Merr përgjigje nga AI për mesazhin e përdoruesit.
 *
 * @param {string} messageText - Teksti i mesazhit hyrës
 * @param {object} [conversationContext] - Kontekst opsional (historik mesazhesh, metadata)
 * @param {string} [companyInfo] - Informacione/udhëzime për kompaninë (nga Channel.aiInstructions ose User.companyInfo)
 * @returns {Promise<string>} Teksti i përgjigjes
 */
async function getReply(messageText, conversationContext = {}, companyInfo = '') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return getFallbackReply();
  }
  try {
    return await getGroqReply(apiKey, messageText, conversationContext, companyInfo);
  } catch (err) {
    console.error('AI service Groq error:', err.message);
    return getFallbackReply();
  }
}

/**
 * Ndërton system message për Groq: roli i asistentit + të dhënat/udhëzimet e kompanisë.
 * Ky mesazh udhëzon modelin para se të marrë mesazhet e bisedës (user/assistant).
 */
function buildSystemMessage(companyInfoText) {
  return `Ti je asistenti i kësaj kompanie. Këto janë të dhënat dhe udhëzimet:\n\n${companyInfoText}\n\nPërgjigju vetëm bazuar në këto informacione dhe në tonin e specifikuar. Mos shpik informacion që nuk është këtu.`;
}

/**
 * Thirr Groq Chat Completions API (Llama).
 * Radha e mesazheve: [system me companyInfo], [recentMessages], [mesazhi i ri i përdoruesit].
 */
async function getGroqReply(apiKey, messageText, conversationContext, companyInfo = '') {
  const messages = [];
  const infoText =
    typeof companyInfo === 'string' && companyInfo.trim()
      ? companyInfo.trim()
      : '';
  if (infoText) {
    messages.push({
      role: 'system',
      content: buildSystemMessage(infoText),
    });
  }
  if (conversationContext.recentMessages && Array.isArray(conversationContext.recentMessages)) {
    for (const m of conversationContext.recentMessages.slice(-10)) {
      messages.push({
        role: m.direction === 'out' ? 'assistant' : 'user',
        content: typeof m.content === 'string' ? m.content : (m.content?.text || ''),
      });
    }
  }
  messages.push({ role: 'user', content: messageText || '' });

  const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

  const res = await fetch(getGroqChatUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 256,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || `Groq API: ${res.status}`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.trim()) {
    return content.trim();
  }
  return getFallbackReply();
}

function getFallbackReply() {
  return "Faleminderit për mesazhin. Si mund t'ju ndihmoj?";
}

module.exports = {
  getReply,
};
