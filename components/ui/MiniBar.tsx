'use client';

interface MiniBarProps {
  values: number[];
  height?: number;
  width?: number;
}

export function MiniBar({ values, height = 32, width = 120 }: MiniBarProps) {
  const max = Math.max(...values);
  
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {values.map((v, i) => {
        const h = (v / max) * height * 0.9;
        const barWidth = (width - (values.length - 1) * 2) / values.length;
        return (
          <rect
            key={i}
            x={i * (barWidth + 2)}
            y={height - h}
            width={barWidth}
            height={h}
            rx={2}
            fill="var(--accent)"
            opacity={0.6 + (v / max) * 0.4}
          />
        );
      })}
    </svg>
  );
}
