import React, { useMemo, useState } from 'react';
import type { FranchiseState, PlayoffGame, PlayoffSeries } from '../game/types';
import Modal from './Modal';

function roundLabel(round: PlayoffSeries['round']) {
  if (round === 'quarter') return 'Quarterfinals';
  if (round === 'semi') return 'Semifinals';
  return 'Finals';
}

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
  const teamById = useMemo(
    () => Object.fromEntries(leagueTeams.map((team) => [team.id, team])),
    [leagueTeams],
  );
  const teamName = (id: string) => teamById[id]?.name ?? id;
  const activeGames = playoffs?.games.filter((game) => !game.result?.played && game.round !== 'playIn') ?? [];
  const playInGames = playoffs?.games.filter((game) => game.round === 'playIn') ?? [];
  const seriesByRound = useMemo(() => {
    const quarter = playoffs?.series.filter((series) => series.round === 'quarter') ?? [];
    const semi = playoffs?.series.filter((series) => series.round === 'semi') ?? [];
    const final = playoffs?.series.filter((series) => series.round === 'final') ?? [];
    return { quarter, semi, final };
  }, [playoffs]);

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

  const gameCard = (game: PlayoffGame) => {
    const played = !!game.result?.played;
    const involvesUser = game.homeTeamId === props.franchise.user.id || game.awayTeamId === props.franchise.user.id;
    return (
      <div key={game.id} className="card" style={{ background: 'rgba(255,255,255,0.82)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
              {game.label}
            </div>
            <div style={{ marginTop: 6, fontWeight: 1000, fontSize: 17 }}>
              #{game.homeSeed ?? '-'} {teamName(game.homeTeamId)} vs #{game.awaySeed ?? '-'} {teamName(game.awayTeamId)}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              {played
                ? `Final: ${game.result?.score.home}-${game.result?.score.away}`
                : game.eliminationGame
                  ? 'Single-game elimination'
                  : 'Ready to play'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btnSoft"
              disabled={played}
              onClick={() => setConfirmSim(game)}
              style={{ padding: '10px 14px', fontWeight: 900 }}
            >
              Simulate
            </button>
            <button
              className="btn btnPrimary"
              disabled={played || !involvesUser}
              onClick={() => props.onPlay(game)}
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

  const seriesCard = (series: PlayoffSeries) => {
    const leaderText =
      series.winnerTeamId
        ? `Winner: ${teamName(series.winnerTeamId)}`
        : `${teamName(series.teamAId)} ${series.winsA} - ${series.winsB} ${teamName(series.teamBId)}`;
    return (
      <div key={series.id} className="card" style={{ background: 'rgba(255,255,255,0.8)' }}>
        <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
          {series.label}
        </div>
        <div style={{ marginTop: 6, fontWeight: 1000 }}>
          #{series.seedA} {teamName(series.teamAId)} vs #{series.seedB} {teamName(series.teamBId)}
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {leaderText}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="pill">Best-of-{playoffs.seriesBestOf}</span>
          <span className="pill">{series.winsA}-{series.winsB}</span>
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
              NBA-style play-in plus multi-game bracket series
            </div>
          </div>
          <button className="btn btnSoft" onClick={props.onBack} style={{ padding: '10px 14px' }}>
            Back
          </button>
        </div>

        {playoffs.championTeamId ? (
          <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div className="muted" style={{ fontSize: 12, fontWeight: 900 }}>
              CHAMPION
            </div>
            <div style={{ fontWeight: 1000, fontSize: 18 }}>{teamName(playoffs.championTeamId)}</div>
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
          <div className="card" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <div style={{ fontWeight: 1000 }}>Seed Table</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Seeds 1-6 advance straight in. Seeds 7-10 fight through the play-in.
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {playoffs.seededTeamIds.map((teamId, index) => (
                <span key={teamId} className="pill" style={{ background: index < 6 ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)' }}>
                  #{index + 1} {teamName(teamId)}
                </span>
              ))}
            </div>
          </div>

          {activeGames.length ? (
            <div>
              <div className="muted" style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
                ACTIVE GAMES
              </div>
              <div className="grid1">{activeGames.map(gameCard)}</div>
            </div>
          ) : null}

          <div>
            <div className="muted" style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
              PLAY-IN
            </div>
            <div className="grid1">
              {playInGames.length ? playInGames.map(gameCard) : <div className="muted">Play-in is complete.</div>}
            </div>
          </div>

          {(['quarter', 'semi', 'final'] as const).map((round) => (
            <div key={round}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 900, marginBottom: 8 }}>
                {roundLabel(round)}
              </div>
              <div className="grid1">
                {seriesByRound[round].length ? seriesByRound[round].map(seriesCard) : <div className="muted">Round opens once the previous stage is finished.</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {confirmSim && (
        <Modal title="Simulate this playoff game?" onClose={() => setConfirmSim(null)}>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Simulate this postseason game now? The result will update the play-in or series tracker immediately.
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btnSoft" onClick={() => setConfirmSim(null)} style={{ padding: '10px 14px' }}>
              Cancel
            </button>
            <button
              className="btn btnPrimary"
              style={{ padding: '10px 14px', fontWeight: 900 }}
              onClick={() => {
                const game = confirmSim;
                setConfirmSim(null);
                props.onSimulate(game);
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
