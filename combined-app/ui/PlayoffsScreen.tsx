import React, { useMemo, useState } from 'react';
import type { FranchiseState, PlayoffGame, PlayoffSeries } from '../game/types';
import Modal from './Modal';

function roundLabel(round: PlayoffSeries['round']) {
  if (round === 'quarter') return 'Quarterfinals';
  if (round === 'semi') return 'Semifinals';
  return 'League Finals';
}

function currentRound(playoffs: NonNullable<FranchiseState['season']>['playoffs']) {
  if (playoffs.stage === 'playIn' && playoffs.games.some((game) => game.round === 'playIn' && !game.result?.played)) {
    return 'playIn';
  }
  if (playoffs.series.some((series) => series.round === 'quarter' && !series.winnerTeamId)) return 'quarter';
  if (playoffs.series.some((series) => series.round === 'semi' && !series.winnerTeamId)) return 'semi';
  if (playoffs.series.some((series) => series.round === 'final' && !series.winnerTeamId)) return 'final';
  return playoffs.championTeamId ? 'complete' : 'quarter';
}

function SeriesNode(props: {
  series?: PlayoffSeries;
  teamName: (id: string) => string;
  active: boolean;
}) {
  if (!props.series) {
    return <div className="playoffSeriesNode isEmpty">Waiting for bracket to advance</div>;
  }

  const leaderText = props.series.winnerTeamId
    ? `Advanced: ${props.teamName(props.series.winnerTeamId)}`
    : `${props.series.winsA}-${props.series.winsB} in progress`;

  return (
    <div className={`playoffSeriesNode ${props.active ? 'isActive' : ''} ${props.series.winnerTeamId ? 'isAdvanced' : ''}`}>
      <div className="playoffSeriesLabel">{props.series.label}</div>
      <div className="playoffSeriesTeams">
        <div>
          <span className="playoffSeed">#{props.series.seedA}</span> {props.teamName(props.series.teamAId)}
        </div>
        <div>
          <span className="playoffSeed">#{props.series.seedB}</span> {props.teamName(props.series.teamBId)}
        </div>
      </div>
      <div className="playoffSeriesFooter">
        <span>{leaderText}</span>
        <span>Best-of-{props.series.winsNeeded * 2 - 1}</span>
      </div>
    </div>
  );
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
  const roundNow = playoffs ? currentRound(playoffs) : 'quarter';
  const seriesById = useMemo(
    () => Object.fromEntries((playoffs?.series ?? []).map((series) => [series.id, series])),
    [playoffs],
  );

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
      <div key={game.id} className="card playoffActionCard">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div className="playoffSeriesLabel">{game.label}</div>
            <div className="playoffActionTitle">
              #{game.homeSeed ?? '-'} {teamName(game.homeTeamId)} vs #{game.awaySeed ?? '-'} {teamName(game.awayTeamId)}
            </div>
            <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
              {played
                ? `Final: ${game.result?.score.home}-${game.result?.score.away}`
                : game.eliminationGame
                  ? 'Single-game elimination'
                  : 'Next game ready'}
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

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div className="playoffHero">
          <div>
            <div className="pill awardsHeroPill">NBA-style bracket</div>
            <h2 style={{ margin: '12px 0 0' }}>Playoff Picture</h2>
            <div className="muted awardsHeroCopy">
              Play-in decides the last two seeds, then the bracket runs 1-8, 2-7, 3-6, and 4-5 until a champion is crowned.
            </div>
          </div>
          <div className="playoffHeroMeta">
            <div className="playoffMetaChip">
              <span>Current Round</span>
              <strong>{roundNow === 'playIn' ? 'Play-In' : roundNow === 'complete' ? 'Champion Crowned' : roundLabel(roundNow as PlayoffSeries['round'])}</strong>
            </div>
            <button className="btn btnGhost" onClick={props.onBack} style={{ padding: '10px 14px', fontWeight: 900 }}>
              Back
            </button>
          </div>
        </div>

        {playoffs.championTeamId ? (
          <div className="playoffChampionBanner">
            <div className="playoffSeriesLabel">Champion</div>
            <div className="playoffChampionName">{teamName(playoffs.championTeamId)}</div>
            <div className="muted">
              {playoffs.runnerUpTeamId ? `Closed out the finals over ${teamName(playoffs.runnerUpTeamId)}.` : 'Season finished.'}
            </div>
          </div>
        ) : null}

        <div className="card playoffSeedCard">
          <div className="awardsSectionLabel">Seed Table</div>
          <div className="playoffSeedTable">
            {playoffs.seededTeamIds.map((teamId, index) => (
              <div key={teamId} className={`playoffSeedPill ${index < 6 ? 'isDirect' : 'isPlayIn'}`}>
                <span>#{index + 1}</span>
                <strong>{teamName(teamId)}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="playoffPlayInSection">
          <div className="awardsSectionLabel">Play-In</div>
          <div className="playInGrid">
            {playInGames.length ? (
              playInGames.map((game) => (
                <div key={game.id} className={`playInCard ${game.result?.played ? 'isResolved' : ''}`}>
                  <div className="playoffSeriesLabel">{game.label}</div>
                  <div className="playoffSeriesTeams">
                    <div>
                      <span className="playoffSeed">#{game.homeSeed}</span> {teamName(game.homeTeamId)}
                    </div>
                    <div>
                      <span className="playoffSeed">#{game.awaySeed}</span> {teamName(game.awayTeamId)}
                    </div>
                  </div>
                  <div className="playoffSeriesFooter">
                    <span>
                      {game.result?.played
                        ? `${teamName(game.result.winnerTeamId ?? '')} advanced`
                        : game.eliminationGame
                          ? 'Loser goes home'
                          : 'Winner locks the 7 seed'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="muted">Play-in is complete.</div>
            )}
          </div>
        </div>

        <div className="playoffBracketGrid">
          <div className="playoffBracketColumn">
            <div className="playoffBracketHeading">Quarters</div>
            <SeriesNode series={seriesById['quarter-1']} teamName={teamName} active={roundNow === 'quarter'} />
            <SeriesNode series={seriesById['quarter-2']} teamName={teamName} active={roundNow === 'quarter'} />
          </div>
          <div className="playoffBracketColumn isInner">
            <div className="playoffBracketHeading">Semis</div>
            <SeriesNode series={seriesById['semi-1']} teamName={teamName} active={roundNow === 'semi'} />
          </div>
          <div className="playoffBracketColumn isCenter">
            <div className="playoffBracketHeading">Finals</div>
            <SeriesNode series={seriesById['final-1']} teamName={teamName} active={roundNow === 'final'} />
          </div>
          <div className="playoffBracketColumn isInner">
            <div className="playoffBracketHeading">Semis</div>
            <SeriesNode series={seriesById['semi-2']} teamName={teamName} active={roundNow === 'semi'} />
          </div>
          <div className="playoffBracketColumn">
            <div className="playoffBracketHeading">Quarters</div>
            <SeriesNode series={seriesById['quarter-3']} teamName={teamName} active={roundNow === 'quarter'} />
            <SeriesNode series={seriesById['quarter-4']} teamName={teamName} active={roundNow === 'quarter'} />
          </div>
        </div>

        {activeGames.length ? (
          <div style={{ marginTop: 18 }}>
            <div className="awardsSectionLabel">Active Games</div>
            <div className="grid1">{activeGames.map(gameCard)}</div>
          </div>
        ) : null}
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
