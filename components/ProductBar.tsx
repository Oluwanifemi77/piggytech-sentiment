'use client';

const SENTIMENTS = ['very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive'];

const COLORS: Record<string, string> = {
  very_negative:     '#F05555',
  slightly_negative: '#F08850',
  neutral:           '#5B9CF6',
  slightly_positive: '#4DE09C',
  very_positive:     '#00C571',
};

const LABELS: Record<string, string> = {
  very_negative:     'Very Neg',
  slightly_negative: 'Slightly Neg',
  neutral:           'Neutral',
  slightly_positive: 'Slightly Pos',
  very_positive:     'Very Pos',
};

const PRODUCT_COLORS: Record<string, string> = {
  PiggyVest:              '#5B9CF6',
  Pocket:                 '#A78BFA',
  PiggyVest_for_Business: '#00C571',
};

export default function ProductBar({ data }: { data: any[] }) {
  const products = [...new Set(data.map((d: any) => d.aspect_product).filter(Boolean))];

  if (products.length === 0) {
    return (
      <div className="card" style={{ borderRadius: '16px', marginBottom: '14px' }}>
        <div className="text-label" style={{ marginBottom: '16px' }}>Sentiment by Product</div>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '20px 0' }}>
          No product data in current filter
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ borderRadius: '16px', marginBottom: '14px' }}>
      <div style={{ marginBottom: '20px' }}>
        <div className="text-label">Sentiment by Product</div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>
          Hover over bars for exact counts
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {products.map((product: any) => {
          const productData = data.filter((d: any) => d.aspect_product === product);
          const total = productData.length;
          const displayName = product === 'PiggyVest_for_Business' ? 'PiggyVest for Business' : product;
          const dotColor = PRODUCT_COLORS[product] || 'var(--accent-primary)';

          // Positivity score
          const pos = productData.filter((d: any) => d.overall_sentiment?.includes('positive')).length;
          const posScore = total > 0 ? Math.round((pos / total) * 100) : 0;

          return (
            <div key={product}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {displayName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '500' }}>
                    {total.toLocaleString()} mentions
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: posScore >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
                    background: posScore >= 50 ? 'var(--badge-vpos-bg)' : 'var(--badge-vneg-bg)',
                    padding: '2px 8px',
                    borderRadius: '20px',
                  }}>
                    {posScore}% positive
                  </span>
                </div>
              </div>

              {/* Stacked bar */}
              <div style={{
                display: 'flex',
                height: '10px',
                borderRadius: '6px',
                overflow: 'hidden',
                background: 'var(--bar-track)',
                gap: '1px',
              }}>
                {SENTIMENTS.map(s => {
                  const count = productData.filter((d: any) => d.overall_sentiment === s).length;
                  const pct = (count / total) * 100;
                  return pct > 0 ? (
                    <div
                      key={s}
                      style={{
                        width: `${pct}%`,
                        background: COLORS[s],
                        minWidth: '2px',
                        transition: 'width 0.5s ease',
                      }}
                      title={`${LABELS[s]}: ${count} (${Math.round(pct)}%)`}
                    />
                  ) : null;
                })}
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                {SENTIMENTS
                  .filter(s => productData.filter((d: any) => d.overall_sentiment === s).length > 0)
                  .map(s => {
                    const count = productData.filter((d: any) => d.overall_sentiment === s).length;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: COLORS[s] }} />
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '500' }}>
                          {LABELS[s]} {pct}%
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
        display: 'flex', gap: '14px', paddingTop: '16px',
        marginTop: '8px',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        {SENTIMENTS.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[s] }} />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
