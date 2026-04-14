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
  very_negative: '#C0392B',
  slightly_negative: '#E67E73',
  neutral: '#378ADD',
  slightly_positive: '#58D68D',
  very_positive: '#2ECC71',
};

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

  const dateBounds = useMemo(() => {
    const dates = data.map(d => d.created_at).filter(Boolean).sort();
    return { min: dates[0] || '', max: dates[dates.length - 1] || '' };
  }, [data]);

  const filtered = useMemo(() => {
    return data.filter(d => {
      if (product !== 'all' && !d.products_detected?.includes(product)) return false;
      if (intent !== 'all' && d.intent !== intent) return false;
      if (selectedAspect && d.aspect !== selectedAspect) return false;
      if (startDate && d.created_at < startDate) return false;
      if (endDate && d.created_at > endDate) return false;
      return true;
    });
  }, [data, product, intent, selectedAspect, startDate, endDate]);

  const aspectTweets = useMemo(() => {
    if (!selectedAspect) return [];
    return data.filter(d => d.aspect === selectedAspect).slice(0, 10);
  }, [data, selectedAspect]);

  const selectStyle: React.CSSProperties = {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '7px 14px',
    fontSize: '12px',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontWeight: '500',
    cursor: 'pointer',
    outline: 'none',
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-page)' }}>
      <div style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '600', letterSpacing: '0.05em' }}>Loading…</div>
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
        <div>
          <div style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '15px' }}>
            PiggyTech Sentiment Dashboard
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '1px' }}>
            Q1 2026 · {data.length} records
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/tweets"
            style={{
              fontSize: '12px',
              color: 'var(--accent-blue)',
              fontWeight: '600',
              textDecoration: 'none',
              padding: '6px 12px',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              background: 'var(--bg-elevated)',
            }}
          >
            View All Tweets →
          </Link>

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
            <option value="PiggyVest_for_Business">PiggyVest for Business</option>
          </select>

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
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '14px', lineHeight: 1 }}>{theme === 'dark' ? '☀' : '☾'}</span>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>

        {/* ── Date filter bar ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '14px 20px',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: 'var(--card-shadow)',
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Date Range
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={startDate}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={e => setStartDate(e.target.value)}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            />
            <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>to</span>
            <input
              type="date"
              value={endDate}
              min={dateBounds.min}
              max={dateBounds.max}
              onChange={e => setEndDate(e.target.value)}
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '6px', padding: '5px 10px', color: 'var(--text-primary)', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{ fontSize: '11px', color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              Clear dates ×
            </button>
          )}
          <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: 'auto' }}>
            Showing <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{filtered.length}</span> records
          </span>
        </div>

        {/* ── Scorecards ── */}
        <Scorecards data={filtered} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <SentimentPie data={filtered} />
          <AspectBar data={filtered} onAspectClick={setSelectedAspect} selectedAspect={selectedAspect} />
        </div>

        {/* ── Aspect drill-down ── */}
        {selectedAspect && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-focus)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '12px',
            boxShadow: 'var(--card-shadow)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Aspect Drill-Down
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '2px' }}>
                  {selectedAspect.replace(/_/g, ' ')} — Top 10 Tweets
                </div>
              </div>
              <button
                onClick={() => setSelectedAspect(null)}
                style={{ fontSize: '11px', color: 'var(--accent-red)', background: 'none', border: '1px solid var(--accent-red)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
              >
                Close ×
              </button>
            </div>

            {aspectTweets.map((tweet, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--row-border)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: SENT_COLORS[tweet.overall_sentiment] || 'var(--text-dim)', flexShrink: 0, marginTop: '6px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '4px' }}>{tweet.tweet_text}</div>
                  {tweet.author_username && (
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>@{tweet.author_username}</span>
                  )}
                </div>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  background: 'var(--bg-elevated)', color: SENT_COLORS[tweet.overall_sentiment] || 'var(--text-dim)',
                  whiteSpace: 'nowrap', fontWeight: '600', flexShrink: 0,
                }}>
                  {tweet.overall_sentiment?.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        )}

        <ProductBar data={filtered} />
        <TweetTable data={filtered} />

      </div>
    </div>
  );
}
