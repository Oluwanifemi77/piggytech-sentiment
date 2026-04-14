'use client';

interface Props {
  data: any[];
  onAspectClick?: (aspect: string | null) => void;
  selectedAspect?: string | null;
}

export default function AspectBar({ data, onAspectClick, selectedAspect }: Props) {
  const counts: Record<string, number> = {};
  data.forEach(d => { if (d.aspect) counts[d.aspect] = (counts[d.aspect] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
  const max = sorted[0]?.[1] || 1;

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
        Top Aspects · <span style={{ color: 'var(--accent-blue)' }}>click to drill down</span>
      </div>

      {sorted.map(([aspect, count], i) => {
        const isSelected = selectedAspect === aspect;
        return (
          <div
            key={aspect}
            onClick={() => onAspectClick?.(isSelected ? null : aspect)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
              cursor: 'pointer',
              opacity: selectedAspect && !isSelected ? 0.4 : 1,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div style={{
              fontSize: '11px',
              color: isSelected ? 'var(--accent-blue)' : 'var(--text-muted)',
              width: '130px',
              textAlign: 'right',
              flexShrink: 0,
              fontWeight: isSelected ? '700' : '500',
            }}>
              {aspect.replace(/_/g, ' ')}
            </div>
            <div style={{ flex: 1, background: 'var(--bar-track)', borderRadius: '4px', height: '8px' }}>
              <div style={{
                width: `${(count / max) * 100}%`,
                height: '100%',
                background: isSelected ? 'var(--accent-blue)' : i === 0 ? 'var(--accent-blue)' : 'var(--border-focus)',
                borderRadius: '4px',
                transition: 'all 0.3s ease',
                opacity: i === 0 || isSelected ? 1 : 0.5,
              }} />
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--text-primary)',
              width: '28px',
              fontWeight: '700',
              textAlign: 'right',
            }}>
              {count}
            </div>
          </div>
        );
      })}

      {selectedAspect && (
        <div
          onClick={() => onAspectClick?.(null)}
          style={{
            fontSize: '11px',
            color: 'var(--accent-blue)',
            cursor: 'pointer',
            textAlign: 'center',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border)',
          }}
        >
          Clear filter ×
        </div>
      )}
    </div>
  );
}
