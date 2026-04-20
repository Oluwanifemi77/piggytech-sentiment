'use client';
import { useState } from 'react';

const BADGE_COLOR: Record<string, string> = {
  very_negative:     '#F05555',
  slightly_negative: '#F08850',
  neutral:           '#5B9CF6',
  slightly_positive: '#4DE09C',
  very_positive:     '#00C571',
};

const INTENT_COLOR: Record<string, string> = {
  opinion:    '#5B9CF6',
  inquiry:    '#00C571',
  suggestion: '#A78BFA',
  complaint:  '#F05555',
  spam:       '#637A98',
};

const PRODUCT_COLOR: Record<string, string> = {
  PiggyVest:              '#5B9CF6',
  Pocket:                 '#A78BFA',
  PiggyVest_for_Business: '#00C571',
};

const BADGE_BG_VAR: Record<string, string> = {
  very_negative:     'var(--badge-vneg-bg)',
  slightly_negative: 'var(--badge-sneg-bg)',
  neutral:           'var(--badge-neu-bg)',
  slightly_positive: 'var(--badge-spos-bg)',
  very_positive:     'var(--badge-vpos-bg)',
};

const INTENT_BG_VAR: Record<string, string> = {
  opinion:    'var(--intent-opinion-bg)',
  inquiry:    'var(--intent-inquiry-bg)',
  suggestion: 'var(--intent-suggestion-bg)',
  complaint:  'var(--intent-complaint-bg)',
  spam:       'var(--intent-spam-bg)',
};

const PRODUCT_BG_VAR: Record<string, string> = {
  PiggyVest:              'var(--product-pv-bg)',
  Pocket:                 'var(--product-pocket-bg)',
  PiggyVest_for_Business: 'var(--product-pvb-bg)',
};

const DOT_COLOR: Record<string, string> = {
  very_negative:     '#F05555',
  slightly_negative: '#F08850',
  neutral:           '#5B9CF6',
  slightly_positive: '#4DE09C',
  very_positive:     '#00C571',
};

const selectStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '10px',
  padding: '7px 12px',
  fontSize: '12px',
  color: 'var(--text-primary)',
  background: 'var(--bg-input)',
  cursor: 'pointer',
  outline: 'none',
  fontFamily: 'inherit',
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
    <div className="card" style={{ borderRadius: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div className="text-label">Recent Tweets</div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px' }}>
            {filtered.length.toLocaleString()} results
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select value={intentFilter} onChange={e => { setIntentFilter(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="all">All Intents</option>
            <option value="opinion">Opinion</option>
            <option value="inquiry">Inquiry</option>
            <option value="suggestion">Suggestion</option>
            <option value="complaint">Complaint</option>
            <option value="spam">Spam</option>
          </select>
          <select value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} style={selectStyle}>
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
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '40px 0' }}>
          No tweets match your filters
        </div>
      ) : (
        <div>
          {paginated.map((row, i) => {
            const dotColor = DOT_COLOR[row.overall_sentiment] || 'var(--text-dim)';
            return (
              <div key={i} className="tweet-row">
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: dotColor, flexShrink: 0, marginTop: '6px',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px', color: 'var(--text-secondary)',
                    lineHeight: 1.65, marginBottom: '6px',
                  }}>
                    {row.tweet_text}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {row.author_username && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                        @{row.author_username}
                      </span>
                    )}
                    {row.created_at && (
                      <>
                        <span style={{ fontSize: '10px', color: 'var(--text-ghost)' }}>·</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
                          {row.created_at.slice(0, 16)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
                  {row.aspect_product && (
                    <span className="badge" style={{
                      background: PRODUCT_BG_VAR[row.aspect_product] || 'var(--bg-elevated)',
                      color: PRODUCT_COLOR[row.aspect_product] || 'var(--text-muted)',
                    }}>
                      {row.aspect_product === 'PiggyVest_for_Business' ? 'PVB' : row.aspect_product}
                    </span>
                  )}
                  <span className="badge" style={{
                    background: BADGE_BG_VAR[row.overall_sentiment] || 'var(--bg-elevated)',
                    color: BADGE_COLOR[row.overall_sentiment] || 'var(--text-muted)',
                  }}>
                    {row.overall_sentiment?.replace(/_/g, ' ')}
                  </span>
                  {row.intent && (
                    <span className="badge" style={{
                      background: INTENT_BG_VAR[row.intent] || 'var(--bg-elevated)',
                      color: INTENT_COLOR[row.intent] || 'var(--text-dim)',
                    }}>
                      {row.intent}
                    </span>
                  )}
                  {row.aspect && (
                    <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-dim)' }}>
                      {row.aspect.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '600' }}>
            {page + 1} <span style={{ color: 'var(--text-ghost)' }}>/ {totalPages}</span>
          </span>
          <button
            className="page-btn"
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
