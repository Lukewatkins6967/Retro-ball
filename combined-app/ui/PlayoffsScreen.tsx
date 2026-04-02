import React, { useMemo, useState } from 'react';
import type { FranchiseState, PlayoffGame } from '../game/types';
import Modal from './Modal';

export default function PlayoffsScreen(props: {
  franchise: FranchiseState;
  onPlay: (game: PlayoffGame) => void;
  onSimulate: (game: PlayoffGame) => void;
  onBack: () => void;
}) {
  const season = props.franchise.season;
  const playoffs = season?.playoffs;
  const [confirmSim, setConfirmSim] = useState<PlayoffGame | null>(null);

  const leagueTeams = useMemo(
    () => [props.franchise.user, props.franchise.ai, ...props.franchise.otherTeams],
    [props.franchise],
  );
  const teamName = (id: string) => leagueTeams.find((t) => t.id === id)?.name ?? id;

  if (!season || !playoffs) {
    return (
      <div className="page">
        <div className="panelSolid panel" style={{ padding: 16 }}>
          <h2 style={{ margin: 0 }}>Playoffs</h2>
          <div className="muted" style={{ marginTop: 10 }}>
            No playoff bracket found yet. Finish the regular season first.
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btnSoft" onClick={props.onBack}>
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const semis = playoffs.games.filter((g) => g.round === 'semi');
  const finals = playoffs.games.filter((g) => g.round === 'final');
  const champion = playoffs.championTeamId ? teamName(playoffs.championTeamId) : null;

  const card = (g: PlayoffGame) => {
    const played = !!g.result?.played;
    const involvesUser = g.homeTeamId === props.franchise.user.id || g.awayTeamId === props.franchise.user.id;
    const canPlay = involvesUser && !played;
    const canSim = !played;
    return (
      <div key={g.id} className="card" style={{ background: 'rgba(255,255,255,0.78)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>
              {teamName(g.homeTeamId)} vs {teamName(g.awayTeamId)}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              {played ? `Final: ${g.result?.score.home}-${g.result?.score.away}` : 'Not played yet'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btnSoft"
              disabled={!canSim}
              onClick={() => setConfirmSim(g)}
              style={{ padding: '10px 14px', fontWeight: 900 }}
            >
              Simulate
            </button>
            <button
              className="btn btnPrimary"
              disabled={!canPlay}
              onClick={() => props.onPlay(g)}
              style={{ padding: '10px 14px', fontWeight: 900 }}
              title={!involvesUser ? 'You can only play games involving your team' : undefined}
            >
              Play
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Playoffs</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              Bracket updates as games finish
            </div>
          </div>
          <button className="btn btnSoft" onClick={props.onBack} style={{ padding: '10px 14px' }}>
            Back
          </button>
        </div>

        {champion && (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
              CHAMPION
            </div>
            <div style={{ fontWeight: 1000, fontSize: 18 }}>{champion}</div>
          </div>
        )}

        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
              SEMIFINALS
            </div>
            <div className="grid1">{semis.map(card)}</div>
          </div>

          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
              FINALS
            </div>
            <div className="grid1">{finals.length ? finals.map(card) : <div className="muted">Finals matchup appears after semis.</div>}</div>
          </div>
        </div>
      </div>

      {confirmSim && (
        <Modal title="Simulate this playoff game?" onClose={() => setConfirmSim(null)}>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Simulate this playoff game now? Stats and results will be calculated automatically.
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btnSoft" onClick={() => setConfirmSim(null)} style={{ padding: '10px 14px' }}>
              Cancel
            </button>
            <button
              className="btn btnPrimary"
              style={{ padding: '10px 14px', fontWeight: 900 }}
              onClick={() => {
                const g = confirmSim;
                setConfirmSim(null);
                props.onSimulate(g);
              }}
            >
              Simulate
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

