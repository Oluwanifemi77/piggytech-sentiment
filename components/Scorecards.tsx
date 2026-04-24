'use client';

// ── Inline SVG icons — no emoji ──────────────────────────────────────────────
const GridIcon = () => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
    <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.95"/>
    <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.60"/>
  </svg>
);
const ArrowUpIcon = () => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
    <path d="M8 13V3M8 3L3 8M8 3L13 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const ArrowDownIcon = () => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
    <path d="M8 3V13M8 13L3 8M8 13L13 8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="17" height="17" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L1 13.5h14L8 1.5z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    <path d="M8 6.5v3" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="8" cy="11" r="0.75" fill="white"/>
  </svg>
);

interface MetricCardProps {
  label: string;
  value: string | number;
  sub: string;
  accentColor: string;
  accentBg: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, sub, accentColor, accentBg, icon }: MetricCardProps) {
  return (
    <div className="pv-metric" style={{ position: 'relative' }}>
      {/* Top accent stripe */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: accentColor, borderRadius: '16px 16px 0 0',
      }} />

      {/* Icon chip */}
      <div
        className="pv-metric-icon"
        style={{ background: accentColor }}
      >
        {icon}
      </div>

      {/* Label */}
      <div className="pv-metric-label">{label}</div>

      {/* Value */}
      <div className="pv-metric-value">{value}</div>

      {/* Sub */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
        <span className="pv-metric-sub">{sub}</span>
      </div>
    </div>
  );
}

export default function Scorecards({ data }: { data: any[] }) {
  const total    = data.length;
  const negative = data.filter(d => d.overall_sentiment?.includes('negative')).length;
  const positive = data.filter(d => d.overall_sentiment?.includes('positive')).length;
  const veryNeg  = data.filter(d => d.overall_sentiment === 'very_negative').length;

  const pctNeg  = total > 0 ? Math.round((negative / total) * 100) : 0;
  const pctPos  = total > 0 ? Math.round((positive / total) * 100) : 0;
  const pctVNeg = total > 0 ? Math.round((veryNeg / total) * 100) : 0;

  return (
    <div className="pv-grid-4 pv-section">
      <MetricCard
        label="Tweets Analysed"
        value={total.toLocaleString()}
        sub="this period"
        accentColor="var(--accent-primary)"
        accentBg="var(--accent-primary-bg)"
        icon={<GridIcon />}
      />

      <MetricCard
        label="Positive Tweets"
        value={positive.toLocaleString()}
        sub={`${pctPos}% of total`}
        accentColor="var(--accent-green)"
        accentBg="var(--badge-vpos-bg)"
        icon={<ArrowUpIcon />}
      />
      <MetricCard
        label="Negative Tweets"
        value={negative.toLocaleString()}
        sub={`${pctNeg}% of total`}
        accentColor="var(--accent-red)"
        accentBg="var(--badge-vneg-bg)"
        icon={<ArrowDownIcon />}
      />
      <MetricCard
        label="Very Negative"
        value={veryNeg.toLocaleString()}
        sub={`${pctVNeg}% · urgent`}
        accentColor="var(--sent-vneg)"
        accentBg="var(--badge-vneg-bg)"
        icon={<AlertIcon />}
      />
    </div>
  );
}
