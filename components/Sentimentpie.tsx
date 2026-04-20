'use client';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

// Use CSS-variable-compatible hex values (matches the light + dark theme vars)
const COLORS: Record<string, string> = {
  very_negative:     'var(--sent-vneg)',
  slightly_negative: 'var(--sent-sneg)',
  neutral:           'var(--sent-neu)',
  slightly_positive: 'var(--sent-spos)',
  very_positive:     'var(--sent-vpos)',
};

// Recharts needs actual hex values — keep in sync with globals.css light-mode vars
const HEX: Record<string, string> = {
  very_negative:     '#E53E3E',
  slightly_negative: '#DD6B20',
  neutral:           '#3182CE',
  slightly_positive: '#38A169',
  very_positive:     '#10B259',
};

const LABELS: Record<string, string> = {
  very_negative:     'Very Negative',
  slightly_negative: 'Slightly Negative',
  neutral:           'Neutral',
  slightly_positive: 'Slightly Positive',
  very_positive:     'Very Positive',
};

const ORDER = ['very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive'];

export default function SentimentPie({ data }: { data: any[] }) {
  const counts: Record<string, number> = {};
  data.forEach(d => {
    const s = d.overall_sentiment;
    if (s) counts[s] = (counts[s] || 0) + 1;
  });

  const total = data.length || 1;
  const chartData = ORDER.filter(key => counts[key]).map(key => ({ name: key, value: counts[key] }));

  const dominant = ORDER.filter(k => counts[k]).sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0];
  const dominantPct = dominant ? Math.round((counts[dominant] / total) * 100) : 0;

  return (
    <div className="pv-card">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div className="pv-card-label">Sentiment Distribution</div>
          {dominant && (
            <div className="pv-card-title" style={{ marginTop: '4px', fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)' }}>
              Mostly{' '}
              <span style={{ color: HEX[dominant], fontWeight: '700' }}>
                {LABELS[dominant]}
              </span>
              {' '}({dominantPct}%)
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Donut chart */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PieChart width={154} height={154}>
            <Pie
              data={chartData}
              cx={72}
              cy={72}
              innerRadius={44}
              outerRadius={72}
              dataKey="value"
              strokeWidth={2}
              stroke="var(--chart-stroke)"
              paddingAngle={2}
            >
              {chartData.map(entry => (
                <Cell key={entry.name} fill={HEX[entry.name] || '#ccc'} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any) => [`${value} tweets`, LABELS[name] || name]}
              contentStyle={{
                fontSize: '11px',
                borderRadius: '10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-md)',
                padding: '8px 12px',
              }}
            />
          </PieChart>
          {/* Center total */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
              {data.length}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: '2px' }}>
              total
            </div>
          </div>
        </div>

        {/* Legend with progress bars */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ORDER.filter(key => counts[key]).map(key => {
            const pct = Math.round((counts[key] / total) * 100);
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: HEX[key], flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                      {LABELS[key]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{counts[key]}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: '30px', textAlign: 'right' }}>{pct}%</span>
                  </div>
                </div>
                <div className="pv-bar-track" style={{ height: '3px' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: HEX[key],
                    borderRadius: '2px',
                    transition: 'width 0.55s ease',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
