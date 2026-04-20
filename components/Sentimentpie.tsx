'use client';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS: Record<string, string> = {
  very_negative:     '#F05555',
  slightly_negative: '#F08850',
  neutral:           '#5B9CF6',
  slightly_positive: '#4DE09C',
  very_positive:     '#00C571',
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

  // Dominant sentiment
  const dominant = ORDER.filter(k => counts[k]).sort((a, b) => (counts[b] || 0) - (counts[a] || 0))[0];
  const dominantPct = dominant ? Math.round((counts[dominant] / total) * 100) : 0;

  return (
    <div className="card" style={{ borderRadius: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
        <div>
          <div className="text-label">Sentiment Distribution</div>
          {dominant && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Mostly{' '}
              <span style={{ color: COLORS[dominant], fontWeight: '700' }}>
                {LABELS[dominant]}
              </span>
              {' '}({dominantPct}%)
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <PieChart width={150} height={150}>
            <Pie
              data={chartData}
              cx={70}
              cy={70}
              innerRadius={42}
              outerRadius={70}
              dataKey="value"
              strokeWidth={2}
              stroke="var(--chart-stroke)"
              paddingAngle={2}
            >
              {chartData.map(entry => (
                <Cell key={entry.name} fill={COLORS[entry.name] || '#ccc'} />
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
                boxShadow: 'var(--card-shadow)',
              }}
            />
          </PieChart>
          {/* Center label */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center', pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
              {data.length}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              total
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ORDER.filter(key => counts[key]).map(key => {
            const pct = Math.round((counts[key] / total) * 100);
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: COLORS[key], flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                      {LABELS[key]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{counts[key]}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: '28px', textAlign: 'right' }}>{pct}%</span>
                  </div>
                </div>
                {/* Mini progress bar */}
                <div style={{ height: '3px', background: 'var(--bar-track)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: COLORS[key],
                    borderRadius: '2px',
                    transition: 'width 0.6s ease',
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
