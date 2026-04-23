import React, { useMemo } from 'react';
import type { ChampionshipHistoryEntry, FranchiseState, PlayerAwardHistoryEntry, TeamPlayer } from '../game/types';

type PlayerRecordRow = {
  playerId: string;
  playerName: string;
  teamName: string;
  value: number;
  subtitle: string;
};

function countAwards(player: TeamPlayer, awardType: PlayerAwardHistoryEntry['awardType']) {
  return (player.awardHistory ?? []).filter((entry) => entry.awardType === awardType).length;
}

function safeTopRecord(players: Array<{ player: TeamPlayer; teamName: string }>, value: (player: TeamPlayer) => number, subtitle: (player: TeamPlayer) => string): PlayerRecordRow | null {
  const sorted = players
    .map((entry) => ({
      playerId: entry.player.id,
      playerName: entry.player.prospect.name,
      teamName: entry.teamName,
      value: value(entry.player),
      subtitle: subtitle(entry.player),
    }))
    .sort((a, b) => b.value - a.value);
  return sorted[0] ?? null;
}

function formatFinals(entry: ChampionshipHistoryEntry) {
  if (typeof entry.finalsWinsChampion === 'number' && typeof entry.finalsWinsRunnerUp === 'number') {
    return `${entry.championTeamName} def. ${entry.runnerUpTeamName ?? 'TBD'} ${entry.finalsWinsChampion}-${entry.finalsWinsRunnerUp}`;
  }
  if (entry.runnerUpTeamName) return `${entry.championTeamName} def. ${entry.runnerUpTeamName}`;
  return `${entry.championTeamName} won the title`;
}

export default function HistoryScreen(props: { franchise: FranchiseState; onBack: () => void }) {
  const allPlayers = useMemo(
    () => [
      ...props.franchise.user.roster.map((player) => ({ player, teamName: props.franchise.user.name })),
      ...props.franchise.ai.roster.map((player) => ({ player, teamName: props.franchise.ai.name })),
      ...props.franchise.otherTeams.flatMap((team) => team.roster.map((player) => ({ player, teamName: team.name }))),
      ...props.franchise.freeAgents.map((player) => ({ player, teamName: 'Free Agent Pool' })),
    ],
    [props.franchise],
  );

  const records = useMemo(
    () => [
      safeTopRecord(allPlayers, (player) => player.careerStats.points, (player) => `${player.careerStats.points} career points`),
      safeTopRecord(allPlayers, (player) => player.careerStats.assists, (player) => `${player.careerStats.assists} career assists`),
      safeTopRecord(allPlayers, (player) => player.careerStats.rebounds, (player) => `${player.careerStats.rebounds} career rebounds`),
      safeTopRecord(allPlayers, (player) => player.championships, (player) => `${player.championships} championships`),
      safeTopRecord(allPlayers, (player) => countAwards(player, 'mvp'), (player) => `${countAwards(player, 'mvp')} MVP awards`),
    ],
    [allPlayers],
  );

  const historyRows = useMemo(() => {
    const awardsBySeason = new Map((props.franchise.seasonAwardsHistory ?? []).map((entry) => [entry.seasonIndex, entry]));
    return (props.franchise.championshipHistory ?? [])
      .slice()
      .sort((a, b) => b.seasonIndex - a.seasonIndex)
      .map((entry) => ({
        champion: entry,
        awards: awardsBySeason.get(entry.seasonIndex),
      }));
  }, [props.franchise.championshipHistory, props.franchise.seasonAwardsHistory]);

  return (
    <div className="page">
      <div className="panel panelSolid historyPage">
        <div className="historyHero">
          <div>
            <div className="pill awardsHeroPill">League memory bank</div>
            <h2 style={{ margin: '12px 0 0' }}>League History & Records</h2>
            <div className="muted awardsHeroCopy">
              Championships, MVPs, and career totals now stack season over season so the league keeps its own story instead of resetting every year.
            </div>
          </div>
          <button className="btn btnGhost" onClick={props.onBack} style={{ padding: '10px 14px', fontWeight: 900 }}>
            Back
          </button>
        </div>

        <div className="historyRecordGrid">
          {records.filter((entry): entry is PlayerRecordRow => !!entry).map((entry) => (
            <div key={`${entry.playerId}-${entry.subtitle}`} className="card historyRecordCard">
              <div className="awardsSectionLabel">{entry.subtitle.split(' ').slice(1).join(' ')}</div>
              <div className="historyRecordValue">{entry.value}</div>
              <div className="historyRecordName">{entry.playerName}</div>
              <div className="muted">{entry.teamName}</div>
            </div>
          ))}
        </div>

        <div className="grid2" style={{ marginTop: 16 }}>
          <div className="card historyPanel">
            <div className="awardsSectionLabel">Season By Season</div>
            <div className="historyTimeline">
              {historyRows.length ? (
                historyRows.map((row) => (
                  <div key={`history-${row.champion.seasonIndex}`} className="historyTimelineRow">
                    <div className="historyTimelineSeason">Season {row.champion.seasonIndex}</div>
                    <div className="historyTimelineBody">
                      <div className="historyTimelineTitle">{row.champion.championTeamName}</div>
                      <div className="muted">{formatFinals(row.champion)}</div>
                      <div className="historyTimelineMeta">
                        MVP: {row.awards?.mvp ? `${row.awards.mvp.playerName} (${row.awards.mvp.teamName})` : 'TBD'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="muted">Finish a full season and playoffs to start the history book.</div>
              )}
            </div>
          </div>

          <div className="card historyPanel">
            <div className="awardsSectionLabel">Current Legends Board</div>
            <div className="historyLeadersList">
              {allPlayers
                .slice()
                .sort((a, b) => b.player.careerStats.points - a.player.careerStats.points)
                .slice(0, 8)
                .map((entry, index) => (
                  <div key={`career-${entry.player.id}`} className="historyLeaderRow">
                    <div>
                      <div className="historyLeaderName">
                        #{index + 1} {entry.player.prospect.name}
                      </div>
                      <div className="muted">
                        {entry.teamName} • {entry.player.prospect.position}
                      </div>
                    </div>
                    <div className="historyLeaderStats">
                      <div>{entry.player.careerStats.points} PTS</div>
                      <div>{entry.player.championships} CH</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
