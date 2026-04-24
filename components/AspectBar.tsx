'use client';

interface Props {
  data: any[];
  onAspectClick?: (aspect: string | null) => void;
  selectedAspect?: string | null;
}

const ASPECT_HEX = [
  '#EA417D',
  '#0D60D8',
  '#6B46C1',
  '#10B259',
  '#DD6B20',
  '#3182CE',
  '#D43570',
];

export default function AspectBar({ data, onAspectClick, selectedAspect }: Props) {
  const counts: Record<string, number> = {};
  data.forEach(d => { if (d.aspect) counts[d.aspect] = (counts[d.aspect] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="pv-card">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div className="pv-card-label">Top Aspects</div>
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '3px', fontWeight: '500' }}>
          Click any aspect to drill down
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.map(([aspect, count], i) => {
          const isSelected = selectedAspect === aspect;
          const color = ASPECT_HEX[i % ASPECT_HEX.length];
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
                opacity: selectedAspect && !isSelected ? 0.30 : 1,
                transition: 'opacity 0.2s ease, background 0.15s ease',
                padding: '7px 10px',
                borderRadius: '10px',
                background: isSelected ? 'var(--accent-primary-bg)' : 'transparent',
                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                margin: '0 -10px',
              }}
            >
              <div
                className="pv-aspect-label"
                style={{
                  color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontWeight: isSelected ? 700 : 500,
                  letterSpacing: isSelected ? '-0.01em' : '0',
                }}
              >
                {aspect.replace(/_/g, ' ')}
              </div>

              <div className="pv-bar-track" style={{ flex: 1, height: '7px' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: isSelected ? 'var(--accent-primary)' : color,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease, background 0.2s ease',
                  opacity: isSelected ? 1 : 0.78,
                }} />
              </div>

              <div style={{
                fontSize: '12px',
                color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                width: '26px',
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
        <div style={{ paddingTop: '14px', marginTop: '6px', borderTop: '1px solid var(--border)' }}>
          <button
            className="pv-btn pv-btn-ghost pv-btn-sm"
            onClick={() => onAspectClick?.(null)}
            style={{ width: '100%', justifyContent: 'center', fontSize: '12px' }}
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
