'use client';
import { useTheme } from '@/components/ThemeProvider';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { isPiggyTech, getDisplayName, PIGGTECH_SET, avgScore } from '@/lib/products';
import { SENT_HEX } from '@/components/ProductBar';

const EXT_COLORS = ['#F0903A', '#9F7AEA', '#4DB89E', '#E88C1A', '#3D8EF0', '#FC5959', '#48BB78'];

const PV_COLORS: Record<string, string> = {
  PiggyVest:              '#122FC0',
  Pocket:                 '#0D60D8',
  PiggyVest_for_Business: '#10B259',
  PVB:                    '#10B259',
  Investify:              '#3D8EF0',
  PiggyFx:                '#9F7AEA',
  Shared:                 '#6B46C1',
};

const MAX_SELECTED = 4;

function computeCardStats(d: any[]) {
  const total = d.length || 1;
  const pos = d.filter(x => x.overall_sentiment?.includes('positive')).length;
  const neg = d.filter(x => x.overall_sentiment?.includes('negative')).length;
  const neu = d.filter(x => x.overall_sentiment === 'neutral').length;
  const posRate = Math.round((pos / total) * 100);
  const negRate = Math.round((neg / total) * 100);
  const neuRate = 100 - posRate - negRate;
  const score = avgScore(d);

  // Top aspects
  const aspectCount: Record<string, number> = {};
  d.forEach(x => { if (x.aspect) { aspectCount[x.aspect] = (aspectCount[x.aspect] || 0) + 1; } });
  const topAspects = Object.entries(aspectCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return { total: d.length, pos, neg, neu, posRate, negRate, neuRate, score, topAspects };
}

interface CompareCardProps {
  productKey: string;
  data: any[];
  color: string;
  isPiggyTechProduct: boolean;
}

function CompareCard({ productKey, data, color, isPiggyTechProduct }: CompareCardProps) {
  const stats = useMemo(() => computeCardStats(data), [data]);
  const displayName = getDisplayName(productKey);

  return (
    <div className="pv-compare-card">
      {/* Top color bar */}
      <div className="pv-compare-card-top-bar" style={{ background: color }} />

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '16px',
            fontWeight: '800',
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            {displayName}
          </span>
          <span className="pv-badge" style={{
            background: isPiggyTechProduct ? 'var(--accent-primary-bg)' : 'rgba(240,144,58,0.12)',
            color: isPiggyTechProduct ? 'var(--accent-primary)' : 'var(--accent-orange)',
            border: `1.5px solid ${isPiggyTechProduct ? 'var(--accent-primary)' : 'var(--accent-orange)'}`,
            fontSize: '9px',
          }}>
            {isPiggyTechProduct ? 'PiggyTech' : 'External'}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', fontWeight: '500' }}>
          {stats.total.toLocaleString()} mention{stats.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Positivity rate */}
      <div>
        <div style={{
          fontSize: '36px',
          fontWeight: '800',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: stats.posRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
        }}>
          {stats.posRate}%
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600', marginTop: '3px' }}>
          positivity rate
        </div>
      </div>

      {/* Sentiment tri-bar */}
      <div>
        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Sentiment Distribution
        </div>
        <div className="pv-sentiment-tri-bar">
          {stats.posRate > 0 && (
            <div style={{ width: `${stats.posRate}%`, background: '#10B259', borderRadius: '6px 0 0 6px' }} title={`Positive: ${stats.posRate}%`} />
          )}
          {stats.neuRate > 0 && (
            <div style={{ width: `${stats.neuRate}%`, background: '#3182CE' }} title={`Neutral: ${stats.neuRate}%`} />
          )}
          {stats.negRate > 0 && (
            <div style={{ width: `${stats.negRate}%`, background: '#E53E3E', borderRadius: '0 6px 6px 0' }} title={`Negative: ${stats.negRate}%`} />
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
            <span style={{ color: '#10B259', fontWeight: '700' }}>{stats.posRate}%</span> pos
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
            <span style={{ color: '#3182CE', fontWeight: '700' }}>{stats.neuRate}%</span> neu
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>
            <span style={{ color: '#E53E3E', fontWeight: '700' }}>{stats.negRate}%</span> neg
          </span>
        </div>
      </div>

      {/* Avg score */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'var(--bg-elevated)',
        borderRadius: '10px',
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '600' }}>Avg sentiment score</span>
        <span style={{
          fontSize: '18px',
          fontWeight: '800',
          letterSpacing: '-0.03em',
          color: stats.score >= 3.5 ? 'var(--accent-green)' : stats.score <= 2.5 ? 'var(--accent-red)' : 'var(--accent-blue)',
        }}>
          {stats.score > 0 ? `${stats.score} / 5` : '—'}
        </span>
      </div>

      {/* Top aspects */}
      {stats.topAspects.length > 0 && (
        <div>
          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Top Aspects
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {stats.topAspects.map(a => (
              <li key={a} style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '500',
              }}>
                <span style={{
                  width: '4px', height: '4px', borderRadius: '50%',
                  background: color, flexShrink: 0, display: 'inline-block',
                }} />
                {a.replace(/_/g, ' ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const { theme, toggle } = useTheme();
  const [data, setData]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<string[]>([]);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        const records = json.data || [];
        setData(records);

        // Default selection: PiggyVest + Cowrywise (if available)
        const allProducts = [...new Set(records.map((d: any) => d.aspect_product).filter(Boolean))] as string[];
        const defaults: string[] = [];
        if (allProducts.includes('PiggyVest')) defaults.push('PiggyVest');
        const cowry = allProducts.find(p => p === 'Cowrywise');
        if (cowry) defaults.push(cowry);
        setSelected(defaults);

        setLoading(false);
      })
      .catch(err => { console.error('Fetch error:', err); setLoading(false); });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // All unique products, split into PiggyTech and External
  const allProducts = useMemo(() =>
    [...new Set(data.map((d: any) => d.aspect_product).filter(Boolean))] as string[],
    [data]
  );

  const pvProducts = useMemo(() => allProducts.filter(p => PIGGTECH_SET.has(p)), [allProducts]);
  const extProducts = useMemo(() => allProducts.filter(p => !PIGGTECH_SET.has(p)).sort(), [allProducts]);

  // Tweet count per product
  const tweetCount = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(d => {
      if (d.aspect_product) map[d.aspect_product] = (map[d.aspect_product] || 0) + 1;
    });
    return map;
  }, [data]);

  // External color map (consistent)
  const extColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    extProducts.forEach((p, i) => { map[p] = EXT_COLORS[i % EXT_COLORS.length]; });
    return map;
  }, [extProducts]);

  const getColor = (p: string) => PV_COLORS[p] || extColorMap[p] || '#888';

  const toggleProduct = (p: string) => {
    setSelected(prev => {
      if (prev.includes(p)) return prev.filter(x => x !== p);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, p];
    });
  };

  // Data for each selected product
  const selectedData = useMemo(() => {
    return selected.map(p => ({
      productKey: p,
      data: data.filter(d => d.aspect_product === p),
      color: getColor(p),
      isPiggyTechProduct: PIGGTECH_SET.has(p),
    }));
  }, [selected, data, extColorMap]);

  // Combined bar chart data for selected products
  const SENTIMENTS = ['very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive'];
  const SENT_LABELS: Record<string, string> = {
    very_negative:     'Very Neg',
    slightly_negative: 'Slightly Neg',
    neutral:           'Neutral',
    slightly_positive: 'Slightly Pos',
    very_positive:     'Very Pos',
  };

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
              <Link href="/external" className="pv-nav-link">External</Link>
              <span className="pv-nav-link active">Compare</span>
              <Link href="/tweets" className="pv-nav-link">Tweets</Link>
            </nav>
          </div>

          <div className="pv-nav-controls pv-hide-mobile">
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '500' }}>
              {selected.length} of {MAX_SELECTED} selected
            </span>
            <button className="pv-theme-btn" onClick={toggle}>
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
            <span className="pv-hamburger-bars"><span /><span /><span /></span>
          </button>
        </div>
      </nav>

      {/* ── Mobile menu drawer ─────────────────────────────────────── */}
      {menuOpen && (
        <>
          <div className="pv-mobile-menu-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />
          <aside className="pv-mobile-menu" role="dialog" aria-label="Menu">
            <div className="pv-mobile-menu-head">
              <div className="pv-mobile-menu-brand">
                <img
                  src={theme === 'dark' ? '/pv-logo-white.svg' : '/pv-logo-dark.svg'}
                  alt="PiggyVest" height="20"
                  style={{ display: 'block' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.04em' }}>Sentiment</span>
              </div>
              <button className="pv-mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button>
            </div>
            <div className="pv-mobile-menu-section">
              <div className="pv-mobile-menu-section-label">Navigate</div>
              <Link href="/" className="pv-mobile-menu-link" onClick={() => setMenuOpen(false)}>
                Dashboard <span style={{ fontSize: '14px' }}>→</span>
              </Link>
              <Link href="/external" className="pv-mobile-menu-link" onClick={() => setMenuOpen(false)}>
                External <span style={{ fontSize: '14px' }}>→</span>
              </Link>
              <span className="pv-mobile-menu-link active">
                Compare
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>you're here</span>
              </span>
              <Link href="/tweets" className="pv-mobile-menu-link" onClick={() => setMenuOpen(false)}>
                Tweet Browser <span style={{ fontSize: '14px' }}>→</span>
              </Link>
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
      <div className="pv-hero" style={{ background: 'var(--tint-purple)' }}>
        <div className="pv-wrap">
          <div className="pv-hero-inner">
            <div style={{ minWidth: 0 }}>
              <div className="pv-hero-eyebrow">
                <h1 className="pv-hero-title" style={{ marginBottom: 0 }}>Product Comparison</h1>
                <span className="pv-badge" style={{
                  background: 'rgba(107,70,193,0.12)',
                  color: 'var(--accent-purple)',
                  border: '1.5px solid var(--accent-purple)',
                }}>Side-by-side</span>
              </div>
              <p className="pv-hero-sub">
                Compare up to {MAX_SELECTED} products side-by-side — PiggyTech and external.
                Select products below to start comparing sentiment, positivity, and top aspects.
              </p>
            </div>
            <div className="pv-hero-stats">
              <div className="pv-hero-stat">
                <div className="pv-hero-stat-val" style={{ color: 'var(--accent-purple)' }}>{allProducts.length}</div>
                <div className="pv-hero-stat-label">Total Products</div>
              </div>
              <div className="pv-hero-stat">
                <div className="pv-hero-stat-val" style={{ color: 'var(--accent-primary)' }}>{pvProducts.length}</div>
                <div className="pv-hero-stat-label">PiggyTech</div>
              </div>
              <div className="pv-hero-stat">
                <div className="pv-hero-stat-val" style={{ color: 'var(--accent-orange)' }}>{extProducts.length}</div>
                <div className="pv-hero-stat-label">External</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="pv-main">
        <div className="pv-wrap">

          {/* ── Product selector card ─────────────────────────────── */}
          <div className="pv-card pv-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div className="pv-card-label">Select Products to Compare</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px', fontWeight: '500' }}>
                  Click to select · max {MAX_SELECTED} at once
                </div>
              </div>
              {selected.length > 0 && (
                <button className="pv-btn pv-btn-danger pv-btn-sm" onClick={() => setSelected([])}>
                  Clear all ×
                </button>
              )}
            </div>

            {/* PiggyTech products */}
            {pvProducts.length > 0 && (
              <div style={{ marginBottom: '18px' }}>
                <div className="pv-product-group-label">PiggyTech Products</div>
                <div className="pv-product-pills">
                  {pvProducts.map(p => {
                    const isSelected = selected.includes(p);
                    const count = tweetCount[p] || 0;
                    return (
                      <button
                        key={p}
                        className={`pv-product-pill${isSelected ? ' selected' : ''}`}
                        onClick={() => toggleProduct(p)}
                        disabled={!isSelected && selected.length >= MAX_SELECTED}
                        style={{
                          opacity: !isSelected && selected.length >= MAX_SELECTED ? 0.45 : 1,
                          borderColor: isSelected ? getColor(p) : undefined,
                          color: isSelected ? getColor(p) : undefined,
                          background: isSelected ? `${getColor(p)}15` : undefined,
                        }}
                        title={isSelected ? 'Click to deselect' : selected.length >= MAX_SELECTED ? `Max ${MAX_SELECTED} selected` : 'Click to select'}
                      >
                        {getDisplayName(p)}
                        <span style={{
                          fontSize: '10px',
                          background: 'var(--bg-hover)',
                          padding: '1px 6px',
                          borderRadius: '50px',
                          fontWeight: '600',
                          color: 'var(--text-dim)',
                          marginLeft: '2px',
                        }}>
                          {count.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* External products */}
            {extProducts.length > 0 && (
              <div>
                <div className="pv-product-group-label">External Products</div>
                <div className="pv-product-pills">
                  {extProducts.map(p => {
                    const isSelected = selected.includes(p);
                    const count = tweetCount[p] || 0;
                    return (
                      <button
                        key={p}
                        className={`pv-product-pill${isSelected ? ' selected-ext' : ''}`}
                        onClick={() => toggleProduct(p)}
                        disabled={!isSelected && selected.length >= MAX_SELECTED}
                        style={{
                          opacity: !isSelected && selected.length >= MAX_SELECTED ? 0.45 : 1,
                          borderColor: isSelected ? extColorMap[p] : undefined,
                          color: isSelected ? extColorMap[p] : undefined,
                          background: isSelected ? `${extColorMap[p]}18` : undefined,
                        }}
                        title={isSelected ? 'Click to deselect' : selected.length >= MAX_SELECTED ? `Max ${MAX_SELECTED} selected` : 'Click to select'}
                      >
                        {getDisplayName(p)}
                        <span style={{
                          fontSize: '10px',
                          background: 'var(--bg-hover)',
                          padding: '1px 6px',
                          borderRadius: '50px',
                          fontWeight: '600',
                          color: 'var(--text-dim)',
                          marginLeft: '2px',
                        }}>
                          {count.toLocaleString()}
                        </span>
                        {count < 30 && (
                          <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: '500' }}>small sample</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Comparison cards grid ─────────────────────────────── */}
          {selected.length === 0 ? (
            <div className="pv-card pv-section" style={{ textAlign: 'center', padding: '56px 24px' }}>
              <div style={{ fontSize: '32px', marginBottom: '14px', opacity: 0.25 }}>◎</div>
              <div style={{ fontSize: '15px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>
                No products selected
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                Select up to {MAX_SELECTED} products above to compare them side-by-side
              </div>
            </div>
          ) : (
            <div className="pv-compare-grid pv-section">
              {selectedData.map(({ productKey, data: pd, color, isPiggyTechProduct }) => (
                <CompareCard
                  key={productKey}
                  productKey={productKey}
                  data={pd}
                  color={color}
                  isPiggyTechProduct={isPiggyTechProduct}
                />
              ))}
            </div>
          )}

          {/* ── Combined bar chart ────────────────────────────────── */}
          {selected.length > 1 && (
            <div className="pv-card pv-section">
              <div style={{ marginBottom: '20px' }}>
                <div className="pv-card-label">Sentiment Distribution — Side-by-Side</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontWeight: '500' }}>
                  Stacked sentiment bars for each selected product
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {selectedData.map(({ productKey, data: pd, color }) => {
                  const total = pd.length || 1;
                  const pos = pd.filter((d: any) => d.overall_sentiment?.includes('positive')).length;
                  const posScore = Math.round((pos / total) * 100);

                  return (
                    <div key={productKey}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            {getDisplayName(productKey)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                            {pd.length.toLocaleString()} mentions
                          </span>
                        </div>
                        <span className="pv-badge" style={{
                          background: posScore >= 50 ? 'var(--badge-vpos-bg)' : 'var(--badge-vneg-bg)',
                          color: posScore >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
                          fontSize: '10px',
                          padding: '3px 9px',
                        }}>
                          {posScore}% positive
                        </span>
                      </div>

                      {/* Full stacked bar */}
                      <div style={{
                        display: 'flex',
                        height: '12px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: 'var(--bar-track)',
                        gap: '1px',
                      }}>
                        {SENTIMENTS.map(s => {
                          const count = pd.filter((d: any) => d.overall_sentiment === s).length;
                          const pct = (count / total) * 100;
                          return pct > 0 ? (
                            <div
                              key={s}
                              style={{
                                width: `${pct}%`,
                                background: SENT_HEX[s],
                                minWidth: '2px',
                                transition: 'width 0.5s ease',
                              }}
                              title={`${SENT_LABELS[s]}: ${count} (${Math.round(pct)}%)`}
                            />
                          ) : null;
                        })}
                      </div>

                      {/* Legend */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '6px' }}>
                        {SENTIMENTS
                          .filter(s => pd.filter((d: any) => d.overall_sentiment === s).length > 0)
                          .map(s => {
                            const count = pd.filter((d: any) => d.overall_sentiment === s).length;
                            const pct = Math.round((count / total) * 100);
                            return (
                              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: SENT_HEX[s] }} />
                                <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '500' }}>
                                  {SENT_LABELS[s]} {pct}%
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Global legend */}
              <div style={{
                display: 'flex', gap: '16px', paddingTop: '18px',
                marginTop: '12px',
                borderTop: '1px solid var(--border)',
                flexWrap: 'wrap',
              }}>
                {SENTIMENTS.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: SENT_HEX[s] }} />
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>
                      {SENT_LABELS[s]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
              <Link href="/external" style={{
                fontSize: '12px', color: 'var(--accent-orange)',
                fontWeight: '700', textDecoration: 'none',
              }}>
                External →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
