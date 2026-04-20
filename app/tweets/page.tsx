'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

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

// Convert "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM"
function toDatetimeLocal(s: string): string {
  return s ? s.slice(0, 16).replace(' ', 'T') : '';
}
// Convert datetime-local "YYYY-MM-DDTHH:MM" → "YYYY-MM-DD HH:MM"
function fromDatetimeLocal(s: string): string {
  return s ? s.replace('T', ' ') : '';
}

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
    return {
      min: toDatetimeLocal(dates[0] || ''),
      max: toDatetimeLocal(dates[dates.length - 1] || ''),
    };
  }, [data]);

  const authorSuggestions = useMemo(() => {
    if (!authorSearch || authorSearch.length < 2) return [];
    return [...new Set(data.map(d => d.author_username).filter(Boolean))]
      .filter((a: any) => a.toLowerCase().includes(authorSearch.toLowerCase()))
      .slice(0, 5);
  }, [data, authorSearch]);

  const filtered = useMemo(() => {
    const normStart = fromDatetimeLocal(startDate);
    const normEnd = endDate ? fromDatetimeLocal(endDate) + ':59' : '';

    return data.filter(d => {
      if (sentiment !== 'all' && d.overall_sentiment !== sentiment) return false;
      if (product !== 'all' && !d.products_detected?.includes(product)) return false;
      if (aspect !== 'all' && d.aspect !== aspect) return false;
      if (intent !== 'all' && d.intent !== intent) return false;
      if (search && !d.tweet_text?.toLowerCase().includes(search.toLowerCase())) return false;
      if (excludedAuthors.includes(d.author_username)) return false;
      if (normStart && d.created_at < normStart) return false;
      if (normEnd && d.created_at > normEnd) return false;
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
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '12px',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'inherit',
    fontWeight: '500',
  };

  const activeFilters = [sentiment, product, aspect, intent].filter(v => v !== 'all').length
    + (search ? 1 : 0)
    + (startDate || endDate ? 1 : 0)
    + excludedAuthors.length;

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
        Loading tweets…
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingTop: '3px' }}>

      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav style={{
        background: 'var(--bg-nav)',
        borderBottom: '1px solid var(--border)',
        padding: '0 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '60px',
        boxShadow: 'var(--nav-shadow)',
        position: 'sticky',
        top: '3px',
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: '800', color: '#fff', flexShrink: 0,
            }}>
              P
            </div>
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: '800', fontSize: '14px', lineHeight: 1.2 }}>
                PiggyTech Sentiment
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '10px', fontWeight: '600' }}>
                Social Intelligence Dashboard
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link href="/" className="nav-link">Dashboard</Link>
            <span className="nav-link active">Tweet Browser</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
              {filtered.length.toLocaleString()}
            </span>
            {' '}of {data.length.toLocaleString()} tweets
          </div>
          <button className="theme-toggle" onClick={toggle}>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </nav>

      <div style={{ padding: '20px 28px' }}>

        {/* ── Filters Card ───────────────────────────────────── */}
        <div className="card" style={{ marginBottom: '16px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-label">Filters</span>
              {activeFilters > 0 && (
                <span className="badge" style={{
                  background: 'var(--accent-primary-bg)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-primary)',
                }}>
                  {activeFilters} active
                </span>
              )}
            </div>
            <button
              className="btn btn-danger"
              onClick={resetFilters}
              style={{ fontSize: '11px', padding: '5px 12px' }}
            >
              Reset all
            </button>
          </div>

          {/* Row 1: text search + sentiment + intent + product + aspect */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Search tweet text…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{ ...selectStyle, width: '200px' }}
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
          </div>

          {/* Row 2: datetime-local filters */}
          <div style={{
            paddingTop: '12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap' }}>
                Time Range
              </span>
              <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-dim)', fontSize: '9px' }}>
                minute precision
              </span>
            </div>
            <input
              type="datetime-local"
              value={startDate}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={e => { setStartDate(e.target.value); setPage(0); }}
              style={{ ...selectStyle }}
            />
            <span style={{ color: 'var(--text-dim)', fontSize: '12px', fontWeight: '600' }}>→</span>
            <input
              type="datetime-local"
              value={endDate}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={e => { setEndDate(e.target.value); setPage(0); }}
              style={{ ...selectStyle }}
            />
            {(startDate || endDate) && (
              <button
                className="btn btn-danger"
                onClick={() => { setStartDate(''); setEndDate(''); setPage(0); }}
                style={{ fontSize: '11px', padding: '6px 10px' }}
              >
                Clear ×
              </button>
            )}
          </div>

          {/* Row 3: Author exclude */}
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
            <div className="text-label" style={{ marginBottom: '8px' }}>
              Exclude Authors
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search author to exclude…"
                  value={authorSearch}
                  onChange={e => setAuthorSearch(e.target.value)}
                  style={{ ...selectStyle, width: '240px' }}
                />
                {authorSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    zIndex: 10,
                    width: '240px',
                    marginTop: '4px',
                    boxShadow: 'var(--card-shadow-hover)',
                    overflow: 'hidden',
                  }}>
                    {authorSuggestions.map((a: any) => (
                      <div
                        key={a}
                        onClick={() => {
                          if (!excludedAuthors.includes(a)) setExcludedAuthors(prev => [...prev, a]);
                          setAuthorSearch('');
                        }}
                        style={{
                          padding: '9px 14px',
                          fontSize: '12px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--border)',
                          fontWeight: '500',
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        @{a}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {excludedAuthors.map(a => (
                <span key={a} className="badge" style={{
                  background: 'var(--badge-vneg-bg)',
                  color: 'var(--accent-red)',
                  border: '1px solid var(--accent-red)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '4px 10px',
                }}>
                  @{a}
                  <span
                    onClick={() => setExcludedAuthors(prev => prev.filter(x => x !== a))}
                    style={{ marginLeft: '4px', fontWeight: '800' }}
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tweet List ───────────────────────────────────────── */}
        <div className="card" style={{ borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <div className="text-label">Tweet Stream</div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px' }}>
                {filtered.length.toLocaleString()} tweets · page {page + 1} of {totalPages || 1}
              </div>
            </div>
            {activeFilters > 0 && (
              <span className="badge" style={{
                background: 'var(--accent-primary-bg)',
                color: 'var(--accent-primary)',
                fontSize: '11px',
                padding: '5px 12px',
              }}>
                {activeFilters} filter{activeFilters !== 1 ? 's' : ''} applied
              </span>
            )}
          </div>

          {paginated.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '48px 0' }}>
              <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔍</div>
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
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '6px' }}>
                        {row.tweet_text}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {row.author_username && (
                          <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '700' }}>
                            @{row.author_username}
                          </span>
                        )}
                        {row.created_at && (
                          <>
                            <span style={{ fontSize: '10px', color: 'var(--text-ghost)' }}>·</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '500' }}>
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

        {/* Footer */}
        <div style={{
          marginTop: '28px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '22px', height: '22px', borderRadius: '6px',
              background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: '800', color: '#fff',
            }}>P</div>
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
              PiggyTech Sentiment
            </span>
          </div>
          <Link href="/dashboard" style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
