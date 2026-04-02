import React, { useMemo, useState } from 'react';
import type { FranchiseState, SeasonGame } from '../game/types';
import Modal from './Modal';

export default function SeasonScheduleScreen(props: {
  franchise: FranchiseState;
  onPlay: (game: SeasonGame) => void;
  onSimulate: (game: SeasonGame) => void;
  onSimulateWeek: () => void;
  onAdvanceWeek: () => void;
  onGoRoster: () => void;
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

  const weekGames = season.games.filter((game) => game.weekIndex === season.weekIndex);
  const allWeekPlayed = weekGames.every((game) => game.result?.played);
  const isLastWeek = season.weekIndex >= season.weeksTotal - 1;
  const completedGames = weekGames.filter((game) => game.result?.played).length;
  const remainingGames = weekGames.filter((game) => !game.result?.played);
  const progressPct = weekGames.length ? (completedGames / weekGames.length) * 100 : 0;
  const recentTrades = props.franchise.tradeHistory.slice(-3).reverse();
  const leadMessage = allWeekPlayed
    ? isLastWeek
      ? 'Every game in the regular season is complete. The playoff bracket is ready to go.'
      : 'This slate is wrapped. Advance when you are ready for the next week of league action.'
    : 'Play or simulate every matchup in this slate before the season can move on.';

  return (
    <div className="page">
      <div className="panel panelSolid heroSurface" style={{ padding: 18 }}>
        <div className="scheduleHeroGrid">
          <div className="scheduleWeekCard">
            <div className="scheduleWeekKicker">League Hub</div>
            <div className="scheduleWeekTitle">Week {season.weekIndex + 1} Matchday</div>
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
                <span className="statChipValue">{season.phase === 'regular' ? 'Regular Season' : 'Playoffs'}</span>
              </div>
              <div className="statChip">
                <span className="statChipLabel">Your Team</span>
                <span className="statChipValue">{props.franchise.user.name}</span>
              </div>
              <div className="statChip">
                <span className="statChipLabel">Week Goal</span>
                <span className="statChipValue">{isLastWeek ? 'Close the Year' : 'Keep Pace'}</span>
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
              {isLastWeek ? 'Finish Regular Season' : 'Advance Week'}
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
                    <button
                      className="btn btnSoft"
                      disabled={!canSim}
                      onClick={() => setConfirmSim(game)}
                    >
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

      {confirmSim && (
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
      )}

      {confirmWeekSim && (
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
      )}
    </div>
  );
}
