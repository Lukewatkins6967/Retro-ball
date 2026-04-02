import React from 'react';

type StatKey = 'shooting' | 'speed' | 'playmaking' | 'defense';

const map: Record<StatKey, { icon: string; label: string }> = {
  shooting: { icon: '🎯', label: 'Shooting' },
  speed: { icon: '⚡', label: 'Speed' },
  playmaking: { icon: '🧠', label: 'Playmaking' },
  defense: { icon: '🛡️', label: 'Defense' },
};

export default function StatIcon(props: { stat: StatKey }) {
  return (
    <span title={map[props.stat].label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden="true">{map[props.stat].icon}</span>
      <span style={{ fontSize: 13, fontWeight: 800 }}>{map[props.stat].label}</span>
    </span>
  );
}

