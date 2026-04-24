'use client';
import Scorecards from '@/components/Scorecards';
import SentimentPie from '@/components/Sentimentpie';
import AspectBar from '@/components/AspectBar';
import ProductBar from '@/components/ProductBar';
import TweetTable from '@/components/TweetTable';
import { useTheme } from '@/components/ThemeProvider';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { isPiggyTech, getDisplayName } from '@/lib/products';

const EXT_COLORS = ['#F0903A', '#9F7AEA', '#4DB89E', '#E88C1A', '#3D8EF0', '#FC5959', '#48BB78'];

const SENT_COLORS: Record<string, string> = {
  very_negative:     'var(--sent-vneg)',
  slightly_negative: 'var(--sent-sneg)',
  neutral:           'var(--sent-neu)',
  slightly_positive: 'var(--sent-spos)',
  very_positive:     'var(--sent-vpos)',
};

function toDatetimeLocal(s: string): string {
  return s ? s.slice(0, 16).replace(' ', 'T') : '';
}
function fromDatetimeLocal(s: string): string {
  return s ? s.replace('T', ' ') : '';
}

export default function ExternalPage() {
  const { theme, toggle } = useTheme();
  const [data, setData]                     = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [product, setProduct]               = useState('all');
  const [intent, setIntent]                 = useState('all');
  const [sentiment, setSentiment]           = useState('all');
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');
  const [menuOpen, setMenuOpen]             = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => { setData(json.data || []); setLoading(false); })
      .catch(err => { console.error('Fetch error:', err); setLoading(false); });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // External tweets = aspect_product NOT in PIGGTECH_SET
  const extData = useMemo(() => data.filter(d => d.aspect_product && !isPiggyTech(d.aspect_product)), [data]);

  // Date bounds
  const dateBounds = useMemo(() => {
    const dates = extData.map(d => d.created_at).filter(Boolean).sort();
    return {
      min: toDatetimeLocal(dates[0] || ''),
      max: toDatetimeLocal(dates[dates.length - 1] || ''),
    };
  }, [extData]);

  // Unique external products for dropdown
  const extProducts = useMemo(() =>
    [...new Set(extData.map(d => d.aspect_product).filter(Boolean))].sort() as string[],
    [extData]
  );

  // Build consistent color map for external products
  const extColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    extProducts.forEach((p, i) => { map[p] = EXT_COLORS[i % EXT_COLORS.length]; });
    return map;
  }, [extProducts]);

  const filtered = useMemo(() => {
    const normStart = fromDatetimeLocal(startDate);
    const normEnd   = endDate ? fromDatetimeLocal(endDate) + ':59' : '';
    return extData.filter(d => {
      if (product !== 'all' && d.aspect_product !== product) return false;
      if (intent !== 'all' && d.intent !== intent) return false;
      if (sentiment !== 'all' && d.overall_sentiment !== sentiment) return false;
      if (selectedAspect && d.aspect !== selectedAspect) return false;
      if (normStart && d.created_at < normStart) return false;
      if (normEnd   && d.created_at > normEnd)   return false;
      return true;
    });
  }, [extData, product, intent, sentiment, selectedAspect, startDate, endDate]);

  const aspectTweets = useMemo(() => {
    if (!selectedAspect) return [];
    return extData.filter(d => d.aspect === selectedAspect).slice(0, 10);
  }, [extData, selectedAspect]);

  const heroStats = useMemo(() => {
    const pos  = filtered.filter(d => d.overall_sentiment?.includes('positive')).length;
    const total = filtered.length || 1;
    return { pos, total, posRate: Math.round((pos / total) * 100) };
  }, [filtered]);

  if (loading) return (
    <div className="pv-loading">
      <div className="pv-spinner" />
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
        Loading sentiment data…
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingTop: '3px' }}>

      {/* ── Accent bar ─────────────────────────────────────────────── */}
      <div className="pv-accent-bar" />

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="pv-nav">
        <div className="pv-wrap pv-nav-inner">

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
              <span className="pv-nav-link active">External</span>
              <Link href="/compare" className="pv-nav-link">Compare</Link>
              <Link href="/tweets" className="pv-nav-link">Tweets</Link>
            </nav>
          </div>

          <div className="pv-nav-controls pv-hide-mobile">
            <select value={sentiment} onChange={e => setSentiment(e.target.value)}
              className="pv-select" style={{ borderRadius: '10px', padding: '7px 12px', fontSize: '12px' }}>
              <option value="all">All Sentiments</option>
              <option value="very_negative">Very Negative</option>
              <option value="slightly_negative">Slightly Negative</option>
              <option value="neutral">Neutral</option>
              <option value="slightly_positive">Slightly Positive</option>
              <option value="very_positive">Very Positive</option>
            </select>

            <select value={intent} onChange={e => setIntent(e.target.value)}
              className="pv-select" style={{ borderRadius: '10px', padding: '7px 12px', fontSize: '12px' }}>
              <option value="all">All Intents</option>
              <option value="opinion">Opinion</option>
              <option value="inquiry">Inquiry</option>
              <option value="suggestion">Suggestion</option>
              <option value="complaint">Complaint</option>
              <option value="spam">Spam</option>
            </select>

            <select value={product} onChange={e => setProduct(e.target.value)}
              className="pv-select" style={{ borderRadius: '10px', padding: '7px 12px', fontSize: '12px' }}>
              <option value="all">All External Products</option>
              {extProducts.map(p => (
                <option key={p} value={p}>{getDisplayName(p)}</option>
              ))}
            </select>

            <button className="pv-theme-btn" onClick={toggle}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

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
              <button className="pv-mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
            </div>

            <div className="pv-mobile-menu-section">
              <div className="pv-mobile-menu-section-label">Navigate</div>
              <Link href="/" className="pv-mobile-menu-link" onClick={() => setMenuOpen(false)}>
                Dashboard
                <span style={{ fontSize: '14px' }}>→</span>
              </Link>
              <span className="pv-mobile-menu-link active">
                External
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>you're here</span>
              </span>
              <Link href="/compare" className="pv-mobile-menu-link" onClick={() => setMenuOpen(false)}>
                Compare
                <span style={{ fontSize: '14px' }}>→</span>
              </Link>
              <Link href="/tweets" className="pv-mobile-menu-link" onClick={() => setMenuOpen(false)}>
                Tweet Browser
                <span style={{ fontSize: '14px' }}>→</span>
              </Link>
            </div>

            <div className="pv-mobile-menu-section">
              <div className="pv-mobile-menu-section-label">Filters</div>
              <select value={sentiment} onChange={e => setSentiment(e.target.value)} className="pv-select" style={{ borderRadius: '12px', width: '100%' }}>
                <option value="all">All Sentiments</option>
                <option value="very_negative">Very Negative</option>
                <option value="slightly_negative">Slightly Negative</option>
                <option value="neutral">Neutral</option>
                <option value="slightly_positive">Slightly Positive</option>
                <option value="very_positive">Very Positive</option>
              </select>
              <select value={intent} onChange={e => setIntent(e.target.value)} className="pv-select" style={{ borderRadius: '12px', width: '100%' }}>
                <option value="all">All Intents</option>
                <option value="opinion">Opinion</option>
                <option value="inquiry">Inquiry</option>
                <option value="suggestion">Suggestion</option>
                <option value="complaint">Complaint</option>
                <option value="spam">Spam</option>
              </select>
              <select value={product} onChange={e => setProduct(e.target.value)} className="pv-select" style={{ borderRadius: '12px', width: '100%' }}>
                <option value="all">All External Products</option>
                {extProducts.map(p => (
                  <option key={p} value={p}>{getDisplayName(p)}</option>
                ))}
              </select>
            </div>

            <div className="pv-mobile-menu-footer">
              <button className="pv-theme-btn" onClick={toggle} style={{ minHeight: '40px' }}>
                <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="pv-hero" style={{ background: 'var(--tint-yellow)' }}>
        <div className="pv-wrap">
          <div className="pv-hero-inner">
            <div style={{ minWidth: 0 }}>
              <div className="pv-hero-eyebrow">
                <h1 className="pv-hero-title" style={{ marginBottom: 0 }}>External Product Intelligence</h1>
                <span className="pv-badge" style={{
                  background: 'rgba(240,144,58,0.15)',
                  color: 'var(--accent-orange)',
                  border: '1.5px solid var(--accent-orange)',
                }}>Competitors</span>
              </div>
              <p className="pv-hero-sub">
                Social sentiment for external and competitor products mentioned alongside PiggyTech.
                Excludes all PiggyTech products — shows only third-party brands.
              </p>
            </div>

            <div className="pv-hero-stats">
              {[
                { label: 'External Records',  val: extData.length.toLocaleString(),    color: 'var(--accent-orange)' },
                { label: 'Showing',           val: filtered.length.toLocaleString(),   color: 'var(--accent-blue)' },
                { label: 'Positivity',        val: `${heroStats.posRate}%`,
                  color: heroStats.posRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' },
              ].map(stat => (
                <div key={stat.label} className="pv-hero-stat">
                  <div className="pv-hero-stat-val" style={{ color: stat.color }}>{stat.val}</div>
                  <div className="pv-hero-stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="pv-main">
        <div className="pv-wrap">

          {/* ── Filter strip ──────────────────────────────────────── */}
          <div className="pv-filters pv-section">
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
                onChange={e => setStartDate(e.target.value)}
                className="pv-input"
              />
              <span style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '700' }}>→</span>
              <input
                type="datetime-local"
                value={endDate}
                min={dateBounds.min}
                max={dateBounds.max}
                onChange={e => setEndDate(e.target.value)}
                className="pv-input"
              />

              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="pv-btn pv-btn-danger pv-btn-sm"
                >
                  Clear ×
                </button>
              )}

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Showing</span>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '800', letterSpacing: '-0.02em' }}>
                  {filtered.length.toLocaleString()}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>records</span>
              </div>
            </div>
          </div>

          {/* ── Metric scorecards ─────────────────────────────────── */}
          <Scorecards data={filtered} />

          {/* ── Charts row ────────────────────────────────────────── */}
          <div className="pv-grid-2 pv-section">
            <SentimentPie data={filtered} />
            <AspectBar data={filtered} onAspectClick={setSelectedAspect} selectedAspect={selectedAspect} />
          </div>

          {/* ── Aspect drill-down ─────────────────────────────────── */}
          {selectedAspect && (
            <div className="pv-card pv-fade-up pv-section" style={{
              borderColor: 'var(--accent-orange)',
              boxShadow: '0 4px 20px rgba(240,144,58,0.15)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="pv-card-label">Aspect Drill-Down</div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '5px', letterSpacing: '-0.02em' }}>
                    {selectedAspect.replace(/_/g, ' ')}
                    <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '500', marginLeft: '8px' }}>
                      — top 10 tweets
                    </span>
                  </div>
                </div>
                <button className="pv-btn pv-btn-danger pv-btn-sm" onClick={() => setSelectedAspect(null)}>
                  Close ×
                </button>
              </div>

              {aspectTweets.map((tweet, i) => (
                <div key={i} className="pv-tweet">
                  <div
                    className="pv-tweet-dot"
                    style={{ background: SENT_COLORS[tweet.overall_sentiment] || 'var(--text-dim)' }}
                  />
                  <div className="pv-tweet-col">
                    <div className="pv-tweet-text">{tweet.tweet_text}</div>
                    {tweet.author_username && (
                      <span className="pv-tweet-author">@{tweet.author_username}</span>
                    )}
                  </div>
                  <div className="pv-tweet-badges">
                    <span className="pv-badge" style={{
                      background: tweet.overall_sentiment?.includes('positive')
                        ? 'var(--badge-vpos-bg)'
                        : tweet.overall_sentiment?.includes('negative')
                        ? 'var(--badge-vneg-bg)'
                        : 'var(--badge-neu-bg)',
                      color: SENT_COLORS[tweet.overall_sentiment] || 'var(--text-dim)',
                    }}>
                      {tweet.overall_sentiment?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Product sentiment ─────────────────────────────────── */}
          <ProductBar data={filtered} showSubProducts={false} productColors={extColorMap} />

          {/* ── Tweet stream ──────────────────────────────────────── */}
          <div className="pv-section">
            <TweetTable data={filtered} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Powered by Gemini 2.0 Flash · Scraped via Apify
              </span>
              <Link href="/" style={{
                fontSize: '12px', color: 'var(--accent-primary)',
                fontWeight: '700', textDecoration: 'none',
              }}>
                ← Dashboard
              </Link>
              <Link href="/compare" style={{
                fontSize: '12px', color: 'var(--accent-purple)',
                fontWeight: '700', textDecoration: 'none',
              }}>
                Compare products →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
