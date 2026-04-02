import type { SeasonGame } from './types';

export function buildRoundRobinWeeks(teamIds: string[], weeksTotal: number): SeasonGame[] {
  const n = teamIds.length;
  if (n % 2 !== 0) throw new Error('Schedule requires an even number of teams');

  const arr = [...teamIds];
  const half = n / 2;
  const games: SeasonGame[] = [];

  for (let weekIndex = 0; weekIndex < weeksTotal; weekIndex++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      // Alternate home/away to reduce systematic advantage.
      const homeTeamId = (weekIndex + i) % 2 === 0 ? a : b;
      const awayTeamId = homeTeamId === a ? b : a;
      games.push({
        id: `w${weekIndex + 1}-${homeTeamId}-vs-${awayTeamId}`,
        weekIndex,
        homeTeamId,
        awayTeamId,
      });
    }

    // Rotate all but first (circle method).
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    for (let i = 1; i < n; i++) arr[i] = rest[i - 1];
    arr[0] = fixed;
  }

  return games;
}

