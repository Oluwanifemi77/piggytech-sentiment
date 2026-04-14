'use client';

export default function Scorecards({ data }: { data: any[] }) {
  const total = data.length;
  const negative = data.filter(d => d.overall_sentiment?.includes('negative')).length;
  const positive = data.filter(d => d.overall_sentiment?.includes('positive')).length;
  const veryNeg = data.filter(d => d.overall_sentiment === 'very_negative').length;

  const card = (label: string, value: string | number, accent: string, sub: string) => (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border)',
      borderTop: `3px solid ${accent}`,
      boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{
        fontSize: '10px',
        color: 'var(--text-dim)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: '600',
        marginBottom: '10px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '34px',
        fontWeight: '700',
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '11px',
        color: accent,
        marginTop: '8px',
        fontWeight: '500',
      }}>
        {sub}
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px',
      marginBottom: '12px',
    }}>
      {card('Tweets Analysed', total, 'var(--accent-blue)', 'this period')}
      {card('Negative Tweets', negative, 'var(--accent-red)', `${Math.round((negative / total) * 100)}% of total`)}
      {card('Positive Tweets', positive, 'var(--accent-green)', `${Math.round((positive / total) * 100)}% of total`)}
      {card('Very Negative', veryNeg, 'var(--accent-darkred)', 'urgent attention needed')}
    </div>
  );
}
