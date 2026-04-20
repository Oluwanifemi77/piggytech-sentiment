'use client';

interface Props {
  data: any[];
  onAspectClick?: (aspect: string | null) => void;
  selectedAspect?: string | null;
}

const ASPECT_COLORS = [
  'var(--accent-primary)',
  'var(--accent-blue)',
  'var(--accent-indigo)',
  'var(--accent-purple)',
  'var(--accent-orange)',
  'var(--accent-lgreen)',
  'var(--accent-blue)',
];

export default function AspectBar({ data, onAspectClick, selectedAspect }: Props) {
  const counts: Record<string, number> = {};
  data.forEach(d => { if (d.aspect) counts[d.aspect] = (counts[d.aspect] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="card" style={{ borderRadius: '16px' }}>
      <div style={{ marginBottom: '18px' }}>
        <div className="text-label">Top Aspects</div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '3px' }}>
          Click any aspect to drill down
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {sorted.map(([aspect, count], i) => {
          const isSelected = selectedAspect === aspect;
          const color = ASPECT_COLORS[i % ASPECT_COLORS.length];
          const pct = Math.round((count / max) * 100);

          return (
            <div
              key={aspect}
              onClick={() => onAspectClick?.(isSelected ? null : aspect)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                opacity: selectedAspect && !isSelected ? 0.35 : 1,
                transition: 'opacity 0.2s ease',
                padding: '6px 8px',
                borderRadius: '8px',
                background: isSelected ? 'var(--accent-primary-bg)' : 'transparent',
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                margin: '0 -8px',
              }}
            >
              <div style={{
                fontSize: '11px',
                color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                width: '120px',
                textAlign: 'right',
                flexShrink: 0,
                fontWeight: isSelected ? '700' : '500',
                lineHeight: 1.3,
              }}>
                {aspect.replace(/_/g, ' ')}
              </div>

              <div style={{ flex: 1, background: 'var(--bar-track)', borderRadius: '4px', height: '7px', overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: isSelected ? 'var(--accent-primary)' : color,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease, background 0.2s ease',
                  opacity: isSelected ? 1 : 0.75,
                }} />
              </div>

              <div style={{
                fontSize: '12px',
                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                width: '28px',
                fontWeight: '700',
                textAlign: 'right',
                flexShrink: 0,
              }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>

      {selectedAspect && (
        <button
          className="btn-link"
          onClick={() => onAspectClick?.(null)}
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border)',
            width: '100%',
            fontSize: '11px',
          }}
        >
          Clear selection ×
        </button>
      )}
    </div>
  );
}
