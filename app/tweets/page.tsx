'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

// Accent text colours
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

export default function TweetsPage() {
  const { theme, toggle } = useTheme();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentiment, setSentiment] = useState('all');
  const [product, setProduct] = useState('all');
  const [aspect, setAspect] = useState('all');
  const [intent, setIntent] = useState('all');
  const [authorSearch, setAuthorSearch] = useState('');
  const [excludedAuthors, setExcludedAuthors] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(json => { setData(json.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const aspects = useMemo(() => [...new Set(data.map(d => d.aspect).filter(Boolean))].sort(), [data]);
  const dateBounds = useMemo(() => {
    const dates = data.map(d => d.created_at).filter(Boolean).sort();
    return { min: dates[0] || '', max: dates[dates.length - 1] || '' };
  }, [data]);

  const authorSuggestions = useMemo(() => {
    if (!authorSearch || authorSearch.length < 2) return [];
    return [...new Set(data.map(d => d.author_username).filter(Boolean))]
      .filter((a: any) => a.toLowerCase().includes(authorSearch.toLowerCase()))
      .slice(0, 5);
  }, [data, authorSearch]);

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (sentiment !== 'all' && d.overall_sentiment !== sentiment) return false;
      if (product !== 'all' && !d.products_detected?.includes(product)) return false;
      if (aspect !== 'all' && d.aspect !== aspect) return false;
      if (intent !== 'all' && d.intent !== intent) return false;
      if (search && !d.tweet_text?.toLowerCase().includes(search.toLowerCase())) return false;
      if (excludedAuthors.includes(d.author_username)) return false;
      if (startDate && d.created_at < startDate) return false;
      if (endDate && d.created_at > endDate) return false;
      return true;
    });
  }, [data, sentiment, product, aspect, intent, search, excludedAuthors, startDate, endDate]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const resetFilters = () => {
    setSentiment('all'); setProduct('all'); setAspect('all');
    setIntent('all'); setSearch(''); setAuthorSearch('');
    setExcludedAuthors([]); setStartDate(''); setEndDate(''); setPage(0);
  };

  const selectStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '7px 12px',
    fontSize: '12px',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    outline: 'none',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-page)' }}>
      <div style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600' }}>Loading…</div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>

      {/* ── Navbar ── */}
      <div style={{
        background: 'var(--bg-nav)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '60px',
        boxShadow: 'var(--nav-shadow)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ fontSize: '12px', color: 'var(--text-dim)', textDecoration: 'none', fontWeight: '500' }}>
            ← Dashboard
          </Link>
          <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
          <div>
            <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px' }}>Tweet Browser</div>
            <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '1px' }}>
              {filtered.length} of {data.length} tweets
            </div>
          </div>
        </div>

        {/* ── Theme toggle ── */}
        <button
          onClick={toggle}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            letterSpacing: '0.02em',
          }}
        >
          <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* ── Filters ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
          boxShadow: 'var(--card-shadow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search tweets…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{ ...selectStyle, width: '180px' }}
            />
            <select value={sentiment} onChange={e => { setSentiment(e.target.value); setPage(0); }} style={selectStyle}>
              <option value="all">All Sentiments</option>
              <option value="very_negative">Very Negative</option>
              <option value="slightly_negative">Slightly Negative</option>
              <option value="neutral">Neutral</option>
              <option value="slightly_positive">Slightly Positive</option>
              <option value="very_positive">Very Positive</option>
            </select>
            <select value={intent} onChange={e => { setIntent(e.target.value); setPage(0); }} style={selectStyle}>
              <option value="all">All Intents</option>
              <option value="opinion">Opinion</option>
              <option value="inquiry">Inquiry</option>
              <option value="suggestion">Suggestion</option>
              <option value="complaint">Complaint</option>
              <option value="spam">Spam</option>
            </select>
            <select value={product} onChange={e => { setProduct(e.target.value); setPage(0); }} style={selectStyle}>
              <option value="all">All Products</option>
              <option value="PiggyVest">PiggyVest</option>
              <option value="Pocket">Pocket</option>
              <option value="PiggyVest_for_Business">PVB</option>
            </select>
            <select value={aspect} onChange={e => { setAspect(e.target.value); setPage(0); }} style={selectStyle}>
              <option value="all">All Aspects</option>
              {aspects.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
            <input
              type="date"
              value={startDate}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={e => { setStartDate(e.target.value); setPage(0); }}
              style={{ ...selectStyle, width: 'auto' }}
            />
            <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>to</span>
            <input
              type="date"
              value={endDate}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={e => { setEndDate(e.target.value); setPage(0); }}
              style={{ ...selectStyle, width: 'auto' }}
            />
            <button
              onClick={resetFilters}
              style={{
                fontSize: '11px',
                color: 'var(--accent-red)',
                background: 'none',
                border: '1px solid var(--accent-red)',
                borderRadius: '6px',
                padding: '5px 12px',
                cursor: 'pointer',
                fontWeight: '600',
              }}
            >
              Reset
            </button>
          </div>

          {/* Author exclude */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Exclude Authors
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search author to exclude…"
                  value={authorSearch}
                  onChange={e => setAuthorSearch(e.target.value)}
                  style={{ ...selectStyle, width: '220px' }}
                />
                {authorSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    zIndex: 10,
                    width: '220px',
                    marginTop: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  }}>
                    {authorSuggestions.map((a: any) => (
                      <div
                        key={a}
                        onClick={() => {
                          if (!excludedAuthors.includes(a)) setExcludedAuthors(prev => [...prev, a]);
                          setAuthorSearch('');
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        @{a}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {excludedAuthors.map(a => (
                <span key={a} style={{
                  fontSize: '11px', padding: '3px 8px', borderRadius: '20px',
                  background: 'var(--badge-vneg-bg)', color: 'var(--accent-red)',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  @{a}
                  <span
                    onClick={() => setExcludedAuthors(prev => prev.filter(x => x !== a))}
                    style={{ cursor: 'pointer', fontWeight: '700', marginLeft: '2px' }}
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tweet list ── */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--card-shadow)',
        }}>
          {paginated.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '40px 0' }}>
              No tweets match your filters
            </div>
          ) : paginated.map((row, i) => {
            const dotColor = DOT_COLOR[row.overall_sentiment] || 'var(--text-dim)';
            return (
              <div key={i} style={{
                padding: '14px 0',
                borderBottom: '1px solid var(--row-border)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '6px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '6px' }}>
                    {row.tweet_text}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {row.author_username && (
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>@{row.author_username}</span>
                    )}
                    <span style={{ fontSize: '10px', color: 'var(--text-ghost)' }}>·</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-ghost)' }}>{row.created_at}</span>
                  </div>
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

          {/* Pagination */}
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
      </div>
    </div>
  );
}
