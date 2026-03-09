import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiRequest } from '../services/api';
import type { ConversationWithMessages, Message } from '../types/inbox';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';
import type { ChannelPlatform } from '../types/channel';

function formatMessageTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMessageText(m: Message): string {
  const c = m.content;
  if (!c) return '';
  if (typeof c.text === 'string') return c.text;
  return typeof c === 'object' ? JSON.stringify(c) : String(c);
}

function getChannelLabel(conv: ConversationWithMessages['conversation']): string {
  const ch = conv.channelId;
  if (!ch) return '–';
  if (typeof ch === 'object' && ch !== null && 'platform' in ch) {
    const platform = (ch as { platform: string }).platform as ChannelPlatform;
    return CHANNEL_PLATFORM_LABELS[platform] || platform;
  }
  return '–';
}

export function InboxThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [data, setData] = useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function loadThread() {
    if (!conversationId) return;
    setLoading(true);
    setError('');
    apiRequest<ConversationWithMessages>(`/api/conversations/${conversationId}/messages`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadThread();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !conversationId) return;
    setSending(true);
    setError('');
    try {
      await apiRequest<Message>(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      setReplyText('');
      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
      loadThread();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gabim gjatë dërgesës.');
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="page-loading">Duke ngarkuar bisedën…</div>;
  if (error && !data) return <div className="page-error" role="alert">{error}</div>;
  if (!data) return null;

  const { conversation, messages } = data;

  const platform =
    typeof conversation.channelId === 'object' && conversation.channelId !== null
      ? (conversation.channelId as { platform?: string }).platform
      : undefined;
  const isMetaPlatform = platform === 'facebook' || platform === 'instagram' || platform === 'whatsapp';

  let isOutside24hWindow = false;
  if (isMetaPlatform && conversation.lastUserMessageAt) {
    const lastUser = new Date(conversation.lastUserMessageAt);
    const now = new Date();
    const elapsedMs = now.getTime() - lastUser.getTime();
    const WINDOW_MS = 24 * 60 * 60 * 1000;
    if (!Number.isNaN(elapsedMs) && elapsedMs > WINDOW_MS) {
      isOutside24hWindow = true;
    }
  }

  return (
    <div className="page-inbox-thread">
      <div className="thread-header">
        <Link to="/app/inbox" className="back-link">← Inbox</Link>
        <h1>
          Bisedë me {conversation.platformUserId}
          <span className="thread-channel">{getChannelLabel(conversation)}</span>
        </h1>
      </div>

      <div className="thread-messages">
        {messages.length === 0 ? (
          <p className="thread-empty">Nuk ka mesazhe ende.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m._id}
              className={`message-bubble message-bubble--${m.direction}`}
              title={formatMessageTime(m.timestamp)}
            >
              <span className="message-text">{getMessageText(m)}</span>
              <span className="message-meta">
                {m.direction === 'in' ? 'Nga përdoruesi' : 'Ju'}
                {' · '}
                {formatMessageTime(m.timestamp)}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="thread-reply">
        {error && <div className="auth-error">{error}</div>}
        {sendSuccess && <div className="form-success">Mesazhi u dërgua.</div>}
        {isOutside24hWindow && (
          <div className="auth-error">
            Nuk mund të dërgoni mesazh sepse kanë kaluar 24 orë pa aktivitet nga klienti në këtë kanal.
          </div>
        )}
        <div className="thread-reply-row">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Shkruani mesazhin…"
            disabled={sending || isOutside24hWindow}
          />
          <button type="submit" className="btn-primary" disabled={sending || !replyText.trim()}>
            {sending ? 'Duke dërguar…' : 'Dërgo'}
          </button>
        </div>
      </form>
    </div>
  );
}
