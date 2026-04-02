import React, { useMemo, useState } from 'react';
import type { DraftStandingRow, FranchiseState, PowerRankingRow, TeamPlayer, TeamState } from '../game/types';

type LeaguePlayerRow = {
  teamId: string;
  teamName: string;
  player: TeamPlayer;
};

function getLeaguePlayerLeaders(players: LeaguePlayerRow[]) {
  const byStat = (stat: (p: TeamPlayer) => number) =>
    players.length ? players.slice().sort((a, b) => stat(b.player) - stat(a.player))[0] : null;

  return {
    points: byStat((p) => p.seasonStats.points),
    assists: byStat((p) => p.seasonStats.assists),
    rebounds: byStat((p) => p.seasonStats.rebounds),
    steals: byStat((p) => p.seasonStats.steals),
    blocks: byStat((p) => p.seasonStats.blocks),
  };
}

function activeStatsForPhase(player: TeamPlayer, phase: FranchiseState['season']['phase'] | undefined) {
  return phase === 'playoffs' ? player.playoffStats : player.seasonStats;
}

function computeLotteryOdds(standings: DraftStandingRow[]) {
  const weights = standings.map((row) => ({ teamId: row.teamId, row, weight: 1 / Math.max(1, row.wins + 1) }));
  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  return weights
    .map((w) => ({ ...w, odd: total ? Math.round((w.weight / total) * 10000) / 100 : 0 }))
    .sort((a, b) => b.odd - a.odd);
}

function streakLabel(row: DraftStandingRow) {
  if (!row.streakCount) return '—';
  return `${row.streak}${row.streakCount}`;
}

function TeamBadge(props: { team: Pick<TeamState, 'logoText' | 'logoColor' | 'name'>; compact?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: props.compact ? 8 : 10 }}>
      <div
        style={{
          width: props.compact ? 28 : 34,
          height: props.compact ? 28 : 34,
          borderRadius: props.compact ? 10 : 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(180deg, ${props.team.logoColor}, rgba(15,23,42,0.24))`,
          color: '#fff',
          fontWeight: 900,
          boxShadow: '0 10px 20px rgba(15,23,42,0.14)',
        }}
      >
        {props.team.logoText}
      </div>
      <div style={{ fontWeight: 900, lineHeight: 1.1 }}>{props.team.name}</div>
    </div>
  );
}

function LeaderCard(props: {
  label: string;
  statLabel: string;
  value: number;
  color: string;
  leader: LeaguePlayerRow | null;
  fallbackTeam?: Pick<TeamState, 'logoText' | 'logoColor' | 'name'>;
}) {
  return (
    <div
      className="card"
      style={{
        background: `linear-gradient(180deg, ${props.color}, rgba(255,255,255,0.92))`,
        border: '1px solid rgba(15,23,42,0.08)',
      }}
    >
      <div className="muted" style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {props.label}
      </div>
      <div style={{ marginTop: 10, fontSize: 20, fontWeight: 1000 }}>
        {props.leader ? props.leader.player.prospect.name : 'No leader yet'}
      </div>
      <div className="muted" style={{ marginTop: 6, minHeight: 20 }}>
        {props.leader ? props.leader.teamName : 'Play games to populate league leaders.'}
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 1000 }}>{props.value}</div>
        {props.leader ? (
          <div
            className="pill"
            style={{
              background: 'rgba(15,23,42,0.08)',
              border: '1px solid rgba(15,23,42,0.08)',
              fontWeight: 900,
            }}
          >
            {props.statLabel}
          </div>
        ) : props.fallbackTeam ? (
          <TeamBadge team={props.fallbackTeam} compact />
        ) : null}
      </div>
    </div>
  );
}

export default function StatsScreen(props: { franchise: FranchiseState; onBack: () => void }) {
  const franchise = props.franchise;
  const statsPhase = franchise.season?.phase === 'playoffs' ? 'playoffs' : 'regular';
  const teams = useMemo(() => [franchise.user, franchise.ai, ...franchise.otherTeams], [franchise]);
  const teamById = useMemo(() => Object.fromEntries(teams.map((team) => [team.id, team])) as Record<string, TeamState>, [teams]);

  const standings = useMemo(() => {
    if (franchise.seasonStandings?.length) {
      return franchise.seasonStandings
        .slice()
        .sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst));
    }

    return teams
      .map((t) => ({
        teamId: t.id,
        teamName: t.name,
        managerName: t.managerName,
        logoText: t.logoText,
        logoColor: t.logoColor,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        streak: 'â€”' as const,
        streakCount: 0,
      }))
      .sort((a, b) => b.wins - a.wins);
  }, [franchise, teams]);

  const powerRankings = useMemo(() => {
    if (franchise.powerRankings?.length) return franchise.powerRankings.slice().sort((a, b) => a.rank - b.rank);
    return teams
      .map((t, idx) => ({
        teamId: t.id,
        teamName: t.name,
        managerName: t.managerName,
        logoText: t.logoText,
        logoColor: t.logoColor,
        rank: idx + 1,
        score: t.teamRating,
      }))
      .sort((a, b) => a.rank - b.rank);
  }, [franchise, teams]);

  const allPlayers = useMemo(
    () => teams.flatMap((team) => team.roster.map((player) => ({ teamId: team.id, teamName: team.name, player }))),
    [teams],
  );

  const leaders = useMemo(
    () =>
      getLeaguePlayerLeaders(
        allPlayers.map((entry) => ({
          ...entry,
          player: {
            ...entry.player,
            seasonStats: activeStatsForPhase(entry.player, statsPhase),
          },
        })),
      ),
    [allPlayers, statsPhase],
  );
  const lotteryOdds = useMemo(() => computeLotteryOdds(standings), [standings]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const seasonLabel =
    franchise.season?.phase === 'playoffs'
      ? 'Playoffs Live'
      : franchise.season?.phase === 'complete'
        ? 'Season Complete'
        : franchise.season
          ? `Week ${franchise.season.weekIndex + 1} Regular Season`
          : 'Preseason';

  const bestRecord = standings[0];
  const topPower = powerRankings[0];
  const selectedTeam =
    teams.find((team) => team.id === selectedTeamId) ??
    (bestRecord ? teams.find((team) => team.id === bestRecord.teamId) : undefined) ??
    franchise.user;

  const summaryTeam = bestRecord ? teamById[bestRecord.teamId] : franchise.user;

  return (
    <div className="page">
      <div className="panelSolid panel" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="pill" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.16)' }}>
              {seasonLabel}
            </div>
            <h2 style={{ margin: '10px 0 0' }}>Stats & League Dashboard</h2>
            <div className="muted" style={{ marginTop: 6, maxWidth: 620, lineHeight: 1.5 }}>
              Track {statsPhase === 'playoffs' ? 'playoff' : 'regular-season'} leaders, standings, power movement, and lottery pressure from one place.
            </div>
          </div>
          <button className="btn btnSoft" onClick={props.onBack} style={{ padding: '10px 14px' }}>
            Back to Roster
          </button>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(37,99,235,0.96), rgba(14,165,233,0.78))',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          >
            <div className="muted" style={{ color: 'rgba(255,255,255,0.76)', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.6 }}>
              League Snapshot
            </div>
            <div style={{ marginTop: 12, fontSize: 30, fontWeight: 1000 }}>
              {bestRecord ? `${bestRecord.teamName} leads the table` : 'Season waiting to tip off'}
            </div>
            <div style={{ marginTop: 10, color: 'rgba(255,255,255,0.84)', lineHeight: 1.5 }}>
              {bestRecord
                ? `${bestRecord.wins}-${bestRecord.losses} record, ${bestRecord.pointsFor - bestRecord.pointsAgainst >= 0 ? '+' : ''}${bestRecord.pointsFor - bestRecord.pointsAgainst} point differential, ${streakLabel(bestRecord)} streak.`
                : 'Complete the draft and begin the season to unlock live standings and award races.'}
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="pill" style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
                Best Record: {bestRecord ? `${bestRecord.wins}-${bestRecord.losses}` : '0-0'}
              </span>
              <span className="pill" style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }}>
                Top Power Team: {topPower ? topPower.teamName : 'TBD'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div className="card" style={{ background: 'rgba(245,158,11,0.12)' }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Best Record
              </div>
              <div style={{ marginTop: 10 }}>
                <TeamBadge team={summaryTeam} />
              </div>
              <div style={{ marginTop: 10, fontSize: 26, fontWeight: 1000 }}>
                {bestRecord ? `${bestRecord.wins}-${bestRecord.losses}` : '0-0'}
              </div>
            </div>

            <div className="card" style={{ background: 'rgba(16,185,129,0.10)' }}>
              <div className="muted" style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Lottery Heat
              </div>
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: 1000 }}>
                {lotteryOdds[0] ? `${lotteryOdds[0].row.teamName} ${lotteryOdds[0].odd}%` : 'No odds yet'}
              </div>
              <div className="muted" style={{ marginTop: 6 }}>
                Worst records carry the best shot at the next top pick.
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <LeaderCard label="Points" statLabel="PTS" value={leaders.points?.player.seasonStats.points ?? 0} color="rgba(245,158,11,0.16)" leader={leaders.points} fallbackTeam={summaryTeam} />
          <LeaderCard label="Assists" statLabel="AST" value={leaders.assists?.player.seasonStats.assists ?? 0} color="rgba(14,165,233,0.16)" leader={leaders.assists} fallbackTeam={summaryTeam} />
          <LeaderCard label="Rebounds" statLabel="REB" value={leaders.rebounds?.player.seasonStats.rebounds ?? 0} color="rgba(16,185,129,0.16)" leader={leaders.rebounds} fallbackTeam={summaryTeam} />
          <LeaderCard label="Steals" statLabel="STL" value={leaders.steals?.player.seasonStats.steals ?? 0} color="rgba(99,102,241,0.14)" leader={leaders.steals} fallbackTeam={summaryTeam} />
          <LeaderCard label="Blocks" statLabel="BLK" value={leaders.blocks?.player.seasonStats.blocks ?? 0} color="rgba(239,68,68,0.14)" leader={leaders.blocks} fallbackTeam={summaryTeam} />
        </div>

        <div style={{ marginTop: 16 }} className="grid2">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <b>Standings</b>
              <span className="muted" style={{ fontSize: 12 }}>Click a team to inspect</span>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {standings.map((row, index) => {
                const team = teamById[row.teamId];
                const selected = selectedTeam.id === row.teamId;
                return (
                  <button
                    key={row.teamId}
                    className="btn"
                    onClick={() => setSelectedTeamId(row.teamId)}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      background: selected ? 'rgba(37,99,235,0.10)' : 'rgba(255,255,255,0.92)',
                      borderColor: selected ? 'rgba(37,99,235,0.24)' : 'rgba(15,23,42,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontWeight: 1000, minWidth: 22 }}>{index + 1}</div>
                        {team ? <TeamBadge team={team} compact /> : <div style={{ fontWeight: 900 }}>{row.teamName}</div>}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 1000 }}>{row.wins}-{row.losses}</div>
                        <div className="muted" style={{ fontSize: 12 }}>
                          PD {row.pointsFor - row.pointsAgainst} | {streakLabel(row)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <b>Power Rankings</b>
              <span className="muted" style={{ fontSize: 12 }}>Current form + roster quality</span>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {powerRankings.map((row: PowerRankingRow) => {
                const team = teamById[row.teamId];
                const selected = selectedTeam.id === row.teamId;
                return (
                  <button
                    key={row.teamId}
                    className="btn"
                    onClick={() => setSelectedTeamId(row.teamId)}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      background: selected ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.92)',
                      borderColor: selected ? 'rgba(16,185,129,0.24)' : 'rgba(15,23,42,0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontWeight: 1000, minWidth: 26 }}>#{row.rank}</div>
                        {team ? <TeamBadge team={team} compact /> : <div style={{ fontWeight: 900 }}>{row.teamName}</div>}
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 1000 }}>
                        {Math.round(row.score * 10) / 10}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }} className="grid2">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <b>{selectedTeam.name}</b>
                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                  {selectedTeam.managerName} | Rating {selectedTeam.teamRating}/10
                </div>
              </div>
              <TeamBadge team={selectedTeam} />
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              {selectedTeam.roster.length ? (
                selectedTeam.roster
                  .slice()
                  .sort((a, b) => b.prospect.overall - a.prospect.overall)
                  .map((player) => (
                    <div
                      key={player.id}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.82)',
                        border: '1px solid rgba(15,23,42,0.08)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>{player.prospect.name}</div>
                        <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                          {player.prospect.position} | Potential {player.prospect.potential}/10
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 1000 }}>OVR {player.prospect.overall}</div>
                        <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                          PTS {activeStatsForPhase(player, statsPhase).points} | AST {activeStatsForPhase(player, statsPhase).assists}
                        </div>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="muted">No roster data yet.</div>
              )}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <b>Draft Lottery Odds</b>
              <span className="muted" style={{ fontSize: 12 }}>Projected from current records</span>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {lotteryOdds.map((row) => {
                const team = teamById[row.teamId];
                return (
                  <div key={row.teamId}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                      {team ? <TeamBadge team={team} compact /> : <div style={{ fontWeight: 900 }}>{row.row.teamName}</div>}
                      <div style={{ fontWeight: 1000 }}>{row.odd}%</div>
                    </div>
                    <div className="progressTrack" style={{ marginTop: 6 }}>
                      <div className="progressBar" style={{ width: `${Math.min(100, row.odd)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
