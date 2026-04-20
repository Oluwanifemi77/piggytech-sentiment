'use client';
import Scorecards from '@/components/Scorecards';
import SentimentPie from '@/components/Sentimentpie';
import AspectBar from '@/components/AspectBar';
import ProductBar from '@/components/ProductBar';
import TweetTable from '@/components/TweetTable';
import { useTheme } from '@/components/ThemeProvider';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

const SENT_COLORS: Record<string, string> = {
  very_negative:     '#F05555',
  slightly_negative: '#F08850',
  neutral:           '#5B9CF6',
  slightly_positive: '#4DE09C',
  very_positive:     '#00C571',
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
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState('all');
  const [intent, setIntent] = useState('all');
  const [selectedAspect, setSelectedAspect] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        setData(json.data || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fetch error:', err);
        setLoading(false);
      });
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
    // Add :59 so the full minute is included in end
    const normEnd = endDate ? fromDatetimeLocal(endDate) + ':59' : '';

    return data.filter(d => {
      if (product !== 'all' && !d.products_detected?.includes(product)) return false;
      if (intent !== 'all' && d.intent !== intent) return false;
      if (selectedAspect && d.aspect !== selectedAspect) return false;
      if (normStart && d.created_at < normStart) return false;
      if (normEnd && d.created_at > normEnd) return false;
      return true;
    });
  }, [data, product, intent, selectedAspect, startDate, endDate]);

  const aspectTweets = useMemo(() => {
    if (!selectedAspect) return [];
    return data.filter(d => d.aspect === selectedAspect).slice(0, 10);
  }, [data, selectedAspect]);

  // Summary stats for hero
  const heroStats = useMemo(() => {
    const pos = filtered.filter(d => d.overall_sentiment?.includes('positive')).length;
    const neg = filtered.filter(d => d.overall_sentiment?.includes('negative')).length;
    const total = filtered.length || 1;
    const products = new Set(filtered.map(d => d.aspect_product).filter(Boolean)).size;
    return { pos, neg, total, products, posRate: Math.round((pos / total) * 100) };
  }, [filtered]);

  const selectStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '12px',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontWeight: '500',
    cursor: 'pointer',
    outline: 'none',
    fontFamily: 'inherit',
  };

  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
        Loading sentiment data…
      </div>
    </div>
  );

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', paddingTop: '3px' }}>

      {/* ── Navbar ─────────────────────────────────────────────── */}
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
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '15px', fontWeight: '800', color: '#fff',
              flexShrink: 0,
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

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="nav-link active">Dashboard</span>
            <Link href="/tweets" className="nav-link">Tweet Browser</Link>
          </div>
        </div>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select value={intent} onChange={e => setIntent(e.target.value)} style={selectStyle}>
            <option value="all">All Intents</option>
            <option value="opinion">Opinion</option>
            <option value="inquiry">Inquiry</option>
            <option value="suggestion">Suggestion</option>
            <option value="complaint">Complaint</option>
            <option value="spam">Spam</option>
          </select>

          <select value={product} onChange={e => setProduct(e.target.value)} style={selectStyle}>
            <option value="all">All Products</option>
            <option value="PiggyVest">PiggyVest</option>
            <option value="Pocket">Pocket</option>
            <option value="PiggyVest_for_Business">PVB</option>
          </select>

          {/* Live badge */}
          <span className="badge badge-live" style={{ fontSize: '11px', padding: '5px 10px' }}>
            Live
          </span>

          {/* Theme toggle */}
          <button className="theme-toggle" onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────── */}
      <div className="hero" style={{ padding: '28px 28px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                Brand Sentiment Overview
              </h1>
              <span style={{
                fontSize: '10px', padding: '3px 10px', borderRadius: '20px',
                background: 'var(--accent-primary-bg)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)',
                fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase',
              }}>
                Q1 2026
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500', maxWidth: '460px', lineHeight: 1.6 }}>
              Real-time social intelligence across PiggyVest, Pocket, and PiggyVest for Business.
              Scraped from X every 30 minutes and labelled with AI.
            </p>
          </div>

          {/* Quick stats */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { label: 'Total Records', val: data.length.toLocaleString(), color: 'var(--accent-primary)' },
              { label: 'Showing', val: filtered.length.toLocaleString(), color: 'var(--accent-blue)' },
              { label: 'Positivity Rate', val: `${heroStats.posRate}%`, color: heroStats.posRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '12px 16px',
                textAlign: 'center',
                minWidth: '100px',
                boxShadow: 'var(--card-shadow)',
              }}>
                <div style={{ fontSize: '20px', fontWeight: '800', color: stat.color, lineHeight: 1 }}>
                  {stat.val}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 28px' }}>

        {/* ── Datetime Filter Strip ───────────────────────────── */}
        <div className="filter-strip" style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                Time Range
              </span>
              <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-dim)', fontSize: '9px' }}>
                minute precision
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="datetime-local"
                value={startDate}
                min={dateBounds.min}
                max={dateBounds.max}
                onChange={e => setStartDate(e.target.value)}
                style={{
                  ...selectStyle,
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '12px',
                }}
              />
              <span style={{ color: 'var(--text-dim)', fontSize: '12px', fontWeight: '600' }}>→</span>
              <input
                type="datetime-local"
                value={endDate}
                min={dateBounds.min}
                max={dateBounds.max}
                onChange={e => setEndDate(e.target.value)}
                style={{
                  ...selectStyle,
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '12px',
                }}
              />
            </div>

            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="btn-danger btn"
                style={{ padding: '6px 12px', fontSize: '11px' }}
              >
                Clear ×
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Showing</span>
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '800' }}>
                {filtered.length.toLocaleString()}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>records</span>
            </div>
          </div>
        </div>

        {/* ── Scorecards ─────────────────────────────────────── */}
        <Scorecards data={filtered} />

        {/* ── Charts Row ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <SentimentPie data={filtered} />
          <AspectBar data={filtered} onAspectClick={setSelectedAspect} selectedAspect={selectedAspect} />
        </div>

        {/* ── Aspect Drill-Down ──────────────────────────────── */}
        {selectedAspect && (
          <div className="card fade-in" style={{
            marginBottom: '14px',
            borderColor: 'var(--accent-primary)',
            borderRadius: '16px',
            boxShadow: 'var(--accent-primary-glow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div className="text-label">Aspect Drill-Down</div>
                <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '4px' }}>
                  {selectedAspect.replace(/_/g, ' ')}
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '500', marginLeft: '8px' }}>
                    — top 10 tweets
                  </span>
                </div>
              </div>
              <button
                className="btn btn-danger"
                onClick={() => setSelectedAspect(null)}
                style={{ fontSize: '11px', padding: '6px 12px' }}
              >
                Close ×
              </button>
            </div>

            {aspectTweets.map((tweet, i) => (
              <div key={i} className="tweet-row">
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: SENT_COLORS[tweet.overall_sentiment] || 'var(--text-dim)',
                  flexShrink: 0, marginTop: '6px',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '5px' }}>
                    {tweet.tweet_text}
                  </div>
                  {tweet.author_username && (
                    <span style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600' }}>
                      @{tweet.author_username}
                    </span>
                  )}
                </div>
                <span className="badge" style={{
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

        {/* ── Product Sentiment ──────────────────────────────── */}
        <ProductBar data={filtered} />

        {/* ── Tweet Stream ───────────────────────────────────── */}
        <TweetTable data={filtered} />

        {/* ── Footer ─────────────────────────────────────────── */}
        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Powered by Gemini 2.0 Flash · Scraped via Apify
            </span>
            <Link href="/tweets" style={{ fontSize: '11px', color: 'var(--accent-primary)', fontWeight: '600', textDecoration: 'none' }}>
              View all tweets →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
