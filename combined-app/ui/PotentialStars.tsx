import React from 'react';

export default function PotentialStars(props: { potential: number }) {
  const p = Math.max(1, Math.min(10, Math.round(props.potential)));
  // Convert 1-10 into 0-5 filled stars.
  const filled = Math.max(0, Math.min(5, Math.round(p / 2)));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 2, color: '#f59e0b', fontSize: 14, letterSpacing: 0 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} aria-hidden="true">
              {i < filled ? '★' : '☆'}
            </span>
          ))}
        </div>
        <div style={{ fontWeight: 900, color: '#0b6bff' }}>{p}</div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Potential</div>
      </div>
    </div>
  );
}

