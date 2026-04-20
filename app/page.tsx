'use client';
import Scorecards from '@/components/Scorecards';
import SentimentPie from '@/components/Sentimentpie';
import AspectBar from '@/components/AspectBar';
import ProductBar from '@/components/ProductBar';
import TweetTable from '@/components/TweetTable';
import { useTheme } from '@/components/ThemeProvider';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

// Sentiment dot colours — kept as CSS vars so they respect light/dark theme
const SENT_COLORS: Record<string, string> = {
  very_negative:     'var(--sent-vneg)',
  slightly_negative: 'var(--sent-sneg)',
  neutral:           'var(--sent-neu)',
  slightly_positive: 'var(--sent-spos)',
  very_positive:     'var(--sent-vpos)',
};

// Convert "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM" (datetime-local format)
function toDatetimeLocal(s: string): string {
  return s ? s.slice(0, 16).replace(' ', 'T') : '';
}

// Convert datetime-local "YYYY-MM-DDTHH:MM" → "YYYY-MM-DD HH:MM" for comparison
function fromDatetimeLocal(s: string): string {
  return s ? s.replace('T', ' ') : '';
}

export default function Home() {
  const { theme, toggle } = useTheme();
  const [data, setData]                     = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [product, setProduct]               = useState('all');
  const [intent, setIntent]                 = useState('all');
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [startDate, setStartDate]           = useState('');
  const [endDate, setEndDate]               = useState('');

  useEffect(() => {
    fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => { setData(json.data || []); setLoading(false); })
      .catch(err => { console.error('Fetch error:', err); setLoading(false); });
  }, []);

  // Date bounds for datetime-local min/max
  const dateBounds = useMemo(() => {
    const dates = data.map(d => d.created_at).filter(Boolean).sort();
    return {
      min: toDatetimeLocal(dates[0] || ''),
      max: toDatetimeLocal(dates[dates.length - 1] || ''),
    };
  }, [data]);

  const filtered = useMemo(() => {
    const normStart = fromDatetimeLocal(startDate);
    const normEnd   = endDate ? fromDatetimeLocal(endDate) + ':59' : '';
    return data.filter(d => {
      if (product !== 'all' && !d.products_detected?.includes(product)) return false;
      if (intent !== 'all' && d.intent !== intent) return false;
      if (selectedAspect && d.aspect !== selectedAspect) return false;
      if (normStart && d.created_at < normStart) return false;
      if (normEnd   && d.created_at > normEnd)   return false;
      return true;
    });
  }, [data, product, intent, selectedAspect, startDate, endDate]);

  const aspectTweets = useMemo(() => {
    if (!selectedAspect) return [];
    return data.filter(d => d.aspect === selectedAspect).slice(0, 10);
  }, [data, selectedAspect]);

  const heroStats = useMemo(() => {
    const pos  = filtered.filter(d => d.overall_sentiment?.includes('positive')).length;
    const neg  = filtered.filter(d => d.overall_sentiment?.includes('negative')).length;
    const total = filtered.length || 1;
    return { pos, neg, total, posRate: Math.round((pos / total) * 100) };
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

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="pv-nav">
        <div className="pv-wrap pv-nav-inner">

          {/* Brand + links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="pv-logo">
              <div className="pv-logo-mark">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="9" width="3" height="7" rx="1" fill="white"/>
                  <rect x="7" y="5" width="3" height="11" rx="1" fill="white"/>
                  <rect x="12" y="2" width="3" height="14" rx="1" fill="white"/>
                </svg>
              </div>
              <div>
                <div className="pv-logo-name">PiggyTech Sentiment</div>
                <div className="pv-logo-sub">Social Intelligence Dashboard</div>
              </div>
            </div>

            <nav className="pv-nav-links">
              <span className="pv-nav-link active">Dashboard</span>
              <Link href="/tweets" className="pv-nav-link">Tweet Browser</Link>
            </nav>
          </div>

          {/* Controls */}
          <div className="pv-nav-controls">
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
              <option value="all">All Products</option>
              <option value="PiggyVest">PiggyVest</option>
              <option value="Pocket">Pocket</option>
              <option value="PiggyVest_for_Business">PVB</option>
            </select>

            <span className="pv-badge pv-badge-live">Live</span>

            <button className="pv-theme-btn" onClick={toggle}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="pv-hero">
        <div className="pv-wrap">
          <div className="pv-hero-inner">

            <div>
              <div className="pv-hero-eyebrow">
                <h1 className="pv-hero-title" style={{ marginBottom: 0 }}>Brand Sentiment Overview</h1>
                <span className="pv-badge pv-badge-period">Q1 2026</span>
              </div>
              <p className="pv-hero-sub">
                Real-time social intelligence across PiggyVest, Pocket, and PiggyVest for Business.
                Scraped from X every 30 minutes and labelled with AI.
              </p>
            </div>

            {/* Quick stats */}
            <div className="pv-hero-stats">
              {[
                { label: 'Total Records',  val: data.length.toLocaleString(),     color: 'var(--accent-primary)' },
                { label: 'Showing',        val: filtered.length.toLocaleString(), color: 'var(--accent-blue)' },
                { label: 'Positivity',     val: `${heroStats.posRate}%`,
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
              <span className="pv-badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-dim)', fontSize: '9px' }}>
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

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
              borderColor: 'var(--accent-primary)',
              boxShadow: 'var(--accent-primary-glow)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
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
                  <div style={{ flex: 1 }}>
                    <div className="pv-tweet-text">{tweet.tweet_text}</div>
                    {tweet.author_username && (
                      <span className="pv-tweet-author">@{tweet.author_username}</span>
                    )}
                  </div>
                  <span className="pv-badge" style={{
                    background: tweet.overall_sentiment?.includes('positive')
                      ? 'var(--badge-vpos-bg)'
                      : tweet.overall_sentiment?.includes('negative')
                      ? 'var(--badge-vneg-bg)'
                      : 'var(--badge-neu-bg)',
                    color: SENT_COLORS[tweet.overall_sentiment] || 'var(--text-dim)',
                    flexShrink: 0,
                  }}>
                    {tweet.overall_sentiment?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Product sentiment ─────────────────────────────────── */}
          <ProductBar data={filtered} />

          {/* ── Tweet stream ──────────────────────────────────────── */}
          <div className="pv-section">
            <TweetTable data={filtered} />
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="pv-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="pv-logo-mark" style={{ width: '26px', height: '26px', borderRadius: '7px' }}>
                <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="9" width="3" height="7" rx="1" fill="white"/>
                  <rect x="7" y="5" width="3" height="11" rx="1" fill="white"/>
                  <rect x="12" y="2" width="3" height="14" rx="1" fill="white"/>
                </svg>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-muted)' }}>
                PiggyTech Sentiment
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Powered by Gemini 2.0 Flash · Scraped via Apify
              </span>
              <Link href="/tweets" style={{
                fontSize: '12px', color: 'var(--accent-primary)',
                fontWeight: '700', textDecoration: 'none',
              }}>
                View all tweets →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
