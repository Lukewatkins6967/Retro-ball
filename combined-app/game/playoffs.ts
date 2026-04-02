import type { DraftStandingRow, PlayoffGame, PlayoffsState, TeamState } from './types';

export function computeQualifiedCount(teamCount: number) {
  if (teamCount <= 6) return Math.min(2, teamCount);
  if (teamCount <= 10) return Math.min(4, teamCount);
  return Math.min(8, teamCount);
}

export function seedTeamsByStandings(teams: TeamState[], standings: DraftStandingRow[]) {
  const rowById = new Map(standings.map((r) => [r.teamId, r]));
  const seeded = teams
    .slice()
    .sort((a, b) => {
      const ra = rowById.get(a.id);
      const rb = rowById.get(b.id);
      const wa = ra?.wins ?? 0;
      const wb = rb?.wins ?? 0;
      const pda = (ra?.pointsFor ?? 0) - (ra?.pointsAgainst ?? 0);
      const pdb = (rb?.pointsFor ?? 0) - (rb?.pointsAgainst ?? 0);
      return wb - wa || pdb - pda || b.teamRating - a.teamRating;
    });
  return seeded;
}

export function createPlayoffsState(teams: TeamState[], standings: DraftStandingRow[]): PlayoffsState {
  const seeded = seedTeamsByStandings(teams, standings);
  const q = computeQualifiedCount(seeded.length);
  const qualified = seeded.slice(0, q);
  const qualifiedTeamIds = qualified.map((t) => t.id);

  // Current league: 8 teams => q=4, so we do semis + finals.
  const games: PlayoffGame[] = [];
  if (q === 2) {
    games.push({
      id: `po-final-${qualifiedTeamIds[0]}-vs-${qualifiedTeamIds[1]}`,
      round: 'final',
      homeTeamId: qualifiedTeamIds[0],
      awayTeamId: qualifiedTeamIds[1],
    });
  } else if (q === 4) {
    games.push({
      id: `po-semi-1-${qualifiedTeamIds[0]}-vs-${qualifiedTeamIds[3]}`,
      round: 'semi',
      homeTeamId: qualifiedTeamIds[0],
      awayTeamId: qualifiedTeamIds[3],
    });
    games.push({
      id: `po-semi-2-${qualifiedTeamIds[1]}-vs-${qualifiedTeamIds[2]}`,
      round: 'semi',
      homeTeamId: qualifiedTeamIds[1],
      awayTeamId: qualifiedTeamIds[2],
    });
    // Finals will be created after semis resolve.
  } else {
    // Minimal support for larger leagues for now: still create top4 semis as a first step.
    const top4 = qualifiedTeamIds.slice(0, 4);
    games.push({
      id: `po-semi-1-${top4[0]}-vs-${top4[3]}`,
      round: 'semi',
      homeTeamId: top4[0],
      awayTeamId: top4[3],
    });
    games.push({
      id: `po-semi-2-${top4[1]}-vs-${top4[2]}`,
      round: 'semi',
      homeTeamId: top4[1],
      awayTeamId: top4[2],
    });
  }

  return { qualifiedTeamIds, games };
}

export function tryAdvancePlayoffs(playoffs: PlayoffsState): PlayoffsState {
  // If finals already done, determine champion.
  const finals = playoffs.games.filter((g) => g.round === 'final');
  const semis = playoffs.games.filter((g) => g.round === 'semi');

  // If no finals created yet, see if semis are complete.
  if (finals.length === 0 && semis.length >= 2 && semis.every((g) => g.result?.played && g.result.winnerTeamId)) {
    const w1 = semis[0].result!.winnerTeamId!;
    const w2 = semis[1].result!.winnerTeamId!;
    const final: PlayoffGame = {
      id: `po-final-${w1}-vs-${w2}`,
      round: 'final',
      homeTeamId: w1,
      awayTeamId: w2,
    };
    return { ...playoffs, games: [...playoffs.games, final] };
  }

  if (finals.length === 1 && finals[0].result?.played && finals[0].result.winnerTeamId) {
    return { ...playoffs, championTeamId: finals[0].result.winnerTeamId ?? undefined };
  }

  return playoffs;
}

