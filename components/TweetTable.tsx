'use client';
import { useState } from 'react';

const BADGE_COLOR: Record<string, string> = {
  very_negative:     'var(--sent-vneg)',
  slightly_negative: 'var(--sent-sneg)',
  neutral:           'var(--sent-neu)',
  slightly_positive: 'var(--sent-spos)',
  very_positive:     'var(--sent-vpos)',
};

const INTENT_COLOR: Record<string, string> = {
  opinion:    'var(--accent-blue)',
  inquiry:    'var(--accent-green)',
  suggestion: 'var(--accent-purple)',
  complaint:  'var(--accent-red)',
  spam:       'var(--text-muted)',
};

const PRODUCT_COLOR: Record<string, string> = {
  PiggyVest:              'var(--product-pv-color)',
  Pocket:                 'var(--product-pocket-color)',
  PiggyVest_for_Business: 'var(--product-pvb-color)',
};

const BADGE_BG: Record<string, string> = {
  very_negative:     'var(--badge-vneg-bg)',
  slightly_negative: 'var(--badge-sneg-bg)',
  neutral:           'var(--badge-neu-bg)',
  slightly_positive: 'var(--badge-spos-bg)',
  very_positive:     'var(--badge-vpos-bg)',
};

const INTENT_BG: Record<string, string> = {
  opinion:    'var(--intent-opinion-bg)',
  inquiry:    'var(--intent-inquiry-bg)',
  suggestion: 'var(--intent-suggestion-bg)',
  complaint:  'var(--intent-complaint-bg)',
  spam:       'var(--intent-spam-bg)',
};

const PRODUCT_BG: Record<string, string> = {
  PiggyVest:              'var(--product-pv-bg)',
  Pocket:                 'var(--product-pocket-bg)',
  PiggyVest_for_Business: 'var(--product-pvb-bg)',
};

const DOT_COLOR: Record<string, string> = {
  very_negative:     'var(--sent-vneg)',
  slightly_negative: 'var(--sent-sneg)',
  neutral:           'var(--sent-neu)',
  slightly_positive: 'var(--sent-spos)',
  very_positive:     'var(--sent-vpos)',
};

export default function TweetTable({ data }: { data: any[] }) {
  const [filter, setFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;

  const filtered = data.filter(d => {
    if (filter !== 'all' && d.overall_sentiment !== filter) return false;
    if (intentFilter !== 'all' && d.intent !== intentFilter) return false;
    return true;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="pv-card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <div className="pv-card-label">Recent Tweets</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontWeight: '500' }}>
            {filtered.length.toLocaleString()} results
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={intentFilter}
            onChange={e => { setIntentFilter(e.target.value); setPage(0); }}
            className="pv-select"
            style={{ borderRadius: '10px', padding: '7px 12px', fontSize: '12px' }}
          >
            <option value="all">All Intents</option>
            <option value="opinion">Opinion</option>
            <option value="inquiry">Inquiry</option>
            <option value="suggestion">Suggestion</option>
            <option value="complaint">Complaint</option>
            <option value="spam">Spam</option>
          </select>
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(0); }}
            className="pv-select"
            style={{ borderRadius: '10px', padding: '7px 12px', fontSize: '12px' }}
          >
            <option value="all">All Sentiments</option>
            <option value="very_negative">Very Negative</option>
            <option value="slightly_negative">Slightly Negative</option>
            <option value="neutral">Neutral</option>
            <option value="slightly_positive">Slightly Positive</option>
            <option value="very_positive">Very Positive</option>
          </select>
        </div>
      </div>

      {/* Tweet list */}
      {paginated.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '48px 0' }}>
          No tweets match your filters
        </div>
      ) : (
        <div>
          {paginated.map((row, i) => (
            <div key={i} className="pv-tweet">
              <div
                className="pv-tweet-dot"
                style={{ background: DOT_COLOR[row.overall_sentiment] || 'var(--text-dim)' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="pv-tweet-text">{row.tweet_text}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {row.author_username && (
                    <span className="pv-tweet-author">@{row.author_username}</span>
                  )}
                  {row.created_at && (
                    <>
                      <span style={{ fontSize: '10px', color: 'var(--text-ghost)' }}>·</span>
                      <span className="pv-tweet-time">{row.created_at.slice(0, 16)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="pv-tweet-badges">
                {row.aspect_product && (
                  <span className="pv-badge" style={{
                    background: PRODUCT_BG[row.aspect_product] || 'var(--bg-elevated)',
                    color: PRODUCT_COLOR[row.aspect_product] || 'var(--text-muted)',
                  }}>
                    {row.aspect_product === 'PiggyVest_for_Business' ? 'PVB' : row.aspect_product}
                  </span>
                )}
                <span className="pv-badge" style={{
                  background: BADGE_BG[row.overall_sentiment] || 'var(--bg-elevated)',
                  color: BADGE_COLOR[row.overall_sentiment] || 'var(--text-muted)',
                }}>
                  {row.overall_sentiment?.replace(/_/g, ' ')}
                </span>
                {row.intent && (
                  <span className="pv-badge" style={{
                    background: INTENT_BG[row.intent] || 'var(--bg-elevated)',
                    color: INTENT_COLOR[row.intent] || 'var(--text-dim)',
                  }}>
                    {row.intent}
                  </span>
                )}
                {row.aspect && (
                  <span className="pv-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-dim)' }}>
                    {row.aspect.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pv-pagination">
          <button
            className="pv-page-btn"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← Prev
          </button>
          <span className="pv-page-info">
            {page + 1} <span style={{ color: 'var(--text-ghost)' }}>/ {totalPages}</span>
          </span>
          <button
            className="pv-page-btn"
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
