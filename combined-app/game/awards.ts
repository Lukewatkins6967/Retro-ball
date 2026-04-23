import type {
  AllLeagueSlot,
  AllLeagueTeamEntry,
  DraftStandingRow,
  FranchiseState,
  PlayerAwardHistoryEntry,
  SeasonAwards,
  SeasonAwardWinner,
  TeamPlayer,
  TeamState,
} from './types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getLeagueTeams(franchise: FranchiseState): TeamState[] {
  return [franchise.user, franchise.ai, ...franchise.otherTeams];
}

function gamesPlayed(player: TeamPlayer) {
  return Math.max(1, player.seasonStats.matchesPlayed);
}

function perGame(player: TeamPlayer) {
  const games = gamesPlayed(player);
  return {
    points: player.seasonStats.points / games,
    assists: player.seasonStats.assists / games,
    rebounds: player.seasonStats.rebounds / games,
    steals: player.seasonStats.steals / games,
    blocks: player.seasonStats.blocks / games,
  };
}

function positionBucket(position: string) {
  const lower = position.toLowerCase();
  if (lower.includes('point') || lower.includes('shooting') || lower.includes('guard')) return 'guard';
  if (lower.includes('small') || lower.includes('power') || lower.includes('forward')) return 'forward';
  if (lower.includes('center')) return 'center';
  return 'forward';
}

function teamSuccess(row?: DraftStandingRow) {
  if (!row) return 0.5;
  const total = row.wins + row.losses;
  if (!total) return 0.5;
  return row.wins / total;
}

function efficiencyProxy(player: TeamPlayer) {
  const pg = perGame(player);
  return pg.points + pg.assists * 1.65 + pg.rebounds * 1.15 + pg.steals * 2.8 + pg.blocks * 2.8;
}

function mvpScore(player: TeamPlayer, row?: DraftStandingRow) {
  const pg = perGame(player);
  const winRate = teamSuccess(row);
  return (
    efficiencyProxy(player) * 1.15 +
    pg.points * 1.8 +
    pg.assists * 1.2 +
    pg.rebounds * 0.8 +
    player.prospect.overall * 0.18 +
    winRate * 16
  );
}

function royScore(player: TeamPlayer, row?: DraftStandingRow) {
  const pg = perGame(player);
  const winRate = teamSuccess(row);
  return efficiencyProxy(player) + pg.points * 1.65 + pg.assists * 1.1 + pg.rebounds * 0.9 + winRate * 10;
}

function dpoyScore(player: TeamPlayer, row?: DraftStandingRow) {
  const pg = perGame(player);
  const winRate = teamSuccess(row);
  return (
    pg.steals * 4.2 +
    pg.blocks * 4.8 +
    pg.rebounds * 1.2 +
    player.prospect.categories.defense * 2.5 +
    player.prospect.overall * 0.08 +
    winRate * 10
  );
}

function allLeagueScore(player: TeamPlayer, row?: DraftStandingRow) {
  return mvpScore(player, row) * 0.72 + dpoyScore(player, row) * 0.18 + player.prospect.overall * 0.1;
}

function playerAwardEntry(seasonIndex: number, awardType: PlayerAwardHistoryEntry['awardType'], label: string): PlayerAwardHistoryEntry {
  return { seasonIndex, awardType, label };
}

function appendUniqueAwardHistory(history: PlayerAwardHistoryEntry[], nextEntry: PlayerAwardHistoryEntry) {
  if (history.some((entry) => entry.seasonIndex === nextEntry.seasonIndex && entry.awardType === nextEntry.awardType)) {
    return history;
  }
  return [...history, nextEntry];
}

function buildWinner(team: TeamState, player: TeamPlayer, score: number): SeasonAwardWinner {
  return {
    playerId: player.id,
    playerName: player.prospect.name,
    teamId: team.id,
    teamName: team.name,
    score: Math.round(score * 10) / 10,
  };
}

function buildAllLeagueFirstTeam(franchise: FranchiseState, standingsById: Map<string, DraftStandingRow>): AllLeagueTeamEntry[] {
  const teams = getLeagueTeams(franchise);
  const pool = teams.flatMap((team) =>
    team.roster
      .filter((player) => player.seasonStats.matchesPlayed > 0)
      .map((player) => ({
        team,
        player,
        bucket: positionBucket(player.prospect.position),
        score: allLeagueScore(player, standingsById.get(team.id)),
      })),
  );

  const used = new Set<string>();
  const slots: Array<{ slot: AllLeagueSlot; bucket: 'guard' | 'forward' | 'center' }> = [
    { slot: 'G1', bucket: 'guard' },
    { slot: 'G2', bucket: 'guard' },
    { slot: 'F1', bucket: 'forward' },
    { slot: 'F2', bucket: 'forward' },
    { slot: 'C', bucket: 'center' },
  ];

  return slots
    .map(({ slot, bucket }) => {
      const candidates = pool
        .filter((entry) => !used.has(entry.player.id))
        .filter((entry) => (bucket === 'center' ? entry.bucket === 'center' : entry.bucket === bucket || entry.bucket === 'center'))
        .sort((a, b) => b.score - a.score);
      const fallback = pool.filter((entry) => !used.has(entry.player.id)).sort((a, b) => b.score - a.score);
      const winner = candidates[0] ?? fallback[0];
      if (!winner) return null;
      used.add(winner.player.id);
      return {
        slot,
        playerId: winner.player.id,
        playerName: winner.player.prospect.name,
        teamId: winner.team.id,
        teamName: winner.team.name,
        position: winner.player.prospect.position,
        score: Math.round(winner.score * 10) / 10,
      } satisfies AllLeagueTeamEntry;
    })
    .filter((entry): entry is AllLeagueTeamEntry => !!entry);
}

export function computeSeasonAwards(franchise: FranchiseState): SeasonAwards {
  const teams = getLeagueTeams(franchise);
  const standingsById = new Map(franchise.seasonStandings.map((row) => [row.teamId, row]));
  const eligible = teams.flatMap((team) =>
    team.roster
      .filter((player) => player.seasonStats.matchesPlayed > 0)
      .map((player) => ({ team, player, row: standingsById.get(team.id) })),
  );

  const mvp = eligible
    .map((entry) => ({ ...entry, score: mvpScore(entry.player, entry.row) }))
    .sort((a, b) => b.score - a.score)[0];

  const roy = eligible
    .filter((entry) => entry.player.yearsWithTeam === 0)
    .map((entry) => ({ ...entry, score: royScore(entry.player, entry.row) }))
    .sort((a, b) => b.score - a.score)[0];

  const dpoy = eligible
    .map((entry) => ({ ...entry, score: dpoyScore(entry.player, entry.row) }))
    .sort((a, b) => b.score - a.score)[0];

  return {
    seasonIndex: franchise.seasonIndex,
    mvp: mvp ? buildWinner(mvp.team, mvp.player, mvp.score) : undefined,
    roy: roy ? buildWinner(roy.team, roy.player, roy.score) : undefined,
    dpoy: dpoy ? buildWinner(dpoy.team, dpoy.player, dpoy.score) : undefined,
    allLeagueFirstTeam: buildAllLeagueFirstTeam(franchise, standingsById),
  };
}

export function applySeasonAwards(franchise: FranchiseState, awards = computeSeasonAwards(franchise)): FranchiseState {
  const seasonIndex = awards.seasonIndex;
  const labelByPlayerId = new Map<string, PlayerAwardHistoryEntry[]>();

  if (awards.mvp) {
    labelByPlayerId.set(
      awards.mvp.playerId,
      [...(labelByPlayerId.get(awards.mvp.playerId) ?? []), playerAwardEntry(seasonIndex, 'mvp', 'MVP')],
    );
  }
  if (awards.roy) {
    labelByPlayerId.set(
      awards.roy.playerId,
      [...(labelByPlayerId.get(awards.roy.playerId) ?? []), playerAwardEntry(seasonIndex, 'roy', 'Rookie of the Year')],
    );
  }
  if (awards.dpoy) {
    labelByPlayerId.set(
      awards.dpoy.playerId,
      [...(labelByPlayerId.get(awards.dpoy.playerId) ?? []), playerAwardEntry(seasonIndex, 'dpoy', 'Defensive Player of the Year')],
    );
  }
  for (const entry of awards.allLeagueFirstTeam) {
    labelByPlayerId.set(
      entry.playerId,
      [...(labelByPlayerId.get(entry.playerId) ?? []), playerAwardEntry(seasonIndex, 'allLeagueFirstTeam', 'All-League First Team')],
    );
  }

  const applyToRoster = (team: TeamState): TeamState => ({
    ...team,
    roster: team.roster.map((player) => {
      const awardEntries = labelByPlayerId.get(player.id);
      if (!awardEntries?.length) return player;
      return {
        ...player,
        awardHistory: awardEntries.reduce(
          (history, entry) => appendUniqueAwardHistory(history, entry),
          player.awardHistory ?? [],
        ),
      };
    }),
  });

  const existingHistory = franchise.seasonAwardsHistory ?? [];
  const nextHistory = existingHistory.some((entry) => entry.seasonIndex === awards.seasonIndex)
    ? existingHistory.map((entry) => (entry.seasonIndex === awards.seasonIndex ? awards : entry))
    : [...existingHistory, awards].sort((a, b) => a.seasonIndex - b.seasonIndex);

  return {
    ...franchise,
    user: applyToRoster(franchise.user),
    ai: applyToRoster(franchise.ai),
    otherTeams: franchise.otherTeams.map(applyToRoster),
    freeAgents: franchise.freeAgents.map((player) => {
      const awardEntries = labelByPlayerId.get(player.id);
      if (!awardEntries?.length) return player;
      return {
        ...player,
        awardHistory: awardEntries.reduce(
          (history, entry) => appendUniqueAwardHistory(history, entry),
          player.awardHistory ?? [],
        ),
      };
    }),
    seasonAwards: awards,
    seasonAwardsHistory: nextHistory,
  };
}

export function summarizeAwardWinner(winner?: SeasonAwardWinner) {
  if (!winner) return 'TBD';
  return `${winner.playerName} (${winner.teamName})`;
}
