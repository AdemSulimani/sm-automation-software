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

function getSentimentLabelText(label: Message['sentimentLabel'] | ConversationWithMessages['conversation']['sentimentLabel']) {
  if (!label) return 'Pa sentiment';
  if (label === 'positive') return 'Pozitiv';
  if (label === 'negative') return 'Negativ';
  if (label === 'neutral') return 'Neutral';
  if (label === 'mixed') return 'I përzier';
  return label;
}

function getSentimentBadgeClass(
  label: Message['sentimentLabel'] | ConversationWithMessages['conversation']['sentimentLabel']
) {
  if (!label) return 'sentiment-badge sentiment-badge--none';
  return `sentiment-badge sentiment-badge--${label}`;
}

export function InboxThread() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const [data, setData] = useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [feedbackList, setFeedbackList] = useState<any[] | null>(null);
  const [feedbackError, setFeedbackError] = useState('');
  const [, setFeedbackLoading] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState<{
    messageId: string | null;
    sentiment: 'like' | 'dislike';
    reasonCategory: string;
    rating: string;
    comment: string;
  }>({
    messageId: null,
    sentiment: 'dislike',
    reasonCategory: 'wrong_information',
    rating: '',
    comment: '',
  });
  const [coaching, setCoaching] = useState<{
    summary: { reasonCategory: string; count: number }[];
    goodExamples: any[];
    badExamples: any[];
  } | null>(null);
  const [coachingError, setCoachingError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function loadThread() {
    if (!conversationId) return;
    setLoading(true);
    setError('');
    apiRequest<ConversationWithMessages>(`/api/conversations/${conversationId}/messages`)
      .then((thread) => {
        setData(thread);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim.'))
      .finally(() => setLoading(false));
  }

  function loadFeedback() {
    if (!conversationId) return;
    setFeedbackLoading(true);
    setFeedbackError('');
    apiRequest<any[]>(`/api/feedback/conversation/${conversationId}`)
      .then((list) => {
        setFeedbackList(Array.isArray(list) ? list : []);
      })
      .catch((err) => setFeedbackError(err instanceof Error ? err.message : 'Gabim në ngarkim të feedback-ut.'))
      .finally(() => setFeedbackLoading(false));
  }

  function loadCoaching() {
    setCoachingError('');
    apiRequest<{
      summary: { reasonCategory: string; count: number }[];
      goodExamples: any[];
      badExamples: any[];
    }>('/api/feedback/coaching')
      .then((data) => setCoaching(data))
      .catch((err) => setCoachingError(err instanceof Error ? err.message : 'Gabim në ngarkim të coaching-ut.'));
  }

  useEffect(() => {
    loadThread();
    loadFeedback();
    loadCoaching();
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
      loadFeedback();
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

  const feedbackByMessageId =
    feedbackList && Array.isArray(feedbackList)
      ? feedbackList.reduce<Record<string, any[]>>((acc, fb) => {
          const mid = String(fb.messageId);
          if (!acc[mid]) acc[mid] = [];
          acc[mid].push(fb);
          return acc;
        }, {})
      : {};

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
        {conversation.sentimentLabel && (
          <div className="thread-sentiment">
            <span className={getSentimentBadgeClass(conversation.sentimentLabel)}>
              {getSentimentLabelText(conversation.sentimentLabel)}
            </span>
          </div>
        )}
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
              {m.direction === 'in' && m.sentimentLabel && (
                <span className={getSentimentBadgeClass(m.sentimentLabel)}>
                  {getSentimentLabelText(m.sentimentLabel)}
                </span>
              )}
              {m.direction === 'out' && (m.senderType === 'ai' || m.senderType === 'human_agent') && (
                <div className="message-feedback-row">
                  <button
                    type="button"
                    className="btn-link btn-link-sm"
                    onClick={() => {
                      setFeedbackForm({
                        messageId: m._id,
                        sentiment: 'dislike',
                        reasonCategory: 'wrong_information',
                        rating: '',
                        comment: '',
                      });
                      setFeedbackError('');
                      setFeedbackModalOpen(true);
                    }}
                  >
                    Jep feedback për këtë mesazh
                  </button>
                  {feedbackByMessageId[m._id]?.length ? (
                    <span className="message-feedback-summary">
                      {feedbackByMessageId[m._id].length === 1
                        ? '1 feedback'
                        : `${feedbackByMessageId[m._id].length} feedback`}
                    </span>
                  ) : null}
                </div>
              )}
              {feedbackByMessageId[m._id]?.length ? (
                <div className="message-feedback-details">
                  {feedbackByMessageId[m._id].map((fb) => (
                    <div key={fb._id} className="message-feedback-item">
                      <span className="message-feedback-badge">
                        {fb.sentiment === 'like' ? '👍' : '👎'} · {fb.reasonCategory.replace(/_/g, ' ')}
                      </span>
                      {fb.comment && <p className="message-feedback-comment">{fb.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {coaching && (
        <div className="thread-coaching-panel">
          <h2>Këshilla bazuar në feedback</h2>
          {coaching.summary.length === 0 ? (
            <p>Ende nuk ka mjaftueshëm feedback për këshilla specifike.</p>
          ) : (
            <>
              <ul className="thread-coaching-summary">
                {coaching.summary.map((item) => (
                  <li key={item.reasonCategory}>
                    <strong>{item.count}</strong>{' '}
                    {item.reasonCategory.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
              <p className="thread-coaching-hint">
                Kur shkruani përgjigje, mbani parasysh këto pika që të shmangni feedback negativ në të ardhmen.
              </p>
            </>
          )}
          {(coaching.goodExamples.length > 0 || coaching.badExamples.length > 0) && (
            <div className="thread-coaching-examples">
              {coaching.goodExamples.length > 0 && (
                <div className="thread-coaching-column">
                  <h3>Shembuj të mirë (të pëlqyer)</h3>
                  <ul>
                    {coaching.goodExamples.map((ex) => {
                      const content = ex.message?.content as { text?: string } | null;
                      const text = content && typeof content.text === 'string'
                        ? content.text
                        : content
                          ? JSON.stringify(content)
                          : '';
                      return (
                        <li key={ex.messageId}>
                          <p className="thread-coaching-message">“{text.slice(0, 120)}{text.length > 120 ? '…' : ''}”</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {coaching.badExamples.length > 0 && (
                <div className="thread-coaching-column">
                  <h3>Shembuj për t&apos;u shmangur</h3>
                  <ul>
                    {coaching.badExamples.map((ex) => {
                      const content = ex.message?.content as { text?: string } | null;
                      const text = content && typeof content.text === 'string'
                        ? content.text
                        : content
                          ? JSON.stringify(content)
                          : '';
                      return (
                        <li key={ex.messageId}>
                          <p className="thread-coaching-message">
                            “{text.slice(0, 120)}{text.length > 120 ? '…' : ''}”
                          </p>
                          <p className="thread-coaching-reason">
                            Arsyeja: {ex.reasonCategory.replace(/_/g, ' ')}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
          {coachingError && <div className="auth-error">{coachingError}</div>}
        </div>
      )}

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

      {feedbackModalOpen && feedbackForm.messageId && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Feedback për mesazhin</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setFeedbackModalOpen(false);
                }}
                aria-label="Mbyll"
              >
                ×
              </button>
            </div>
            <form
              className="modal-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!feedbackForm.messageId) return;
                setFeedbackSubmitting(true);
                setFeedbackError('');
                try {
                  const body: Record<string, unknown> = {
                    messageId: feedbackForm.messageId,
                    sentiment: feedbackForm.sentiment,
                    reasonCategory: feedbackForm.reasonCategory,
                    comment: feedbackForm.comment.trim() || undefined,
                  };
                  const ratingNum = parseInt(feedbackForm.rating, 10);
                  if (!Number.isNaN(ratingNum) && ratingNum >= 1 && ratingNum <= 5) {
                    body.rating = ratingNum;
                  }
                  await apiRequest('/api/feedback', {
                    method: 'POST',
                    body: JSON.stringify(body),
                  });
                  setFeedbackModalOpen(false);
                  loadFeedback();
                } catch (err) {
                  setFeedbackError(err instanceof Error ? err.message : 'Gabim gjatë ruajtjes së feedback-ut.');
                } finally {
                  setFeedbackSubmitting(false);
                }
              }}
            >
              {feedbackError && <div className="auth-error">{feedbackError}</div>}
              <label>
                Lloji i feedback-ut
                <select
                  value={feedbackForm.sentiment}
                  onChange={(e) =>
                    setFeedbackForm((f) => ({
                      ...f,
                      sentiment: e.target.value as 'like' | 'dislike',
                    }))
                  }
                >
                  <option value="like">Më pëlqeu</option>
                  <option value="dislike">Nuk më pëlqeu</option>
                </select>
              </label>
              <label>
                Arsyeja kryesore
                <select
                  value={feedbackForm.reasonCategory}
                  onChange={(e) =>
                    setFeedbackForm((f) => ({
                      ...f,
                      reasonCategory: e.target.value,
                    }))
                  }
                >
                  <option value="wrong_information">Informacion i gabuar</option>
                  <option value="did_not_answer_question">Nuk iu përgjigj pyetjes</option>
                  <option value="tone_too_informal">Toni shumë joformal</option>
                  <option value="tone_too_formal">Toni shumë formal</option>
                  <option value="too_long">Shumë i gjatë</option>
                  <option value="too_short">Shumë i shkurtër</option>
                  <option value="other">Tjetër</option>
                </select>
              </label>
              <label>
                Vlerësim (1–5) (opsionale)
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={feedbackForm.rating}
                  onChange={(e) =>
                    setFeedbackForm((f) => ({
                      ...f,
                      rating: e.target.value,
                    }))
                  }
                  placeholder="p.sh. 3"
                />
              </label>
              <label>
                Koment (opsionale)
                <textarea
                  rows={3}
                  value={feedbackForm.comment}
                  onChange={(e) =>
                    setFeedbackForm((f) => ({
                      ...f,
                      comment: e.target.value,
                    }))
                  }
                  placeholder="P.sh. nuk më pëlqeu ky mesazh sepse…"
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setFeedbackModalOpen(false);
                  }}
                  disabled={feedbackSubmitting}
                >
                  Anulo
                </button>
                <button type="submit" className="btn-primary" disabled={feedbackSubmitting}>
                  {feedbackSubmitting ? 'Duke ruajtur…' : 'Ruaj feedback-un'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
