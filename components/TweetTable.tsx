'use client';
import { useState } from 'react';

// Accent text colours (same in both modes — they're semantic)
const BADGE_COLOR: Record<string, string> = {
  very_negative:     '#E74C3C',
  slightly_negative: '#E67E73',
  neutral:           '#378ADD',
  slightly_positive: '#58D68D',
  very_positive:     '#2ECC71',
};

const INTENT_COLOR: Record<string, string> = {
  opinion:    '#378ADD',
  inquiry:    '#82C97A',
  suggestion: '#9B59B6',
  complaint:  '#E74C3C',
  spam:       '#6B8CB5',
};

const PRODUCT_COLOR: Record<string, string> = {
  PiggyVest:              '#378ADD',
  Pocket:                 '#9B59B6',
  PiggyVest_for_Business: '#3498DB',
};

// Badge background CSS variable names (theme-aware)
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
  very_negative:     '#C0392B',
  slightly_negative: '#E67E73',
  neutral:           '#378ADD',
  slightly_positive: '#58D68D',
  very_positive:     '#2ECC71',
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

  const selectStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--text-primary)',
    background: 'var(--bg-input)',
    cursor: 'pointer',
    outline: 'none',
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tweets
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{filtered.length} results</div>
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

      {paginated.map((row, i) => {
        const dotColor = DOT_COLOR[row.overall_sentiment] || 'var(--text-dim)';
        return (
          <div key={i} style={{
            padding: '12px 0',
            borderBottom: '1px solid var(--row-border)',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '6px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '4px' }}>
                {row.tweet_text}
              </div>
              {row.author_username && (
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>@{row.author_username}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', flexShrink: 0 }}>
              {row.aspect_product && (
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  background: PRODUCT_BG_VAR[row.aspect_product] || 'var(--bg-elevated)',
                  color: PRODUCT_COLOR[row.aspect_product] || 'var(--text-muted)',
                  whiteSpace: 'nowrap', fontWeight: '600',
                }}>
                  {row.aspect_product === 'PiggyVest_for_Business' ? 'PVB' : row.aspect_product}
                </span>
              )}
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                background: BADGE_BG_VAR[row.overall_sentiment] || 'var(--bg-elevated)',
                color: BADGE_COLOR[row.overall_sentiment] || 'var(--text-muted)',
                whiteSpace: 'nowrap', fontWeight: '600',
              }}>
                {row.overall_sentiment?.replace(/_/g, ' ')}
              </span>
              {row.intent && (
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  background: INTENT_BG_VAR[row.intent] || 'var(--bg-elevated)',
                  color: INTENT_COLOR[row.intent] || 'var(--text-dim)',
                  whiteSpace: 'nowrap',
                }}>
                  {row.intent}
                </span>
              )}
              {row.aspect && (
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-dim)',
                  whiteSpace: 'nowrap',
                }}>
                  {row.aspect?.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '6px 14px', borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: page === 0 ? 'var(--text-ghost)' : 'var(--text-primary)',
              cursor: page === 0 ? 'default' : 'pointer',
              fontSize: '12px', fontWeight: '600',
            }}
          >
            ← Prev
          </button>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            style={{
              padding: '6px 14px', borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: page === totalPages - 1 ? 'var(--text-ghost)' : 'var(--text-primary)',
              cursor: page === totalPages - 1 ? 'default' : 'pointer',
              fontSize: '12px', fontWeight: '600',
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
