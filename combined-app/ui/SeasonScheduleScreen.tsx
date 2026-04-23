import React, { useMemo, useState } from 'react';
import type { FranchiseState, PlayoffGame, PlayoffSeries, SeasonGame } from '../game/types';
import Modal from './Modal';

function roundLabel(round: PlayoffSeries['round']) {
  if (round === 'quarter') return 'Quarterfinals';
  if (round === 'semi') return 'Semifinals';
  return 'League Finals';
}

function currentRound(playoffs: NonNullable<NonNullable<FranchiseState['season']>['playoffs']>) {
  if (playoffs.stage === 'playIn' && playoffs.games.some((game) => game.round === 'playIn' && !game.result?.played)) return 'playIn';
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

function PlayoffSeriesActionCard(props: {
  series: PlayoffSeries;
  nextGame: PlayoffGame | null;
  teamName: (id: string) => string;
  userTeamId: string;
  onPlay: (game: PlayoffGame) => void;
  onSimulateGame: (game: PlayoffGame) => void;
  onSimulateSeries: (series: PlayoffSeries) => void;
}) {
  const involvesUser = props.series.teamAId === props.userTeamId || props.series.teamBId === props.userTeamId;
  return (
    <div className="card playoffActionCard">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div className="playoffSeriesLabel">{props.series.label}</div>
          <div className="playoffActionTitle">
            #{props.series.seedA} {props.teamName(props.series.teamAId)} vs #{props.series.seedB} {props.teamName(props.series.teamBId)}
          </div>
          <div className="muted" style={{ marginTop: 6, fontSize: 13 }}>
            Series score: {props.series.winsA}-{props.series.winsB}
            {props.nextGame ? ` • Next up: Game ${props.nextGame.gameNumber ?? props.series.gameIds.length + 1}` : ' • Series complete'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btnSoft"
            disabled={!props.nextGame}
            onClick={() => props.nextGame && props.onSimulateGame(props.nextGame)}
            style={{ padding: '10px 14px', fontWeight: 900 }}
          >
            Sim Game
          </button>
          <button
            className="btn btnSoft"
            disabled={!props.nextGame}
            onClick={() => props.onSimulateSeries(props.series)}
            style={{ padding: '10px 14px', fontWeight: 900 }}
          >
            Sim Series
          </button>
          {involvesUser ? (
            <button
              className="btn btnPrimary"
              disabled={!props.nextGame}
              onClick={() => props.nextGame && props.onPlay(props.nextGame)}
              style={{ padding: '10px 14px', fontWeight: 900 }}
            >
              Play Game
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlayoffMode(props: {
  franchise: FranchiseState;
  onGoRoster: () => void;
  onPlayoffPlay: (game: PlayoffGame) => void;
  onPlayoffSimGame: (game: PlayoffGame) => void;
  onPlayoffSimSeries: (series: PlayoffSeries) => void;
}) {
  const season = props.franchise.season;
  const playoffs = season?.playoffs;
  const [confirmSim, setConfirmSim] = useState<PlayoffGame | null>(null);
  const [confirmSeries, setConfirmSeries] = useState<PlayoffSeries | null>(null);

  const leagueTeams = useMemo(
    () => [props.franchise.user, props.franchise.ai, ...props.franchise.otherTeams],
    [props.franchise],
  );
  const teamById = useMemo(
    () => Object.fromEntries(leagueTeams.map((team) => [team.id, team])),
    [leagueTeams],
  );

  if (!season || !playoffs) {
    return (
      <div className="page">
        <div className="panelSolid panel" style={{ padding: 16 }}>
          <h2 style={{ margin: 0 }}>Playoff Mode</h2>
          <div className="muted" style={{ marginTop: 10 }}>
            No playoff bracket is available yet.
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btnSoft" onClick={props.onGoRoster}>
              Back to Roster
            </button>
          </div>
        </div>
      </div>
    );
  }

  const teamName = (id: string) => teamById[id]?.name ?? id;
  const roundNow = currentRound(playoffs);
  const playInGames = playoffs.games.filter((game) => game.round === 'playIn');
  const seriesById = Object.fromEntries(playoffs.series.map((series) => [series.id, series]));
  const activeSeries = playoffs.series.filter((series) => !series.winnerTeamId);
  const nextGameBySeriesId = Object.fromEntries(
    activeSeries.map((series) => [
      series.id,
      playoffs.games.find((game) => game.seriesId === series.id && !game.result?.played) ?? null,
    ]),
  ) as Record<string, PlayoffGame | null>;

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div className="playoffHero">
          <div>
            <div className="pill awardsHeroPill">Season Page • Playoff Mode</div>
            <h2 style={{ margin: '12px 0 0' }}>Playoff Picture</h2>
            <div className="muted awardsHeroCopy">
              The season page now flips into playoff mode, with the play-in, live bracket, and series controls all in one place.
            </div>
          </div>
          <div className="playoffHeroMeta">
            <div className="playoffMetaChip">
              <span>Current Round</span>
              <strong>{roundNow === 'playIn' ? 'Play-In' : roundNow === 'complete' ? 'Champion Crowned' : roundLabel(roundNow as PlayoffSeries['round'])}</strong>
            </div>
            <button className="btn btnGhost" onClick={props.onGoRoster} style={{ padding: '10px 14px', fontWeight: 900 }}>
              Back to Roster
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
              playInGames.map((game) => {
                const involvesUser = game.homeTeamId === props.franchise.user.id || game.awayTeamId === props.franchise.user.id;
                return (
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
                    {!game.result?.played ? (
                      <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button className="btn btnSoft" onClick={() => setConfirmSim(game)} style={{ padding: '10px 14px', fontWeight: 900 }}>
                          Sim Game
                        </button>
                        {involvesUser ? (
                          <button className="btn btnPrimary" onClick={() => props.onPlayoffPlay(game)} style={{ padding: '10px 14px', fontWeight: 900 }}>
                            Play Game
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
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

        {activeSeries.length ? (
          <div style={{ marginTop: 18 }}>
            <div className="awardsSectionLabel">Active Series</div>
            <div className="grid1">
              {activeSeries.map((series) => (
                <PlayoffSeriesActionCard
                  key={series.id}
                  series={series}
                  nextGame={nextGameBySeriesId[series.id] ?? null}
                  teamName={teamName}
                  userTeamId={props.franchise.user.id}
                  onPlay={props.onPlayoffPlay}
                  onSimulateGame={(game) => setConfirmSim(game)}
                  onSimulateSeries={(targetSeries) => setConfirmSeries(targetSeries)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {confirmSim ? (
        <Modal title="Simulate this playoff game?" onClose={() => setConfirmSim(null)}>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Simulate this postseason game now? The bracket will update immediately.
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
                props.onPlayoffSimGame(game);
              }}
            >
              Sim Game
            </button>
          </div>
        </Modal>
      ) : null}

      {confirmSeries ? (
        <Modal title="Simulate this full series?" onClose={() => setConfirmSeries(null)}>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Simulate the rest of this matchup all the way to a series winner?
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btnSoft" onClick={() => setConfirmSeries(null)} style={{ padding: '10px 14px' }}>
              Cancel
            </button>
            <button
              className="btn btnPrimary"
              style={{ padding: '10px 14px', fontWeight: 900 }}
              onClick={() => {
                const series = confirmSeries;
                setConfirmSeries(null);
                props.onPlayoffSimSeries(series);
              }}
            >
              Sim Series
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default function SeasonScheduleScreen(props: {
  franchise: FranchiseState;
  onPlay: (game: SeasonGame) => void;
  onSimulate: (game: SeasonGame) => void;
  onSimulateWeek: () => void;
  onAdvanceWeek: () => void;
  onGoRoster: () => void;
  onPlayoffPlay: (game: PlayoffGame) => void;
  onPlayoffSimGame: (game: PlayoffGame) => void;
  onPlayoffSimSeries: (series: PlayoffSeries) => void;
}) {
  const season = props.franchise.season;
  const [confirmSim, setConfirmSim] = useState<SeasonGame | null>(null);
  const [confirmWeekSim, setConfirmWeekSim] = useState(false);

  const leagueTeams = useMemo(
    () => [props.franchise.user, props.franchise.ai, ...props.franchise.otherTeams],
    [props.franchise],
  );
  const teamById = useMemo(
    () => Object.fromEntries(leagueTeams.map((team) => [team.id, team])),
    [leagueTeams],
  );

  if (!season) {
    return (
      <div className="page">
        <div className="panelSolid panel" style={{ padding: 16 }}>
          <h2 style={{ margin: 0 }}>Season Schedule</h2>
          <div className="muted" style={{ marginTop: 10 }}>
            No active season found. Finish the draft to generate a schedule.
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btnSoft" onClick={props.onGoRoster}>
              Back to Roster
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (season.phase === 'playoffs') {
    return (
      <PlayoffMode
        franchise={props.franchise}
        onGoRoster={props.onGoRoster}
        onPlayoffPlay={props.onPlayoffPlay}
        onPlayoffSimGame={props.onPlayoffSimGame}
        onPlayoffSimSeries={props.onPlayoffSimSeries}
      />
    );
  }

  const weekGames = season.games.filter((game) => game.weekIndex === season.weekIndex);
  const allWeekPlayed = weekGames.every((game) => game.result?.played);
  const isLastWeek = season.weekIndex >= season.weeksTotal - 1;
  const completedGames = weekGames.filter((game) => game.result?.played).length;
  const remainingGames = weekGames.filter((game) => !game.result?.played);
  const progressPct = weekGames.length ? (completedGames / weekGames.length) * 100 : 0;
  const recentTrades = props.franchise.tradeHistory.slice(-3).reverse();
  const leadMessage = allWeekPlayed
    ? isLastWeek
      ? 'Every game in the regular season is complete. Awards, seeds, and the play-in bracket are ready to lock.'
      : 'This slate is wrapped. Advance when you are ready for the next week of league action.'
    : 'Play or simulate every matchup in this slate before the season can move on.';

  return (
    <div className="page">
      <div className="panel panelSolid heroSurface" style={{ padding: 18 }}>
        <div className="scheduleHeroGrid">
          <div className="scheduleWeekCard">
            <div className="scheduleWeekKicker">League Hub</div>
            <div className="scheduleWeekTitle">Week {season.weekIndex + 1} of {season.weeksTotal}</div>
            <div className="muted" style={{ marginTop: 10, lineHeight: 1.55, maxWidth: 620 }}>
              {leadMessage}
            </div>
            <div style={{ marginTop: 16 }}>
              <div className="progressTrack">
                <div className="progressBar" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="scheduleProgressText">
                <span>
                  {completedGames} of {weekGames.length} games complete
                </span>
                <span>{Math.round(progressPct)}%</span>
              </div>
            </div>
            <div className="statRow" style={{ marginTop: 16 }}>
              <div className="statChip">
                <span className="statChipLabel">Season Phase</span>
                <span className="statChipValue">Regular Season</span>
              </div>
              <div className="statChip">
                <span className="statChipLabel">Your Team</span>
                <span className="statChipValue">{props.franchise.user.name}</span>
              </div>
              <div className="statChip">
                <span className="statChipLabel">Week Goal</span>
                <span className="statChipValue">{isLastWeek ? 'Lock the Play-In' : 'Keep Pace'}</span>
              </div>
              <div className="statChip">
                <span className="statChipLabel">Season Length</span>
                <span className="statChipValue">{season.gamesPerTeam} Games</span>
              </div>
            </div>
          </div>

          <div className="card scheduleSummaryCard">
            <div className="scheduleSummaryTitle">League Movement</div>
            <div style={{ marginTop: 10, fontSize: 24, fontWeight: 1000 }}>
              {recentTrades.length ? `${recentTrades.length} recent trade${recentTrades.length === 1 ? '' : 's'}` : 'Quiet market'}
            </div>
            <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.76)', lineHeight: 1.5 }}>
              AI teams can now chase upgrades throughout the season, so the league changes around you instead of staying frozen.
            </div>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {recentTrades.length ? (
                recentTrades.map((trade) => (
                  <div key={trade.id} className="scheduleSummaryItem">
                    <div style={{ fontWeight: 900, lineHeight: 1.45 }}>{trade.description}</div>
                    <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.68)', fontSize: 12 }}>
                      {new Date(trade.createdAtMs).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="scheduleSummaryItem" style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                  No deals have landed yet. Once weeks start rolling, contenders and rebuilding teams will begin moving pieces around.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="panel panelSolid" style={{ padding: 18, marginTop: 16 }}>
        <div className="sectionTitleRow">
          <div>
            <h2 style={{ margin: 0 }}>This Week&apos;s Games</h2>
            <div className="muted" style={{ marginTop: 6 }}>
              Manage your slate, track status at a glance, and move the calendar only when every result is locked in.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btnGhost" onClick={props.onGoRoster}>
              Back to Roster
            </button>
            <button
              className="btn btnSoft"
              onClick={() => setConfirmWeekSim(true)}
              disabled={remainingGames.length === 0}
              title={remainingGames.length === 0 ? 'This week is already fully simulated' : `Simulate all ${remainingGames.length} remaining games`}
            >
              Sim Whole Week
            </button>
            <button
              className="btn btnPrimary"
              onClick={props.onAdvanceWeek}
              disabled={!allWeekPlayed}
              title={!allWeekPlayed ? 'Finish all games this week first' : isLastWeek ? 'Finish regular season' : 'Advance to next week'}
            >
              {isLastWeek ? 'Continue to Awards' : 'Advance Week'}
            </button>
          </div>
        </div>

        <div className="scheduleList" style={{ marginTop: 16 }}>
          {weekGames.map((game) => {
            const home = teamById[game.homeTeamId];
            const away = teamById[game.awayTeamId];
            const played = !!game.result?.played;
            const involvesUser = game.homeTeamId === props.franchise.user.id || game.awayTeamId === props.franchise.user.id;
            const canPlay = involvesUser && !played;
            const canSim = !played;
            const winnerTeamId = game.result?.winnerTeamId ?? null;
            const homeWon = winnerTeamId === game.homeTeamId;
            const awayWon = winnerTeamId === game.awayTeamId;

            return (
              <div key={game.id} className="card scheduleGameCard">
                <div className="scheduleGameTop">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="scheduleMatchup">
                      <div className="scheduleTeamCard">
                        <div className="scheduleTeamLogo" style={{ background: home?.logoColor ?? '#2563eb' }}>
                          {home?.logoText ?? 'H'}
                        </div>
                        <div className="scheduleTeamText">
                          <div className="scheduleTeamLabel">Home</div>
                          <div className="scheduleTeamName">
                            {home?.name ?? game.homeTeamId} {homeWon ? '(W)' : ''}
                          </div>
                        </div>
                      </div>

                      <div className="scheduleVs">
                        {played ? `${game.result?.score.home}-${game.result?.score.away}` : 'VS'}
                      </div>

                      <div className="scheduleTeamCard">
                        <div className="scheduleTeamLogo" style={{ background: away?.logoColor ?? '#0ea5e9' }}>
                          {away?.logoText ?? 'A'}
                        </div>
                        <div className="scheduleTeamText">
                          <div className="scheduleTeamLabel">Away</div>
                          <div className="scheduleTeamName">
                            {away?.name ?? game.awayTeamId} {awayWon ? '(W)' : ''}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="scheduleMetaRow">
                      <span className="scheduleMetaPill">{played ? 'Final Locked' : 'Waiting to be played'}</span>
                      {involvesUser ? <span className="scheduleMetaPill">Your team is involved</span> : null}
                      {!played && !involvesUser ? <span className="scheduleMetaPill">CPU matchup</span> : null}
                    </div>
                  </div>

                  <div className="scheduleActions">
                    <button className="btn btnSoft" disabled={!canSim} onClick={() => setConfirmSim(game)}>
                      Simulate
                    </button>
                    <button
                      className="btn btnPrimary"
                      disabled={!canPlay}
                      onClick={() => props.onPlay(game)}
                      title={!involvesUser ? 'You can only play games involving your team' : undefined}
                    >
                      Play
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16 }} className="emptyState muted">
          Tip: You can simulate any game. You can only play games that involve your team.
        </div>
      </div>

      {confirmSim ? (
        <Modal title="Simulate this game?" onClose={() => setConfirmSim(null)}>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Do you want to simulate this game? Player stats and results will be calculated automatically.
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
      ) : null}

      {confirmWeekSim ? (
        <Modal title="Simulate the whole week?" onClose={() => setConfirmWeekSim(false)}>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Simulate all {remainingGames.length} remaining games in this week at once? This is the fast way to finish the slate without clicking every matchup.
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btnSoft" onClick={() => setConfirmWeekSim(false)} style={{ padding: '10px 14px' }}>
              Cancel
            </button>
            <button
              className="btn btnPrimary"
              style={{ padding: '10px 14px', fontWeight: 900 }}
              onClick={() => {
                setConfirmWeekSim(false);
                props.onSimulateWeek();
              }}
            >
              Sim Whole Week
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
