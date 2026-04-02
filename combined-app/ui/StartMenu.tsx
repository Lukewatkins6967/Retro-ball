import React, { useState } from 'react';

export default function StartMenu(props: {
  onStart: (params: { userName: string }) => void;
  hasSave: boolean;
  onContinue: () => void;
}) {
  const [userName, setUserName] = useState('Your Squad');

  return (
    <div className="page">
      <div className="panel" style={{ padding: 18 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Hybrid Basketball</h1>
        <p style={{ marginTop: 8 }} className="muted">
          Retro Bowl-style drafting + arcade basketball gameplay driven by NBA draft stats.
        </p>

        <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="muted" style={{ fontSize: 13 }}>
              Your team name
            </span>
            <input
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              style={{ padding: 12, borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}
            />
          </label>
          <div className="muted" style={{ fontSize: 13 }}>
            Draft is auto-sized to draft all available prospects every year.
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => props.onStart({ userName: userName.trim() || 'Your Squad' })}
            className="btn btnPrimary"
            style={{ padding: '12px 16px', fontWeight: 900 }}
          >
            Continue
          </button>
          {props.hasSave && (
            <button
              onClick={props.onContinue}
              className="btn btnSoft"
              style={{ padding: '12px 16px', fontWeight: 900 }}
              title="Load your saved franchise"
            >
              Load Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
