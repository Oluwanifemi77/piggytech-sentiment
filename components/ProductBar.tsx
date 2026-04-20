'use client';

const SENTIMENTS = ['very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive'];

// Kept as hex for Recharts / inline SVG; must stay in sync with globals.css light-mode sentiment vars
const SENT_HEX: Record<string, string> = {
  very_negative:     '#E53E3E',
  slightly_negative: '#DD6B20',
  neutral:           '#3182CE',
  slightly_positive: '#38A169',
  very_positive:     '#10B259',
};

const SENT_LABELS: Record<string, string> = {
  very_negative:     'Very Neg',
  slightly_negative: 'Slightly Neg',
  neutral:           'Neutral',
  slightly_positive: 'Slightly Pos',
  very_positive:     'Very Pos',
};

// Actual PiggyVest brand product colours (CSS vars take effect in inline styles)
const PRODUCT_COLOR: Record<string, string> = {
  PiggyVest:              'var(--product-pv-color)',
  Pocket:                 'var(--product-pocket-color)',
  PiggyVest_for_Business: 'var(--product-pvb-color)',
};

export default function ProductBar({ data }: { data: any[] }) {
  const products = [...new Set(data.map((d: any) => d.aspect_product).filter(Boolean))];

  if (products.length === 0) {
    return (
      <div className="pv-card pv-section">
        <div className="pv-card-label" style={{ marginBottom: '16px' }}>Sentiment by Product</div>
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', padding: '20px 0' }}>
          No product data in current filter
        </div>
      </div>
    );
  }

  return (
    <div className="pv-card pv-section">
      <div style={{ marginBottom: '22px' }}>
        <div className="pv-card-label">Sentiment by Product</div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontWeight: '500' }}>
          Hover over bars for exact counts
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
        {products.map((product: any) => {
          const productData = data.filter((d: any) => d.aspect_product === product);
          const total = productData.length;
          const displayName = product === 'PiggyVest_for_Business' ? 'PiggyVest for Business' : product;
          const dotColor = PRODUCT_COLOR[product] || 'var(--accent-primary)';

          const pos = productData.filter((d: any) => d.overall_sentiment?.includes('positive')).length;
          const posScore = total > 0 ? Math.round((pos / total) * 100) : 0;

          return (
            <div key={product}>
              {/* Product header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {displayName}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '500' }}>
                    {total.toLocaleString()} mentions
                  </span>
                  <span className="pv-badge" style={{
                    background: posScore >= 50 ? 'var(--badge-vpos-bg)' : 'var(--badge-vneg-bg)',
                    color: posScore >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
                    fontSize: '10px',
                    padding: '3px 9px',
                  }}>
                    {posScore}% positive
                  </span>
                </div>
              </div>

              {/* Stacked sentiment bar */}
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
                        background: SENT_HEX[s],
                        minWidth: '2px',
                        transition: 'width 0.5s ease',
                      }}
                      title={`${SENT_LABELS[s]}: ${count} (${Math.round(pct)}%)`}
                    />
                  ) : null;
                })}
              </div>

              {/* Per-segment legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                {SENTIMENTS
                  .filter(s => productData.filter((d: any) => d.overall_sentiment === s).length > 0)
                  .map(s => {
                    const count = productData.filter((d: any) => d.overall_sentiment === s).length;
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

      {/* Global colour legend */}
      <div style={{
        display: 'flex', gap: '16px', paddingTop: '18px',
        marginTop: '12px',
        borderTop: '1px solid var(--border)',
        flexWrap: 'wrap',
      }}>
        {SENTIMENTS.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: SENT_HEX[s] }} />
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '500' }}>{SENT_LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
