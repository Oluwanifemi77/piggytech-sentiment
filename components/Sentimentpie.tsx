'use client';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

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

const ORDER = ['very_negative', 'slightly_negative', 'neutral', 'slightly_positive', 'very_positive'];

export default function SentimentPie({ data }: { data: any[] }) {
  const counts: Record<string, number> = {};
  data.forEach(d => {
    const s = d.overall_sentiment;
    if (s) counts[s] = (counts[s] || 0) + 1;
  });

  const total = data.length || 1;
  const chartData = ORDER.filter(key => counts[key]).map(key => ({ name: key, value: counts[key] }));

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--card-shadow)',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: '700',
        color: 'var(--text-dim)',
        marginBottom: '16px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        Sentiment Distribution
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <PieChart width={160} height={160}>
          <Pie
            data={chartData}
            cx={75}
            cy={75}
            innerRadius={45}
            outerRadius={75}
            dataKey="value"
            strokeWidth={2}
            stroke="var(--chart-stroke)"
          >
            {chartData.map(entry => (
              <Cell key={entry.name} fill={COLORS[entry.name] || '#ccc'} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: any) => [`${value} tweets`, LABELS[name] || name]}
            contentStyle={{
              fontSize: '12px',
              borderRadius: '8px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </PieChart>

        <div style={{ flex: 1 }}>
          {ORDER.filter(key => counts[key]).map(key => (
            <div key={key} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: COLORS[key], flexShrink: 0 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{LABELS[key]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{counts[key]}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{Math.round((counts[key] / total) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
