'use client';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub: string;
  accentColor: string;
  accentBg: string;
  icon: string;
}

function MetricCard({ label, value, sub, accentColor, accentBg, icon }: MetricCardProps) {
  return (
    <div
      className="metric-card"
      style={{ '--card-accent': accentColor } as React.CSSProperties}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: accentColor, borderRadius: '16px 16px 0 0',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <span className="text-label">{label}</span>
        <div style={{
          width: '34px', height: '34px',
          borderRadius: '10px',
          background: accentBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>

      <div style={{
        fontSize: '38px',
        fontWeight: '800',
        color: 'var(--text-primary)',
        lineHeight: 1,
        letterSpacing: '-0.02em',
        marginBottom: '10px',
      }}>
        {value}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>{sub}</span>
      </div>
    </div>
  );
}

export default function Scorecards({ data }: { data: any[] }) {
  const total = data.length;
  const negative = data.filter(d => d.overall_sentiment?.includes('negative')).length;
  const positive = data.filter(d => d.overall_sentiment?.includes('positive')).length;
  const veryNeg = data.filter(d => d.overall_sentiment === 'very_negative').length;

  const pctNeg = total > 0 ? Math.round((negative / total) * 100) : 0;
  const pctPos = total > 0 ? Math.round((positive / total) * 100) : 0;
  const pctVNeg = total > 0 ? Math.round((veryNeg / total) * 100) : 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '14px',
      marginBottom: '14px',
    }}>
      <MetricCard
        label="Tweets Analysed"
        value={total.toLocaleString()}
        sub="this period"
        accentColor="var(--accent-primary)"
        accentBg="var(--accent-primary-bg)"
        icon="📊"
      />
      <MetricCard
        label="Positive Tweets"
        value={positive.toLocaleString()}
        sub={`${pctPos}% of total`}
        accentColor="var(--accent-green)"
        accentBg="var(--badge-vpos-bg)"
        icon="✅"
      />
      <MetricCard
        label="Negative Tweets"
        value={negative.toLocaleString()}
        sub={`${pctNeg}% of total`}
        accentColor="var(--accent-red)"
        accentBg="var(--badge-vneg-bg)"
        icon="⚠️"
      />
      <MetricCard
        label="Very Negative"
        value={veryNeg.toLocaleString()}
        sub={`${pctVNeg}% · urgent attention`}
        accentColor="var(--accent-darkred)"
        accentBg="var(--badge-vneg-bg)"
        icon="🚨"
      />
    </div>
  );
}
