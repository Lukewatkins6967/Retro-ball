import type { DraftStandingRow, TeamState } from './types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type LotteryReveal = {
  lotteryOrderTeamIds: string[]; // pick 1 -> pick N (N = number of teams)
  oddsByTeamId: Record<string, number>; // normalized probability snapshot (pick #1 odds)
  top3TeamIds: string[];
};

function getStandingsForTeam(standings: DraftStandingRow[], teamId: string) {
  return standings.find((s) => s.teamId === teamId);
}

export function computeLotteryWeightsFromStandings(standings: DraftStandingRow[], teams: TeamState[]) {
  // Worse teams = higher chance at top picks.
  // Weight is based mostly on losses, with small PD penalty to break ties.
  const weights: Record<string, number> = {};
  for (const t of teams) {
    const row = getStandingsForTeam(standings, t.id);
    const losses = row?.losses ?? 10;
    const pointsAgainst = row?.pointsAgainst ?? 90;
    const pointsFor = row?.pointsFor ?? 85;
    const pd = pointsFor - pointsAgainst; // negative = worse

    // Base loss contribution (dominant).
    const lossPart = losses * 1.2;

    // PD: worse (more negative) -> bigger weight.
    const pdPart = clamp((-pd) / 8, 0, 10);

    // Add a tiny potential-based tie to make outcomes feel grounded.
    const potentialPart = t.roster.length
      ? t.roster.reduce((s, p) => s + p.prospect.potential, 0) / t.roster.length
      : 5;
    const potentialBias = clamp(10 - potentialPart, 0, 9) * 0.35;

    weights[t.id] = Math.max(0.3, lossPart + pdPart + potentialBias);
  }

  return weights;
}

export function weightedPermutationByWeights(teamIds: string[], weights: Record<string, number>) {
  const remaining = [...teamIds];
  const order: string[] = [];

  while (remaining.length) {
    const total = remaining.reduce((s, id) => s + (weights[id] ?? 1), 0);
    let r = Math.random() * Math.max(0.0001, total);
    for (let i = 0; i < remaining.length; i++) {
      const id = remaining[i];
      r -= weights[id] ?? 1;
      if (r <= 0) {
        order.push(id);
        remaining.splice(i, 1);
        break;
      }
    }
  }

  return order;
}

export function generateDraftLotteryReveal(standings: DraftStandingRow[], teams: TeamState[], top3Count = 3): LotteryReveal {
  const teamIds = teams.map((t) => t.id);
  const weights = computeLotteryWeightsFromStandings(standings, teams);

  // Odds snapshot for pick #1.
  const sum = teamIds.reduce((s, id) => s + (weights[id] ?? 1), 0);
  const oddsByTeamId: Record<string, number> = {};
  for (const id of teamIds) {
    oddsByTeamId[id] = (weights[id] ?? 1) / Math.max(0.0001, sum);
  }

  const lotteryOrderTeamIds = weightedPermutationByWeights(teamIds, weights);
  const top3TeamIds = lotteryOrderTeamIds.slice(0, Math.min(top3Count, lotteryOrderTeamIds.length));

  return { lotteryOrderTeamIds, oddsByTeamId, top3TeamIds };
}

