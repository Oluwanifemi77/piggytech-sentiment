'use client';

const SENTIMENTS = ['very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive'];

const COLORS: Record<string, string> = {
  very_negative:     '#C0392B',
  slightly_negative: '#E67E73',
  neutral:           '#378ADD',
  slightly_positive: '#58D68D',
  very_positive:     '#2ECC71',
};

const LABELS: Record<string, string> = {
  very_negative:     'Very Negative',
  slightly_negative: 'Slightly Negative',
  neutral:           'Neutral',
  slightly_positive: 'Slightly Positive',
  very_positive:     'Very Positive',
};

export default function ProductBar({ data }: { data: any[] }) {
  const products = [...new Set(data.map((d: any) => d.aspect_product).filter(Boolean))];

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '12px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: '700',
        color: 'var(--text-dim)',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Sentiment by Product
      </div>

      {products.map((product: any) => {
        const productData = data.filter((d: any) => d.aspect_product === product);
        const total = productData.length;
        const displayName = product === 'PiggyVest_for_Business' ? 'PiggyVest for Business' : product;

        return (
          <div key={product} style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>{displayName}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{total} mentions</span>
            </div>
            <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', background: 'var(--bar-track)' }}>
              {SENTIMENTS.map(s => {
                const count = productData.filter((d: any) => d.overall_sentiment === s).length;
                const pct = (count / total) * 100;
                return pct > 0 ? (
                  <div
                    key={s}
                    style={{ width: `${pct}%`, background: COLORS[s] }}
                    title={`${LABELS[s]}: ${count} (${Math.round(pct)}%)`}
                  />
                ) : null;
              })}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
              {SENTIMENTS
                .filter(s => productData.filter((d: any) => d.overall_sentiment === s).length > 0)
                .map(s => {
                  const count = productData.filter((d: any) => d.overall_sentiment === s).length;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: COLORS[s] }} />
                      <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{pct}%</span>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {SENTIMENTS.map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[s] }} />
            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{LABELS[s]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
