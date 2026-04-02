import type { TeamPlayer, TeamState } from './types';
import { isStarOverall, overallToTenScale } from './ratings';
import { getCurrentSettings, getStaminaImpactMultiplier } from './settings';

export type RotationMode = 'tight' | 'balanced' | 'deep';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roleWeight(team: TeamState, player: TeamPlayer, slotIndex: 0 | 1) {
  if (slotIndex === 0) {
    return player.prospect.categories.playmaking * 0.42 + player.prospect.categories.shooting * 0.34 + overallToTenScale(player.prospect.overall) * 0.24;
  }
  return player.prospect.categories.defense * 0.44 + player.prospect.categories.speed * 0.24 + overallToTenScale(player.prospect.overall) * 0.32;
}

export function staminaPercent(player: TeamPlayer) {
  return clamp(Math.round(player.stamina ?? 100), 0, 100);
}

export function fatigueMultiplier(stamina: number) {
  const normalized = clamp(stamina, 0, 100) / 100;
  const impact = getCurrentSettings().staminaImpact;
  const softness = impact === 'low' ? 0.72 : impact === 'high' ? 1.22 : 1;
  if (normalized >= 0.8) return 1;
  let base = 1;
  if (normalized >= 0.65) base = 0.96 + (normalized - 0.65) * 0.2667;
  else if (normalized >= 0.45) base = 0.87 + (normalized - 0.45) * 0.45;
  else base = 0.72 + normalized * 0.3333;
  return clamp(1 - (1 - base) * softness, 0.62, 1);
}

export function fatigueLabel(stamina: number) {
  if (stamina >= 82) return 'Fresh';
  if (stamina >= 66) return 'Stable';
  if (stamina >= 48) return 'Tired';
  if (stamina >= 30) return 'Dragging';
  return 'Exhausted';
}

export function rotationThreshold(mode: RotationMode = 'balanced') {
  if (mode === 'deep') return 74;
  if (mode === 'tight') return 58;
  return 66;
}

export function decayStamina(
  player: TeamPlayer,
  current: number,
  params: { workload: number; intensity: number; onCourt: boolean },
) {
  if (!params.onCourt) return recoverBenchStamina(player, current);
  const starResistance = isStarOverall(player.prospect.overall) ? 0.9 : player.prospect.potential >= 8 ? 0.94 : 1;
  const base = (0.18 + params.workload * 0.24 + params.intensity * 0.18) * getStaminaImpactMultiplier();
  const workEthicResistance = 1 - (player.personality.workEthic - 5) * 0.038;
  const moraleResistance = 1 - ((player.morale ?? 50) - 50) * 0.0012;
  return clamp(current - base * starResistance * clamp(workEthicResistance * moraleResistance, 0.72, 1.14), 0, 100);
}

export function recoverBenchStamina(player: TeamPlayer, current: number) {
  const recovery =
    0.18 +
    player.prospect.potential * 0.01 +
    Math.max(0, 27 - player.prospect.age) * 0.01 +
    Math.max(0, player.personality.workEthic - 5) * 0.012 +
    Math.max(0, (player.morale ?? 50) - 50) * 0.002;
  return clamp(current + recovery, 0, 100);
}

export function recoverBetweenGames(player: TeamPlayer) {
  return {
    ...player,
    stamina: 100,
  };
}

export function getStarterIds(team: TeamState): [string, string] {
  const ids = new Set(team.roster.map((player) => player.id));
  const first = team.activePlayerIds[0] && ids.has(team.activePlayerIds[0]) ? team.activePlayerIds[0] : team.roster[0]?.id ?? '';
  const secondCandidate = team.activePlayerIds[1] && ids.has(team.activePlayerIds[1]) ? team.activePlayerIds[1] : '';
  const second = secondCandidate && secondCandidate !== first
    ? secondCandidate
    : team.roster.find((player) => player.id !== first)?.id ?? first;
  return [first, second];
}

export function getBenchPlayers(team: TeamState) {
  const starters = new Set(getStarterIds(team));
  return team.roster.filter((player) => !starters.has(player.id));
}

export function getDepthScore(team: TeamState) {
  const bench = getBenchPlayers(team);
  if (!bench.length) return team.roster.length ? overallToTenScale(team.roster[0].prospect.overall) * 0.6 : 0;
  return bench.reduce((sum, player) => sum + overallToTenScale(player.prospect.overall) * 0.7 + player.prospect.potential * 0.3, 0) / bench.length;
}

export function getRotationMetrics(team: TeamState) {
  const [starterAId, starterBId] = getStarterIds(team);
  const starters = team.roster.filter((player) => player.id === starterAId || player.id === starterBId);
  const bench = getBenchPlayers(team);
  const avg = (players: TeamPlayer[], fn: (player: TeamPlayer) => number, fallback = 0) =>
    players.length ? players.reduce((sum, player) => sum + fn(player), 0) / players.length : fallback;

  return {
    starterRating: avg(starters, (player) => overallToTenScale(player.prospect.overall), team.teamRating),
    benchRating: avg(bench, (player) => overallToTenScale(player.prospect.overall), starters[0] ? overallToTenScale(starters[0].prospect.overall) : team.teamRating),
    averageStamina: avg(team.roster, (player) => staminaPercent(player), 100),
    depthScore: getDepthScore(team),
  };
}

export function depthAwareTeamRating(team: TeamState) {
  if (!team.roster.length) return 5;
  const { starterRating, benchRating, depthScore } = getRotationMetrics(team);
  const rotationMultiplier = team.rotationMode === 'deep' ? 1.05 : team.rotationMode === 'tight' ? 0.97 : 1;
  const blended = starterRating * 0.62 + benchRating * 0.23 + depthScore * 0.15;
  return clamp(Math.round(blended * rotationMultiplier), 1, 10);
}

export function effectiveRating(player: TeamPlayer) {
  return overallToTenScale(player.prospect.overall) * fatigueMultiplier(staminaPercent(player));
}

export function chooseSubstitution(
  team: TeamState,
  staminaById: Record<string, number>,
  slotIndex: 0 | 1,
): string | null {
  const [starterAId, starterBId] = getStarterIds(team);
  const activeIds = [starterAId, starterBId];
  const currentId = activeIds[slotIndex];
  const currentPlayer = team.roster.find((player) => player.id === currentId);
  if (!currentPlayer) return null;

  const currentStamina = staminaById[currentId] ?? currentPlayer.stamina ?? 100;
  const threshold = rotationThreshold(team.rotationMode);
  const bench = team.roster.filter((player) => !activeIds.includes(player.id));
  if (!bench.length) return null;

  const currentScore = roleWeight(team, currentPlayer, slotIndex) * fatigueMultiplier(currentStamina);
  const candidate = bench
    .map((player) => {
      const stamina = staminaById[player.id] ?? player.stamina ?? 100;
      const score = roleWeight(team, player, slotIndex) * fatigueMultiplier(stamina) + stamina * 0.03;
      return { player, stamina, score };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!candidate) return null;
  if (currentStamina <= threshold && candidate.score >= currentScore * 0.92) return candidate.player.id;
  if (candidate.stamina - currentStamina >= 24 && candidate.score > currentScore * 0.96) return candidate.player.id;
  return null;
}
