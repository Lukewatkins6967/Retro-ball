import React, { useMemo, useState } from 'react';
import type { UpdateLogEntry } from './UpdateLogWidget';

export default function UpdateLogPage(props: {
  returnTo: string;
  updateLevel: number;
  entries: UpdateLogEntry[];
  onBack: () => void;
  onAdd: (entry: { description: string; major: boolean; delta: 0.1 | 0.5 }) => void;
}) {
  const [description, setDescription] = useState('');
  const [major, setMajor] = useState(false);

  const delta: 0.1 | 0.5 = major ? 0.5 : 0.1;

  const sortedEntries = useMemo(() => [...props.entries].sort((a, b) => b.createdAt - a.createdAt), [props.entries]);

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Update Log</h2>
            <div style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>Level: {props.updateLevel.toFixed(1)}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={props.onBack} className="btn btnSoft" style={{ padding: '10px 14px' }}>
              Back
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16 }} className="card">
          <b>Add an update</b>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ opacity: 0.85 }}>What changed?</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', padding: 10, font: 'inherit', borderRadius: 12, border: '1px solid rgba(15,23,42,0.12)' }}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={major} onChange={(e) => setMajor(e.target.checked)} />
              <span style={{ opacity: 0.85 }}>This is a bigger update (+0.5)</span>
            </label>
            <button
              onClick={() => {
                const desc = description.trim();
                if (!desc) return;
                props.onAdd({ description: desc, major, delta });
                setDescription('');
                setMajor(false);
              }}
              disabled={!description.trim()}
              className="btn btnPrimary"
              style={{ padding: '10px 16px', fontWeight: 900 }}
            >
              Add Update (+{delta})
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14 }} className="card">
          <b>All known updates</b>
          <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
            {sortedEntries.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No updates logged yet.</div>
            ) : (
              sortedEntries.map((e) => (
                <div key={e.id} style={{ borderBottom: '1px dashed rgba(15,23,42,0.18)', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontWeight: 800 }}>
                      {e.major ? 'Major' : 'Minor'} (+{e.delta})
                    </div>
                    <div style={{ opacity: 0.7, fontSize: 12 }}>{new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.9 }}>{e.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

