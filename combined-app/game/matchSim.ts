import type { MatchResult } from './basketballEngine';
import { getPlayerGameplayModifiers, getTeamGameplayModifiers } from './personality';
import { overallToTenScale } from './ratings';
import { getCurrentSettings, getDifficultyTuning } from './settings';
import { chooseSubstitution, decayStamina, fatigueMultiplier, getDepthScore, getStarterIds, recoverBenchStamina } from './stamina';
import type { PlayerInGameStats, TeamPlayer, TeamState } from './types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function weightedPick<T>(items: T[], weight: (item: T) => number): T {
  const scored = items.map((item) => ({ item, weight: Math.max(0.001, weight(item)) }));
  const total = scored.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of scored) {
    roll -= item.weight;
    if (roll <= 0) return item.item;
  }
  return scored[scored.length - 1].item;
}

function ensurePlayerStats(team: TeamState, stats: Record<string, PlayerInGameStats>) {
  for (const player of team.roster) {
    stats[player.id] = stats[player.id] ?? { points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0 };
  }
}

function addLine(stats: Record<string, PlayerInGameStats>, playerId: string, patch: Partial<PlayerInGameStats>) {
  const current = stats[playerId] ?? { points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0 };
  stats[playerId] = {
    points: current.points + (patch.points ?? 0),
    assists: current.assists + (patch.assists ?? 0),
    rebounds: current.rebounds + (patch.rebounds ?? 0),
    steals: current.steals + (patch.steals ?? 0),
    blocks: current.blocks + (patch.blocks ?? 0),
  };
}

type TeamSimState = {
  team: TeamState;
  activeIds: [string, string];
  staminaById: Record<string, number>;
  substitutions: number;
};

function createTeamSimState(team: TeamState): TeamSimState {
  const staminaById = Object.fromEntries(team.roster.map((player) => [player.id, player.stamina ?? 100]));
  return {
    team,
    activeIds: getStarterIds(team),
    staminaById,
    substitutions: 0,
  };
}

function activePlayers(state: TeamSimState) {
  return state.activeIds
    .map((id) => state.team.roster.find((player) => player.id === id))
    .filter(Boolean) as TeamPlayer[];
}

function benchPlayers(state: TeamSimState) {
  return state.team.roster.filter((player) => !state.activeIds.includes(player.id));
}

function playerEffectiveness(player: TeamPlayer, stamina: number) {
  const fatigue = fatigueMultiplier(stamina);
  return {
    shooting: player.prospect.categories.shooting * fatigue,
    speed: player.prospect.categories.speed * fatigue,
    playmaking: player.prospect.categories.playmaking * fatigue,
    defense: player.prospect.categories.defense * fatigue,
    overall: overallToTenScale(player.prospect.overall) * fatigue,
    stamina,
  };
}

function teamProfile(state: TeamSimState) {
  const players = activePlayers(state);
  const bench = benchPlayers(state);
  const teamMods = getTeamGameplayModifiers(state.team);
  const avg = (fn: (player: TeamPlayer) => number, fallback = 5) =>
    players.length ? players.reduce((sum, player) => sum + fn(player), 0) / players.length : fallback;
  const benchScore = bench.length
    ? bench.reduce((sum, player) => sum + overallToTenScale(player.prospect.overall) * fatigueMultiplier(state.staminaById[player.id] ?? 100), 0) / bench.length
    : players[0] ? overallToTenScale(players[0].prospect.overall) : 5;

  return {
    players,
    bench,
    shooting: avg((player) => playerEffectiveness(player, state.staminaById[player.id] ?? 100).shooting) * (1 + teamMods.shootingBoost),
    speed: avg((player) => playerEffectiveness(player, state.staminaById[player.id] ?? 100).speed) * (1 + teamMods.reactionBoost * 0.6),
    playmaking: avg((player) => playerEffectiveness(player, state.staminaById[player.id] ?? 100).playmaking) * (1 + teamMods.passingBoost),
    defense: avg((player) => playerEffectiveness(player, state.staminaById[player.id] ?? 100).defense) * (1 + teamMods.reactionBoost),
    overall: avg((player) => playerEffectiveness(player, state.staminaById[player.id] ?? 100).overall),
    benchScore,
    depthScore: getDepthScore(state.team),
  };
}

function usageWeight(player: TeamPlayer, team: TeamState, stamina: number, context?: { isLateGame?: boolean; scoreMargin?: number }) {
  const fatigue = fatigueMultiplier(stamina);
  const mods = getPlayerGameplayModifiers(player, team, context);
  return (
    player.prospect.categories.playmaking * 0.45 +
    player.prospect.categories.shooting * 0.35 +
    player.prospect.categories.speed * 0.2
  ) * fatigue * (1 + mods.usageBias);
}

function finishWeight(player: TeamPlayer, team: TeamState, stamina: number, context?: { isLateGame?: boolean; scoreMargin?: number }) {
  const fatigue = fatigueMultiplier(stamina);
  const mods = getPlayerGameplayModifiers(player, team, context);
  return (
    player.prospect.categories.shooting * 0.52 +
    player.prospect.categories.speed * 0.25 +
    overallToTenScale(player.prospect.overall) * 0.23
  ) * fatigue * (1 + mods.shotBoost);
}

function defenseWeight(player: TeamPlayer, team: TeamState, stamina: number, context?: { isLateGame?: boolean; scoreMargin?: number }) {
  const fatigue = fatigueMultiplier(stamina);
  const mods = getPlayerGameplayModifiers(player, team, context);
  return (
    player.prospect.categories.defense * 0.66 +
    player.prospect.categories.speed * 0.24 +
    overallToTenScale(player.prospect.overall) * 0.1
  ) * fatigue * (1 + mods.reactionBoost + mods.stealBoost * 0.4);
}

function reboundWeight(player: TeamPlayer, team: TeamState, stamina: number, context?: { isLateGame?: boolean; scoreMargin?: number }) {
  const fatigue = fatigueMultiplier(stamina);
  const mods = getPlayerGameplayModifiers(player, team, context);
  return (player.prospect.categories.defense * 0.58 + player.prospect.categories.speed * 0.42 + player.prospect.height * 0.015) * fatigue * (1 + mods.reactionBoost * 0.55);
}

function maybeSubstitute(state: TeamSimState, lateGame: boolean) {
  if (!getCurrentSettings().autoSubstitutions) return false;
  let changed = false;
  for (const slotIndex of [0, 1] as const) {
    const replacementId = chooseSubstitution(state.team, state.staminaById, slotIndex);
    if (!replacementId) continue;
    if (lateGame && state.substitutions >= 6 && state.team.rotationMode === 'tight') continue;
    if (state.activeIds[slotIndex] === replacementId) continue;
    state.activeIds = slotIndex === 0 ? [replacementId, state.activeIds[1]] : [state.activeIds[0], replacementId];
    state.substitutions += 1;
    changed = true;
  }
  return changed;
}

function recoverBench(state: TeamSimState) {
  for (const player of benchPlayers(state)) {
    state.staminaById[player.id] = recoverBenchStamina(player, state.staminaById[player.id] ?? player.stamina ?? 100);
  }
}

function applyFatigue(state: TeamSimState, workloads: Array<{ playerId: string; workload: number }>, intensity: number) {
  const activeSet = new Set(state.activeIds);
  for (const player of state.team.roster) {
    const workload = workloads.find((entry) => entry.playerId === player.id)?.workload ?? 0.18;
    state.staminaById[player.id] = decayStamina(player, state.staminaById[player.id] ?? player.stamina ?? 100, {
      workload,
      intensity,
      onCourt: activeSet.has(player.id),
    });
  }
  recoverBench(state);
}

function simulatePossession(
  offense: TeamSimState,
  defense: TeamSimState,
  offenseStats: Record<string, PlayerInGameStats>,
  defenseStats: Record<string, PlayerInGameStats>,
  intensity: number,
  context?: { isLateGame?: boolean; scoreMargin?: number },
) {
  const offenseProfile = teamProfile(offense);
  const defenseProfile = teamProfile(defense);
  const offenseTeamMods = getTeamGameplayModifiers(offense.team);
  const defenseTeamMods = getTeamGameplayModifiers(defense.team);
  const creators = offenseProfile.players;
  const defenders = defenseProfile.players;
  if (!creators.length || !defenders.length) return 0;

  const creator = weightedPick(
    creators,
    (player) => usageWeight(player, offense.team, offense.staminaById[player.id] ?? 100, context) * (1 + player.prospect.potential / 40),
  );
  const secondary = creators.find((player) => player.id !== creator.id) ?? creator;
  const onBallDefender = weightedPick(
    defenders,
    (player) => defenseWeight(player, defense.team, defense.staminaById[player.id] ?? 100, context),
  );
  const helpDefender = defenders.find((player) => player.id !== onBallDefender.id) ?? onBallDefender;
  const creatorMods = getPlayerGameplayModifiers(creator, offense.team, context);
  const onBallMods = getPlayerGameplayModifiers(onBallDefender, defense.team, context);

  const turnoverChance = clamp(
    0.045 +
      (defenseWeight(onBallDefender, defense.team, defense.staminaById[onBallDefender.id] ?? 100, context) -
        usageWeight(creator, offense.team, offense.staminaById[creator.id] ?? 100, context)) *
        0.015 +
      (defenseProfile.defense - offenseProfile.playmaking) * 0.008 +
      onBallMods.stealBoost * 0.22 +
      onBallMods.gamblePenalty * 0.1 +
      defenseTeamMods.reactionBoost * 0.08 -
      creatorMods.passBias * 0.06 -
      offenseTeamMods.passingBoost * 0.08 +
      intensity * 0.025,
    0.03,
    0.20,
  );

  if (Math.random() < turnoverChance) {
    addLine(defenseStats, onBallDefender.id, { steals: 1 });
    applyFatigue(offense, [{ playerId: creator.id, workload: 0.68 }], intensity);
    applyFatigue(defense, [{ playerId: onBallDefender.id, workload: 0.54 }], intensity);
    return 0;
  }

  const passChance = clamp(
    0.26 +
      (offenseProfile.playmaking - defenseProfile.defense) * 0.025 +
      (finishWeight(secondary, offense.team, offense.staminaById[secondary.id] ?? 100, context) -
        finishWeight(creator, offense.team, offense.staminaById[creator.id] ?? 100, context)) *
        0.02 +
      creatorMods.passBias * 0.18 +
      offenseTeamMods.passingBoost * 0.22 -
      onBallMods.gamblePenalty * 0.08,
    0.14,
    0.68,
  );

  const finisher = Math.random() < passChance ? secondary : creator;
  const directDefender = finisher.id === creator.id ? onBallDefender : helpDefender;
  const supportDefender = finisher.id === creator.id ? helpDefender : onBallDefender;
  const finisherStamina = offense.staminaById[finisher.id] ?? 100;
  const defenderStamina = defense.staminaById[directDefender.id] ?? 100;
  const finisherMods = getPlayerGameplayModifiers(finisher, offense.team, context);
  const directDefenderMods = getPlayerGameplayModifiers(directDefender, defense.team, context);
  const supportDefenderMods = getPlayerGameplayModifiers(supportDefender, defense.team, context);

  const shotQuality = clamp(
    0.38 +
      (finishWeight(finisher, offense.team, finisherStamina, context) -
        defenseWeight(directDefender, defense.team, defenderStamina, context)) *
        0.03 +
      (offenseProfile.playmaking - defenseProfile.defense) * 0.01 +
      (offenseProfile.benchScore - defenseProfile.benchScore) * 0.008 -
      (100 - finisherStamina) * 0.0025 +
      finisherMods.shotBoost * 0.28 +
      offenseTeamMods.shootingBoost * 0.24 -
      directDefenderMods.reactionBoost * 0.18 +
      supportDefenderMods.gamblePenalty * 0.06 +
      intensity * 0.018,
    0.14,
    0.82,
  );

  const blockChance = clamp(
    0.035 +
      (defenseWeight(supportDefender, defense.team, defense.staminaById[supportDefender.id] ?? 100, context) -
        finishWeight(finisher, offense.team, finisherStamina, context)) *
        0.012 +
      supportDefenderMods.reactionBoost * 0.12 +
      intensity * 0.012,
    0.015,
    0.18,
  );

  const workloadsOffense = [
    { playerId: creator.id, workload: creator.id === finisher.id ? 0.82 : 0.56 },
    { playerId: secondary.id, workload: secondary.id === finisher.id ? 0.78 : 0.48 },
  ];
  const workloadsDefense = [
    { playerId: onBallDefender.id, workload: 0.64 },
    { playerId: helpDefender.id, workload: 0.58 },
  ];

  if (Math.random() < shotQuality) {
    addLine(offenseStats, finisher.id, { points: 2 });
    if (finisher.id !== creator.id && Math.random() < clamp(0.40 + creator.prospect.categories.playmaking * 0.04, 0.25, 0.86)) {
      addLine(offenseStats, creator.id, { assists: 1 });
    }
    applyFatigue(offense, workloadsOffense, intensity);
    applyFatigue(defense, workloadsDefense, intensity);
    return 2;
  }

  if (Math.random() < blockChance) {
    addLine(defenseStats, supportDefender.id, { blocks: 1 });
  }

  const offensiveReboundChance = clamp(
    0.21 +
      (reboundWeight(creator, offense.team, offense.staminaById[creator.id] ?? 100, context) +
        reboundWeight(secondary, offense.team, offense.staminaById[secondary.id] ?? 100, context) -
        reboundWeight(onBallDefender, defense.team, defense.staminaById[onBallDefender.id] ?? 100, context) -
        reboundWeight(helpDefender, defense.team, defense.staminaById[helpDefender.id] ?? 100, context)) *
        0.012 +
      (offenseProfile.depthScore - defenseProfile.depthScore) * 0.01,
    0.14,
    0.48,
  );

  if (Math.random() < offensiveReboundChance) {
    const rebounder = weightedPick(creators, (player) => reboundWeight(player, offense.team, offense.staminaById[player.id] ?? 100, context));
    addLine(offenseStats, rebounder.id, { rebounds: 1 });
    applyFatigue(offense, [...workloadsOffense, { playerId: rebounder.id, workload: 0.42 }], intensity);
    applyFatigue(defense, workloadsDefense, intensity);
    if (Math.random() < 0.36) {
      addLine(offenseStats, rebounder.id, { points: 2 });
      return 2;
    }
    return 0;
  }

  const rebounder = weightedPick(defenders, (player) => reboundWeight(player, defense.team, defense.staminaById[player.id] ?? 100, context));
  addLine(defenseStats, rebounder.id, { rebounds: 1 });
  applyFatigue(offense, workloadsOffense, intensity);
  applyFatigue(defense, [...workloadsDefense, { playerId: rebounder.id, workload: 0.38 }], intensity);
  return 0;
}

function normalizeScore(team: TeamSimState, opponent: TeamSimState, rawScore: number, possessions: number, pace: 'slow' | 'normal' | 'fast') {
  const profile = teamProfile(team);
  const opp = teamProfile(opponent);
  const teamMods = getTeamGameplayModifiers(team.team);
  const oppMods = getTeamGameplayModifiers(opponent.team);
  const expected = Math.round(
    possessions *
      clamp(
        0.92 +
          profile.shooting * 0.06 +
          profile.playmaking * 0.04 +
          profile.benchScore * 0.018 -
          opp.defense * 0.05 -
          oppMods.reactionBoost * 0.16 +
          teamMods.shootingBoost * 0.34 +
          teamMods.passingBoost * 0.18 +
          Math.max(0, 72 - (profile.players.reduce((sum, player) => sum + (team.staminaById[player.id] ?? 100), 0) / Math.max(1, profile.players.length))) * 0.006 +
          (pace === 'fast' ? 0.1 : pace === 'slow' ? -0.05 : 0),
        0.72,
        1.42,
      ),
  );
  return clamp(Math.round(rawScore * 0.65 + expected * 0.35), 8, 40);
}

function distributeScoreAdjustment(team: TeamSimState, stats: Record<string, PlayerInGameStats>, diff: number) {
  if (!diff) return;
  const scorers = [...team.team.roster].sort(
    (a, b) =>
      finishWeight(b, team.team, team.staminaById[b.id] ?? 100) - finishWeight(a, team.team, team.staminaById[a.id] ?? 100),
  );

  if (diff > 0) {
    let remaining = diff;
    while (remaining > 0) {
      const scorer = weightedPick(scorers, (player) => finishWeight(player, team.team, team.staminaById[player.id] ?? 100));
      addLine(stats, scorer.id, { points: 2 });
      remaining -= 2;
    }
    return;
  }

  let remaining = Math.abs(diff);
  while (remaining > 0) {
    const scorer = scorers.find((player) => (stats[player.id]?.points ?? 0) >= 2);
    if (!scorer) break;
    addLine(stats, scorer.id, { points: -2 });
    remaining -= 2;
  }
}

export type SimBoxScoreLine = {
  playerId: string;
  playerName: string;
  teamId: string;
  pts: number;
  ast: number;
  reb: number;
  stl: number;
  blk: number;
};

export type SimulatedMatch = MatchResult & {
  boxScore: {
    homeTeamId: string;
    awayTeamId: string;
    homeLines: SimBoxScoreLine[];
    awayLines: SimBoxScoreLine[];
  };
};

export function simulateMatch(
  teamA: TeamState,
  teamB: TeamState,
  opts?: { dtMs?: number; maxSteps?: number; pace?: 'slow' | 'normal' | 'fast'; userTeamId?: string },
): SimulatedMatch {
  const pace = opts?.pace ?? getCurrentSettings().gameSpeed;
  const possessionsPerTeam =
    pace === 'fast'
      ? Math.round(randBetween(18, 24))
      : pace === 'slow'
        ? Math.round(randBetween(12, 17))
        : Math.round(randBetween(15, 20));

  const stateA = createTeamSimState(teamA);
  const stateB = createTeamSimState(teamB);
  const playerStatsByEntityId: Record<string, PlayerInGameStats> = {};
  ensurePlayerStats(teamA, playerStatsByEntityId);
  ensurePlayerStats(teamB, playerStatsByEntityId);

  let scoreA = 0;
  let scoreB = 0;

  for (let possession = 0; possession < possessionsPerTeam; possession += 1) {
    const possessionStage = possession / Math.max(1, possessionsPerTeam - 1);
    const closeGame = Math.abs(scoreA - scoreB) <= 4 ? 0.12 : 0;
    const lateGame = possessionStage >= 0.66;
    const intensity =
      (pace === 'fast' ? 0.24 : pace === 'slow' ? -0.04 : 0.08) +
      (lateGame ? 0.18 : 0) +
      closeGame;

    maybeSubstitute(stateA, lateGame);
    maybeSubstitute(stateB, lateGame);

    scoreA += simulatePossession(stateA, stateB, playerStatsByEntityId, playerStatsByEntityId, intensity, {
      isLateGame: lateGame,
      scoreMargin: Math.abs(scoreA - scoreB),
    });
    scoreB += simulatePossession(stateB, stateA, playerStatsByEntityId, playerStatsByEntityId, intensity, {
      isLateGame: lateGame,
      scoreMargin: Math.abs(scoreA - scoreB),
    });
  }

  let normalizedA = normalizeScore(stateA, stateB, scoreA, possessionsPerTeam, pace);
  let normalizedB = normalizeScore(stateB, stateA, scoreB, possessionsPerTeam, pace);
  const difficulty = getDifficultyTuning();
  if (opts?.userTeamId === teamA.id) normalizedA += difficulty.userSimScoreBoost;
  if (opts?.userTeamId === teamB.id) normalizedB += difficulty.userSimScoreBoost;
  if (opts?.userTeamId === teamA.id) normalizedB += difficulty.aiSimScoreBoost;
  if (opts?.userTeamId === teamB.id) normalizedA += difficulty.aiSimScoreBoost;
  normalizedA = clamp(normalizedA, 38, 142);
  normalizedB = clamp(normalizedB, 38, 142);
  distributeScoreAdjustment(stateA, playerStatsByEntityId, normalizedA - scoreA);
  distributeScoreAdjustment(stateB, playerStatsByEntityId, normalizedB - scoreB);

  const result: MatchResult = {
    status: 'ended',
    winner: normalizedA === normalizedB ? 'draw' : normalizedA > normalizedB ? 'user' : 'ai',
    finalScore: { user: normalizedA, ai: normalizedB },
    playerStatsByEntityId,
  };

  return finalizeBoxScore(teamA, teamB, result);
}

function finalizeBoxScore(teamA: TeamState, teamB: TeamState, res: MatchResult): SimulatedMatch {
  const nameById: Record<string, { name: string; teamId: string }> = {};
  for (const player of teamA.roster) nameById[player.id] = { name: player.prospect.name, teamId: teamA.id };
  for (const player of teamB.roster) nameById[player.id] = { name: player.prospect.name, teamId: teamB.id };

  const homeLines: SimBoxScoreLine[] = [];
  const awayLines: SimBoxScoreLine[] = [];
  for (const [playerId, stats] of Object.entries(res.playerStatsByEntityId)) {
    const meta = nameById[playerId];
    if (!meta) continue;
    const line: SimBoxScoreLine = {
      playerId,
      playerName: meta.name,
      teamId: meta.teamId,
      pts: stats.points ?? 0,
      ast: stats.assists ?? 0,
      reb: stats.rebounds ?? 0,
      stl: stats.steals ?? 0,
      blk: stats.blocks ?? 0,
    };
    if (meta.teamId === teamA.id) homeLines.push(line);
    if (meta.teamId === teamB.id) awayLines.push(line);
  }

  const sortLines = (a: SimBoxScoreLine, b: SimBoxScoreLine) => b.pts - a.pts || b.ast - a.ast || b.reb - a.reb || b.stl - a.stl;
  homeLines.sort(sortLines);
  awayLines.sort(sortLines);

  return {
    ...res,
    boxScore: {
      homeTeamId: teamA.id,
      awayTeamId: teamB.id,
      homeLines,
      awayLines,
    },
  };
}
