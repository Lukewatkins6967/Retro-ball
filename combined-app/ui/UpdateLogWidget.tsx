import React, { useState } from 'react';

export type UpdateLogEntry = {
  id: string;
  createdAt: number;
  description: string;
  delta: 0.1 | 0.5;
  major: boolean;
};

export default function UpdateLogWidget(props: {
  updateLevel: number;
  lastEntry?: UpdateLogEntry;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const value = props.updateLevel <= 0.00001 ? '0' : props.updateLevel.toFixed(1);
  const title = props.lastEntry
    ? `Last update: ${props.lastEntry.description}\n+${props.lastEntry.delta} level`
    : 'No updates yet. Add your first update!';

  return (
    <div
      onClick={props.onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') props.onClick();
      }}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        zIndex: 50,
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(0,0,0,0.12)',
        // boxShadow animated below on hover
        borderRadius: 999,
        padding: '10px 14px',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'transform 120ms ease, box-shadow 120ms ease',
        transform: hovered ? 'scale(1.03)' : 'scale(1.0)',
        boxShadow: hovered ? '0 14px 34px rgba(11,107,255,0.25)' : '0 10px 26px rgba(0,0,0,0.12)',
      }}
    >
      <b style={{ fontSize: 14 }}>Update Log</b>
      <span style={{ marginLeft: 10, fontSize: 16, fontWeight: 900, color: '#0b6bff' }}>{value}</span>
    </div>
  );
}

