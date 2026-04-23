import { PLAYOFF_SERIES_BEST_OF } from './schedule';
import type {
  DraftStandingRow,
  PlayoffGame,
  PlayoffSeries,
  PlayoffsState,
  PlayoffSeriesRound,
  TeamState,
} from './types';

const AUTO_BERTH_COUNT = 6;
const PLAY_IN_SEED_COUNT = 10;
const PLAYOFF_FIELD_SIZE = 8;

function winsNeeded(seriesBestOf: number) {
  return Math.max(2, Math.ceil(seriesBestOf / 2));
}

function higherSeedHosts(seriesBestOf: number, gameNumber: number) {
  if (seriesBestOf <= 3) return gameNumber === 1 || gameNumber === 3;
  if (seriesBestOf <= 5) return gameNumber === 1 || gameNumber === 2 || gameNumber === 5;
  return gameNumber === 1 || gameNumber === 2 || gameNumber === 5 || gameNumber === 7;
}

function seedLookup(teamIds: string[]) {
  return new Map(teamIds.map((teamId, index) => [teamId, index + 1]));
}

export function seedTeamsByStandings(teams: TeamState[], standings: DraftStandingRow[]) {
  const rowById = new Map(standings.map((row) => [row.teamId, row]));
  return teams
    .slice()
    .sort((a, b) => {
      const rowA = rowById.get(a.id);
      const rowB = rowById.get(b.id);
      const pdA = (rowA?.pointsFor ?? 0) - (rowA?.pointsAgainst ?? 0);
      const pdB = (rowB?.pointsFor ?? 0) - (rowB?.pointsAgainst ?? 0);
      return (rowB?.wins ?? 0) - (rowA?.wins ?? 0) || pdB - pdA || b.teamRating - a.teamRating;
    });
}

function makeGame(params: {
  id: string;
  round: PlayoffGame['round'];
  label: string;
  homeTeamId: string;
  awayTeamId: string;
  homeSeed?: number;
  awaySeed?: number;
  seriesId?: string;
  gameNumber?: number;
  eliminationGame?: boolean;
}): PlayoffGame {
  return { ...params };
}

function scheduleNextSeriesGame(playoffs: PlayoffsState, series: PlayoffSeries): PlayoffsState {
  if (series.winnerTeamId) return playoffs;

  const nextGameNumber = series.gameIds.length + 1;
  const highSeedHome = higherSeedHosts(playoffs.seriesBestOf, nextGameNumber);
  const higherSeedTeamId = series.seedA < series.seedB ? series.teamAId : series.teamBId;
  const lowerSeedTeamId = higherSeedTeamId === series.teamAId ? series.teamBId : series.teamAId;
  const higherSeed = Math.min(series.seedA, series.seedB);
  const lowerSeed = Math.max(series.seedA, series.seedB);
  const homeTeamId = highSeedHome ? higherSeedTeamId : lowerSeedTeamId;
  const awayTeamId = homeTeamId === higherSeedTeamId ? lowerSeedTeamId : higherSeedTeamId;
  const homeSeed = homeTeamId === series.teamAId ? series.seedA : series.seedB;
  const awaySeed = awayTeamId === series.teamAId ? series.seedA : series.seedB;
  const gameId = `${series.id}-g${nextGameNumber}`;
  const game = makeGame({
    id: gameId,
    round: series.round,
    label: `${series.label} - Game ${nextGameNumber}`,
    homeTeamId,
    awayTeamId,
    homeSeed,
    awaySeed,
    seriesId: series.id,
    gameNumber: nextGameNumber,
  });

  return {
    ...playoffs,
    games: [...playoffs.games, game],
    series: playoffs.series.map((entry) =>
      entry.id === series.id ? { ...entry, gameIds: [...entry.gameIds, gameId] } : entry,
    ),
  };
}

function createSeries(
  id: string,
  round: PlayoffSeriesRound,
  label: string,
  teamAId: string,
  teamBId: string,
  seedA: number,
  seedB: number,
  seriesBestOf: number,
): PlayoffSeries {
  return {
    id,
    round,
    label,
    teamAId,
    teamBId,
    seedA,
    seedB,
    winsA: 0,
    winsB: 0,
    winsNeeded: winsNeeded(seriesBestOf),
    gameIds: [],
  };
}

function createBracketSeries(playoffs: PlayoffsState): PlayoffsState {
  if (playoffs.series.length > 0 || playoffs.qualifiedTeamIds.length < PLAYOFF_FIELD_SIZE) return playoffs;
  const qualified = playoffs.qualifiedTeamIds;
  const series: PlayoffSeries[] = [
    createSeries('quarter-1', 'quarter', 'Quarterfinal 1', qualified[0], qualified[7], 1, 8, playoffs.seriesBestOf),
    createSeries('quarter-2', 'quarter', 'Quarterfinal 2', qualified[3], qualified[4], 4, 5, playoffs.seriesBestOf),
    createSeries('quarter-3', 'quarter', 'Quarterfinal 3', qualified[1], qualified[6], 2, 7, playoffs.seriesBestOf),
    createSeries('quarter-4', 'quarter', 'Quarterfinal 4', qualified[2], qualified[5], 3, 6, playoffs.seriesBestOf),
  ];

  let nextState: PlayoffsState = {
    ...playoffs,
    stage: 'bracket',
    series,
  };
  for (const entry of series) {
    nextState = scheduleNextSeriesGame(nextState, entry);
  }
  return nextState;
}

function maybeCreateEightSeedGame(playoffs: PlayoffsState): PlayoffsState {
  const sevenEight = playoffs.games.find((game) => game.id === 'playin-7v8');
  const nineTen = playoffs.games.find((game) => game.id === 'playin-9v10');
  const existing = playoffs.games.find((game) => game.id === 'playin-8seed');
  if (!sevenEight?.result?.winnerTeamId || !nineTen?.result?.winnerTeamId || existing) return playoffs;

  const loserSevenEight = sevenEight.result.winnerTeamId === sevenEight.homeTeamId ? sevenEight.awayTeamId : sevenEight.homeTeamId;
  const loserSeed = sevenEight.result.winnerTeamId === sevenEight.homeTeamId ? sevenEight.awaySeed : sevenEight.homeSeed;
  const winnerNineTen = nineTen.result.winnerTeamId;
  const winnerSeed = winnerNineTen === nineTen.homeTeamId ? nineTen.homeSeed : nineTen.awaySeed;

  return {
    ...playoffs,
    games: [
      ...playoffs.games,
      makeGame({
        id: 'playin-8seed',
        round: 'playIn',
        label: 'Play-In - For the 8 Seed',
        homeTeamId: loserSevenEight,
        awayTeamId: winnerNineTen,
        homeSeed: loserSeed,
        awaySeed: winnerSeed,
        eliminationGame: true,
      }),
    ],
  };
}

function maybeFinalizePlayIn(playoffs: PlayoffsState): PlayoffsState {
  const sevenEight = playoffs.games.find((game) => game.id === 'playin-7v8');
  const eightSeedGame = playoffs.games.find((game) => game.id === 'playin-8seed');
  if (!sevenEight?.result?.winnerTeamId || !eightSeedGame?.result?.winnerTeamId) return playoffs;

  const autoQualified = playoffs.seededTeamIds.slice(0, AUTO_BERTH_COUNT);
  const qualifiedTeamIds = [
    ...autoQualified,
    sevenEight.result.winnerTeamId,
    eightSeedGame.result.winnerTeamId,
  ];

  return createBracketSeries({
    ...playoffs,
    qualifiedTeamIds,
  });
}

function maybeAdvanceSeriesRound(playoffs: PlayoffsState): PlayoffsState {
  const roundGroups: PlayoffSeriesRound[] = ['quarter', 'semi', 'final'];
  for (const round of roundGroups) {
    const roundSeries = playoffs.series.filter((series) => series.round === round);
    if (!roundSeries.length || roundSeries.some((series) => !series.winnerTeamId)) continue;

    if (round === 'quarter' && !playoffs.series.some((series) => series.round === 'semi')) {
      const winnerById = new Map(roundSeries.map((series) => [series.id, series.winnerTeamId!]));
      const seedById = seedLookup(playoffs.qualifiedTeamIds);
      const semiSeries = [
        createSeries(
          'semi-1',
          'semi',
          'Semifinal 1',
          winnerById.get('quarter-1')!,
          winnerById.get('quarter-2')!,
          seedById.get(winnerById.get('quarter-1')!) ?? 1,
          seedById.get(winnerById.get('quarter-2')!) ?? 4,
          playoffs.seriesBestOf,
        ),
        createSeries(
          'semi-2',
          'semi',
          'Semifinal 2',
          winnerById.get('quarter-3')!,
          winnerById.get('quarter-4')!,
          seedById.get(winnerById.get('quarter-3')!) ?? 2,
          seedById.get(winnerById.get('quarter-4')!) ?? 3,
          playoffs.seriesBestOf,
        ),
      ];
      let nextState: PlayoffsState = { ...playoffs, series: [...playoffs.series, ...semiSeries] };
      for (const series of semiSeries) nextState = scheduleNextSeriesGame(nextState, series);
      return nextState;
    }

    if (round === 'semi' && !playoffs.series.some((series) => series.round === 'final')) {
      const winners = roundSeries.map((series) => series.winnerTeamId!).sort((a, b) => {
        const seedMap = seedLookup(playoffs.qualifiedTeamIds);
        return (seedMap.get(a) ?? 99) - (seedMap.get(b) ?? 99);
      });
      const seedMap = seedLookup(playoffs.qualifiedTeamIds);
      const finalSeries = createSeries(
        'final-1',
        'final',
        'League Finals',
        winners[0],
        winners[1],
        seedMap.get(winners[0]) ?? 1,
        seedMap.get(winners[1]) ?? 2,
        playoffs.seriesBestOf,
      );
      let nextState: PlayoffsState = { ...playoffs, series: [...playoffs.series, finalSeries] };
      nextState = scheduleNextSeriesGame(nextState, finalSeries);
      return nextState;
    }

    if (round === 'final') {
      const finals = roundSeries[0];
      if (finals?.winnerTeamId) {
        return {
          ...playoffs,
          stage: 'complete',
          championTeamId: finals.winnerTeamId,
          runnerUpTeamId: finals.loserTeamId,
        };
      }
    }
  }

  return playoffs;
}

export function createPlayoffsState(
  teams: TeamState[],
  standings: DraftStandingRow[],
  seriesBestOf = PLAYOFF_SERIES_BEST_OF,
): PlayoffsState {
  const seeded = seedTeamsByStandings(teams, standings).slice(0, PLAY_IN_SEED_COUNT);
  const seededTeamIds = seeded.map((team) => team.id);
  const firstGames: PlayoffGame[] = [];

  if (seededTeamIds.length >= 8) {
    firstGames.push(
      makeGame({
        id: 'playin-7v8',
        round: 'playIn',
        label: 'Play-In - 7 vs 8',
        homeTeamId: seededTeamIds[6],
        awayTeamId: seededTeamIds[7],
        homeSeed: 7,
        awaySeed: 8,
      }),
    );
  }
  if (seededTeamIds.length >= 10) {
    firstGames.push(
      makeGame({
        id: 'playin-9v10',
        round: 'playIn',
        label: 'Play-In - 9 vs 10',
        homeTeamId: seededTeamIds[8],
        awayTeamId: seededTeamIds[9],
        homeSeed: 9,
        awaySeed: 10,
        eliminationGame: true,
      }),
    );
  }

  return {
    stage: firstGames.length ? 'playIn' : 'bracket',
    seriesBestOf,
    seededTeamIds,
    qualifiedTeamIds: firstGames.length ? seededTeamIds.slice(0, AUTO_BERTH_COUNT) : seededTeamIds.slice(0, PLAYOFF_FIELD_SIZE),
    games: firstGames,
    series: [],
  };
}

export function getCurrentPlayoffGames(playoffs: PlayoffsState) {
  return playoffs.games.filter((game) => !game.result?.played);
}

export function applyPlayoffGameResult(
  playoffs: PlayoffsState,
  gameId: string,
  score: { home: number; away: number },
  winnerTeamId: string,
): PlayoffsState {
  let nextState: PlayoffsState = {
    ...playoffs,
    games: playoffs.games.map((game) =>
      game.id === gameId
        ? {
            ...game,
            result: {
              played: true,
              score,
              winnerTeamId,
            },
          }
        : game,
    ),
  };

  const completedGame = nextState.games.find((game) => game.id === gameId);
  if (!completedGame) return nextState;

  if (completedGame.seriesId) {
    nextState = {
      ...nextState,
      series: nextState.series.map((series) => {
        if (series.id !== completedGame.seriesId) return series;
        const winnerIsA = winnerTeamId === series.teamAId;
        const nextSeries = {
          ...series,
          winsA: series.winsA + (winnerIsA ? 1 : 0),
          winsB: series.winsB + (winnerIsA ? 0 : 1),
        };
        if (nextSeries.winsA >= nextSeries.winsNeeded || nextSeries.winsB >= nextSeries.winsNeeded) {
          return {
            ...nextSeries,
            winnerTeamId: nextSeries.winsA >= nextSeries.winsNeeded ? nextSeries.teamAId : nextSeries.teamBId,
            loserTeamId: nextSeries.winsA >= nextSeries.winsNeeded ? nextSeries.teamBId : nextSeries.teamAId,
          };
        }
        return nextSeries;
      }),
    };

    const updatedSeries = nextState.series.find((series) => series.id === completedGame.seriesId);
    if (updatedSeries && !updatedSeries.winnerTeamId) {
      nextState = scheduleNextSeriesGame(nextState, updatedSeries);
    }
    return maybeAdvanceSeriesRound(nextState);
  }

  nextState = maybeCreateEightSeedGame(nextState);
  nextState = maybeFinalizePlayIn(nextState);
  return nextState;
}

export function tryAdvancePlayoffs(playoffs: PlayoffsState): PlayoffsState {
  if (playoffs.stage === 'playIn') {
    return maybeFinalizePlayIn(maybeCreateEightSeedGame(playoffs));
  }
  return maybeAdvanceSeriesRound(playoffs);
}
