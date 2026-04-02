import React from 'react';

export default function RatingMeter(props: { value: number; label: string; color?: 'primary' | 'accent' | 'info' | 'good' | 'bad' }) {
  const v = Math.max(1, Math.min(10, Math.round(props.value)));
  const pct = (v / 10) * 100;

  const barStyle: React.CSSProperties =
    props.color === 'accent'
      ? { background: 'linear-gradient(90deg, rgba(245,158,11,0.98), rgba(249,115,22,0.88))' }
      : props.color === 'info'
        ? { background: 'linear-gradient(90deg, rgba(14,165,233,0.98), rgba(59,130,246,0.88))' }
        : props.color === 'good'
          ? { background: 'linear-gradient(90deg, rgba(22,163,74,0.98), rgba(34,197,94,0.88))' }
          : props.color === 'bad'
            ? { background: 'linear-gradient(90deg, rgba(220,38,38,0.98), rgba(239,68,68,0.88))' }
            : { background: 'linear-gradient(90deg, rgba(37,99,235,0.98), rgba(29,78,216,0.88))' };

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span className="muted" style={{ fontSize: 12 }}>
          {props.label}
        </span>
        <b style={{ fontSize: 12 }}>{v}/10</b>
      </div>
      <div className="progressTrack">
        <div className="progressBar" style={{ width: `${pct}%`, ...barStyle }} />
      </div>
    </div>
  );
}

