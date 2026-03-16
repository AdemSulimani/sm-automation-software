import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api';
import type { ChannelPlatform } from '../types/channel';
import { CHANNEL_PLATFORM_LABELS } from '../types/channel';

interface FeedbackOverviewItem {
  conversationId: string;
  messageId: string;
  feedbackCount: number;
  dislikes: number;
  likes: number;
  avgRating: number | null;
  lastFeedbackAt: string;
  message: {
    content: { text?: string; [k: string]: unknown } | null;
    timestamp: string;
    senderType: 'customer' | 'human_agent' | 'ai' | null;
    direction: 'in' | 'out';
    sentimentScore?: number | null;
    sentimentLabel?: 'negative' | 'neutral' | 'positive' | 'mixed' | null;
    sentimentProvider?: string | null;
  } | null;
  conversation: {
    platformUserId: string;
    channel: { _id: string; name?: string | null; platform: ChannelPlatform } | null;
  } | null;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMessagePreview(item: FeedbackOverviewItem): string {
  const c = item.message?.content;
  if (!c) return '–';
  if (typeof (c as { text?: string }).text === 'string') return (c as { text: string }).text.slice(0, 80);
  return typeof c === 'object' ? JSON.stringify(c).slice(0, 80) + '…' : String(c);
}

export function FeedbackOverview() {
  const [items, setItems] = useState<FeedbackOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    apiRequest<FeedbackOverviewItem[]>('/api/feedback/overview')
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : 'Gabim në ngarkim të feedback-ut.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Duke ngarkuar feedback-un…</div>;

  return (
    <div className="page-feedback-overview">
      <h1>Feedback &amp; Cilësia e përgjigjeve</h1>
      <p className="page-feedback-hint">
        Shihni mesazhet me më shumë feedback negativ për të kuptuar se ku AI ose agjentët duhet të përmirësohen.
      </p>
      {error && <div className="auth-error">{error}</div>}
      {items.length === 0 ? (
        <p>Nuk ka ende feedback për t&apos;u shfaqur.</p>
      ) : (
        <table className="table-automation">
          <thead>
            <tr>
              <th>Klienti</th>
              <th>Kanal</th>
              <th>Mesazhi</th>
              <th>Sentiment (modeli)</th>
              <th>Likes / Dislikes</th>
              <th>Rating mesatar</th>
              <th>Feedback-e gjithsej</th>
              <th>Feedback i fundit</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const ch = item.conversation?.channel;
              const platformLabel = ch ? CHANNEL_PLATFORM_LABELS[ch.platform] : '–';
              const sentimentLabel = item.message?.sentimentLabel;
              return (
                <tr key={`${item.conversationId}-${item.messageId}`}>
                  <td>{item.conversation?.platformUserId ?? '–'}</td>
                  <td>
                    {platformLabel}
                    {ch?.name ? `: ${ch.name}` : ''}
                  </td>
                  <td className="td-response">{getMessagePreview(item)}</td>
                  <td>
                    {sentimentLabel === 'positive'
                      ? 'Pozitiv'
                      : sentimentLabel === 'negative'
                      ? 'Negativ'
                      : sentimentLabel === 'neutral'
                      ? 'Neutral'
                      : sentimentLabel === 'mixed'
                      ? 'I përzier'
                      : '–'}
                  </td>
                  <td>
                    👍 {item.likes} / 👎 {item.dislikes}
                  </td>
                  <td>{item.avgRating != null ? item.avgRating.toFixed(1) : '–'}</td>
                  <td>{item.feedbackCount}</td>
                  <td>{formatDateTime(item.lastFeedbackAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

