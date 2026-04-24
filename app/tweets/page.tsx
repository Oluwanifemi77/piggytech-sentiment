'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

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
  const [data, setData]                       = useState<any[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [sentiment, setSentiment]             = useState('all');
  const [product, setProduct]                 = useState('all');
  const [aspect, setAspect]                   = useState('all');
  const [intent, setIntent]                   = useState('all');
  const [authorSearch, setAuthorSearch]       = useState('');
  const [excludedAuthors, setExcludedAuthors] = useState<string[]>([]);
  const [search, setSearch]                   = useState('');
  const [startDate, setStartDate]             = useState('');
  const [endDate, setEndDate]                 = useState('');
  const [page, setPage]                       = useState(0);
  const [menuOpen, setMenuOpen]               = useState(false);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(json => { setData(json.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Lock body scroll while drawer open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const aspects = useMemo(() =>
    [...new Set(data.map(d => d.aspect).filter(Boolean))].sort(), [data]);

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
    const normEnd   = endDate ? fromDatetimeLocal(endDate) + ':59' : '';
    return data.filter(d => {
      if (sentiment !== 'all' && d.overall_sentiment !== sentiment) return false;
      if (product   !== 'all' && !d.products_detected?.includes(product)) return false;
      if (aspect    !== 'all' && d.aspect !== aspect) return false;
      if (intent    !== 'all' && d.intent !== intent) return false;
      if (search && !d.tweet_text?.toLowerCase().includes(search.toLowerCase())) return false;
      if (excludedAuthors.includes(d.author_username)) return false;
      if (normStart && d.created_at < normStart) return false;
      if (normEnd   && d.created_at > normEnd)   return false;
      return true;
    });
  }, [data, sentiment, product, aspect, intent, search, excludedAuthors, startDate, endDate]);

  const paginated  = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const resetFilters = () => {
    setSentiment('all'); setProduct('all'); setAspect('all');
    setIntent('all'); setSearch(''); setAuthorSearch('');
    setExcludedAuthors([]); setStartDate(''); setEndDate(''); setPage(0);
  };

  const activeFilters =
    [sentiment, product, aspect, intent].filter(v => v !== 'all').length
    + (search ? 1 : 0)
    + (startDate || endDate ? 1 : 0)
    + excludedAuthors.length;

  if (loading) return (
    <div className="pv-loading">
      <div className="pv-spinner" />
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
        Loading tweets…
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingTop: '3px' }}>

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="pv-nav">
        <div className="pv-wrap pv-nav-inner">

          {/* Brand + links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', minWidth: 0 }}>
            <div className="pv-logo">
              <img
                src={theme === 'dark' ? '/pv-logo-white.svg' : '/pv-logo-dark.svg'}
                alt="PiggyVest"
                height="22"
                style={{ display: 'block' }}
              />
              <div className="pv-logo-sub" style={{ paddingLeft: '4px', borderLeft: '1px solid var(--border)', marginLeft: '4px' }}>
                Sentiment
              </div>
            </div>

            <nav className="pv-nav-links">
              <Link href="/" className="pv-nav-link">Dashboard</Link>
              <span className="pv-nav-link active">Tweet Browser</span>
            </nav>
          </div>

          {/* Desktop controls */}
          <div className="pv-nav-controls pv-hide-mobile">
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '800' }}>
                {filtered.length.toLocaleString()}
              </span>
              {' '}of{' '}
              <span style={{ fontWeight: '700' }}>{data.length.toLocaleString()}</span>
              {' '}tweets
            </div>
            <button className="pv-theme-btn" onClick={toggle}>
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`pv-hamburger${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <span className="pv-hamburger-bars">
              <span /><span /><span />
            </span>
          </button>
        </div>
      </nav>

      {/* ── Mobile menu drawer ─────────────────────────────────────── */}
      {menuOpen && (
        <>
          <div
            className="pv-mobile-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <aside className="pv-mobile-menu" role="dialog" aria-label="Menu">
            <div className="pv-mobile-menu-head">
              <div className="pv-mobile-menu-brand">
                <img
                  src={theme === 'dark' ? '/pv-logo-white.svg' : '/pv-logo-dark.svg'}
                  alt="PiggyVest"
                  height="20"
                  style={{ display: 'block' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>
                  Sentiment
                </span>
              </div>
              <button
                className="pv-mobile-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="pv-mobile-menu-section">
              <div className="pv-mobile-menu-section-label">Navigate</div>
              <Link
                href="/"
                className="pv-mobile-menu-link"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
                <span style={{ fontSize: '14px' }}>→</span>
              </Link>
              <span className="pv-mobile-menu-link active">
                Tweet Browser
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>you’re here</span>
              </span>
            </div>

            <div className="pv-mobile-menu-section">
              <div className="pv-mobile-menu-section-label">Stats</div>
              <div style={{
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: 'var(--bg-elevated)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                fontWeight: '500',
              }}>
                <div style={{ fontSize: '20px', color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {filtered.length.toLocaleString()}
                </div>
                <div>of {data.length.toLocaleString()} tweets showing</div>
              </div>
            </div>

            <div className="pv-mobile-menu-footer">
              <button
                className="pv-theme-btn"
                onClick={toggle}
                style={{ minHeight: '40px', justifyContent: 'center' }}
              >
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Main ────────────────────────────────────────────────────── */}
      <div className="pv-main">
        <div className="pv-wrap">

          {/* ── Filters card ──────────────────────────────────────── */}
          <div className="pv-filters pv-section">

            {/* Filters header row */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Filters</span>
                {activeFilters > 0 && (
                  <span className="pv-badge" style={{
                    background: 'var(--accent-primary-bg)',
                    color: 'var(--accent-primary)',
                    border: '1.5px solid var(--accent-primary)',
                  }}>
                    {activeFilters} active
                  </span>
                )}
              </div>
              <button className="pv-btn pv-btn-danger pv-btn-sm" onClick={resetFilters}>
                Reset all
              </button>
            </div>

            {/* Row 1: text search + dropdowns */}
            <div className="pv-filter-row" style={{ marginBottom: '0' }}>
              <input
                type="text"
                placeholder="Search tweet text…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pv-input"
                style={{ borderRadius: '10px', minWidth: '160px', flex: '1 1 200px' }}
              />
              <select value={sentiment} onChange={e => { setSentiment(e.target.value); setPage(0); }}
                className="pv-select" style={{ borderRadius: '10px', padding: '8px 12px', fontSize: '12px' }}>
                <option value="all">All Sentiments</option>
                <option value="very_negative">Very Negative</option>
                <option value="slightly_negative">Slightly Negative</option>
                <option value="neutral">Neutral</option>
                <option value="slightly_positive">Slightly Positive</option>
                <option value="very_positive">Very Positive</option>
              </select>
              <select value={intent} onChange={e => { setIntent(e.target.value); setPage(0); }}
                className="pv-select" style={{ borderRadius: '10px', padding: '8px 12px', fontSize: '12px' }}>
                <option value="all">All Intents</option>
                <option value="opinion">Opinion</option>
                <option value="inquiry">Inquiry</option>
                <option value="suggestion">Suggestion</option>
                <option value="complaint">Complaint</option>
                <option value="spam">Spam</option>
              </select>
              <select value={product} onChange={e => { setProduct(e.target.value); setPage(0); }}
                className="pv-select" style={{ borderRadius: '10px', padding: '8px 12px', fontSize: '12px' }}>
                <option value="all">All Products</option>
                <option value="PiggyVest">PiggyVest</option>
                <option value="Pocket">Pocket</option>
                <option value="PiggyVest_for_Business">PVB</option>
              </select>
              <select value={aspect} onChange={e => { setAspect(e.target.value); setPage(0); }}
                className="pv-select" style={{ borderRadius: '10px', padding: '8px 12px', fontSize: '12px' }}>
                <option value="all">All Aspects</option>
                {aspects.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {/* Divider */}
            <div className="pv-filter-divider" />

            {/* Row 2: datetime range */}
            <div className="pv-filter-row">
              <span className="pv-filter-label">Time Range</span>
              <span className="pv-badge pv-hide-mobile" style={{ background: 'var(--bg-elevated)', color: 'var(--text-dim)', fontSize: '9px' }}>
                minute precision
              </span>
              <input
                type="datetime-local"
                value={startDate}
                min={dateBounds.min}
                max={dateBounds.max}
                onChange={e => { setStartDate(e.target.value); setPage(0); }}
                className="pv-input"
              />
              <span style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '700' }}>→</span>
              <input
                type="datetime-local"
                value={endDate}
                min={dateBounds.min}
                max={dateBounds.max}
                onChange={e => { setEndDate(e.target.value); setPage(0); }}
                className="pv-input"
              />
              {(startDate || endDate) && (
                <button
                  className="pv-btn pv-btn-danger pv-btn-sm"
                  onClick={() => { setStartDate(''); setEndDate(''); setPage(0); }}
                >
                  Clear ×
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="pv-filter-divider" />

            {/* Row 3: exclude authors */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                Exclude Authors
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1 1 210px', minWidth: '180px', maxWidth: '280px' }}>
                  <input
                    type="text"
                    placeholder="Search author to exclude…"
                    value={authorSearch}
                    onChange={e => setAuthorSearch(e.target.value)}
                    className="pv-input"
                    style={{ borderRadius: '10px', width: '100%' }}
                  />
                  {authorSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      zIndex: 10,
                      width: '100%',
                      marginTop: '4px',
                      boxShadow: 'var(--shadow-md)',
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
                  <span key={a} className="pv-badge" style={{
                    background: 'var(--badge-vneg-bg)',
                    color: 'var(--accent-red)',
                    border: '1.5px solid var(--accent-red)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    padding: '4px 10px',
                  }}>
                    @{a}
                    <span
                      onClick={() => setExcludedAuthors(prev => prev.filter(x => x !== a))}
                      style={{ marginLeft: '5px', fontWeight: '800' }}
                    >×</span>
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* ── Tweet list card ───────────────────────────────────── */}
          <div className="pv-card pv-section">
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              marginBottom: '18px',
            }}>
              <div style={{ minWidth: 0 }}>
                <div className="pv-card-label">Tweet Stream</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontWeight: '500' }}>
                  {filtered.length.toLocaleString()} tweets · page {page + 1} of {totalPages || 1}
                </div>
              </div>
              {activeFilters > 0 && (
                <span className="pv-badge" style={{
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
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '56px 0' }}>
                <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.35 }}>◎</div>
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
                    <div className="pv-tweet-col">
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

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="pv-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={theme === 'dark' ? '/pv-logo-white.svg' : '/pv-logo-dark.svg'}
                alt="PiggyVest"
                height="18"
                style={{ display: 'block', opacity: 0.7 }}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '600' }}>Sentiment</span>
            </div>
            <Link href="/" style={{
              fontSize: '12px', color: 'var(--accent-primary)',
              fontWeight: '700', textDecoration: 'none',
            }}>
              ← Back to Dashboard
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
