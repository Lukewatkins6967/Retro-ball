import React from 'react';
import type { SimBoxScoreLine } from '../game/matchSim';
import Modal from './Modal';

export default function BoxScoreModal(props: {
  title: string;
  homeTeamName: string;
  awayTeamName: string;
  score: { home: number; away: number };
  homeLines: SimBoxScoreLine[];
  awayLines: SimBoxScoreLine[];
  onClose: () => void;
}) {
  const table = (teamName: string, lines: SimBoxScoreLine[]) => {
    return (
      <div className="card" style={{ background: 'rgba(255,255,255,0.78)' }}>
        <div style={{ fontWeight: 950 }}>{teamName}</div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          <div className="muted" style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1.6fr repeat(5, 0.6fr)', gap: 8 }}>
            <div>Player</div>
            <div style={{ textAlign: 'right' }}>PTS</div>
            <div style={{ textAlign: 'right' }}>AST</div>
            <div style={{ textAlign: 'right' }}>REB</div>
            <div style={{ textAlign: 'right' }}>STL</div>
            <div style={{ textAlign: 'right' }}>BLK</div>
          </div>
          {lines.map((l) => (
            <div key={l.playerId} style={{ display: 'grid', gridTemplateColumns: '1.6fr repeat(5, 0.6fr)', gap: 8, alignItems: 'center' }}>
              <div style={{ fontWeight: 900 }}>{l.playerName}</div>
              <div style={{ textAlign: 'right', fontWeight: 900 }}>{l.pts}</div>
              <div style={{ textAlign: 'right' }}>{l.ast}</div>
              <div style={{ textAlign: 'right' }}>{l.reb}</div>
              <div style={{ textAlign: 'right' }}>{l.stl}</div>
              <div style={{ textAlign: 'right' }}>{l.blk}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Modal title={props.title} onClose={props.onClose}>
      <div className="card" style={{ background: 'rgba(255,255,255,0.78)' }}>
        <div style={{ fontWeight: 1000, fontSize: 18 }}>
          {props.homeTeamName} {props.score.home} - {props.score.away} {props.awayTeamName}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          Detailed box score
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
        {table(props.homeTeamName, props.homeLines)}
        {table(props.awayTeamName, props.awayLines)}
      </div>

      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btnPrimary" style={{ padding: '10px 14px', fontWeight: 900 }} onClick={props.onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

