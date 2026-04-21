import type { MatchResult } from './basketballEngine';
import { getPlayerGameplayModifiers, getTeamGameplayModifiers } from './personality';
import { overallToTenScale } from './ratings';
import { getCurrentSettings } from './settings';
import { chooseSubstitution, decayStamina, fatigueMultiplier, getDepthScore, getStarterIds, recoverBenchStamina } from './stamina';
import type { PlayerInGameStats, TeamPlayer, TeamState } from './types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seeded01(seed: string) {
  return hashSeed(seed) / 4294967295;
}

function seededCentered(seed: string) {
  return seeded01(seed) * 2 - 1;
}

function deterministicWeightedPick<T>(items: T[], weight: (item: T) => number, seed: string): T {
  const scored = items.map((item) => ({ item, weight: Math.max(0.001, weight(item)) }));
  const total = scored.reduce((sum, item) => sum + item.weight, 0);
  let roll = seeded01(seed) * total;
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

type SimPlayerProfile = {
  player: TeamPlayer;
  stamina: number;
  overall: number;
  athleticism: number;
  size: number;
  shooting: number;
  speed: number;
  playmaking: number;
  perimeterDefense: number;
  interiorDefense: number;
  finishing: number;
  dunk: number;
  rebounding: number;
  usage: number;
  threeTendency: number;
};

type TeamProfile = {
  players: TeamPlayer[];
  shooting: number;
  speed: number;
  playmaking: number;
  perimeterDefense: number;
  interiorDefense: number;
  rebounding: number;
  depthScore: number;
};

type ContestProfile = {
  distance: number;
  positioning: 'front' | 'side' | 'behind';
  strength: number;
};

type ShotType = 'dunk' | 'layup' | 'mid' | 'three';

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

function playerSizeScore(player: TeamPlayer) {
  const heightScore = clamp(4.5 + (player.prospect.height - 74) * 0.33, 1, 10);
  const wingspanScore = clamp(4.7 + (player.prospect.wingspan - player.prospect.height) * 0.24, 1, 10);
  const frameScore = clamp(4.6 + (player.prospect.weight - 205) * 0.03, 1, 10);
  return clamp(heightScore * 0.44 + wingspanScore * 0.32 + frameScore * 0.24, 1, 10);
}

function roleThreeTendency(player: TeamPlayer) {
  const position = player.prospect.position.toLowerCase();
  if (position.includes('point')) return 0.28;
  if (position.includes('shooting')) return 0.32;
  if (position.includes('small')) return 0.24;
  if (position.includes('power')) return 0.16;
  if (position.includes('center')) return 0.1;
  return 0.2;
}

function buildPlayerProfile(
  player: TeamPlayer,
  team: TeamState,
  stamina: number,
  context?: { isLateGame?: boolean; scoreMargin?: number },
): SimPlayerProfile {
  const fatigue = fatigueMultiplier(stamina);
  const mods = getPlayerGameplayModifiers(player, team, context);
  const teamMods = getTeamGameplayModifiers(team);
  const overall = overallToTenScale(player.prospect.overall);
  const athleticism = clamp(player.prospect.athleticism, 1, 10);
  const size = playerSizeScore(player);
  const shooting = clamp((player.prospect.categories.shooting * 0.76 + overall * 0.16 + athleticism * 0.08) * fatigue * (1 + mods.shotBoost + teamMods.shootingBoost * 0.35), 1, 10);
  const speed = clamp((player.prospect.categories.speed * 0.7 + athleticism * 0.22 + overall * 0.08) * fatigue * (1 + mods.reactionBoost * 0.65), 1, 10);
  const playmaking = clamp((player.prospect.categories.playmaking * 0.72 + overall * 0.18 + athleticism * 0.1) * fatigue * (1 + mods.passBias * 0.45 + teamMods.passingBoost * 0.28), 1, 10);
  const perimeterDefense = clamp((player.prospect.categories.defense * 0.6 + player.prospect.categories.speed * 0.24 + athleticism * 0.16) * fatigue * (1 + mods.reactionBoost * 0.85), 1, 10);
  const interiorDefense = clamp((player.prospect.categories.defense * 0.62 + size * 0.26 + athleticism * 0.12) * fatigue * (1 + mods.reactionBoost * 0.55), 1, 10);
  const finishing = clamp((shooting * 0.34 + speed * 0.2 + size * 0.18 + athleticism * 0.18 + overall * 0.1), 1, 10);
  const dunk = clamp((athleticism * 0.38 + size * 0.24 + speed * 0.14 + overall * 0.14 + player.prospect.categories.shooting * 0.1) * fatigue, 1, 10);
  const rebounding = clamp((player.prospect.categories.defense * 0.38 + size * 0.32 + athleticism * 0.18 + player.prospect.categories.speed * 0.12) * fatigue, 1, 10);
  const usage = clamp(playmaking * 0.42 + shooting * 0.34 + overall * 0.24 + mods.usageBias * 1.2, 1, 10);
  const threeTendency = clamp(roleThreeTendency(player) + (player.prospect.categories.shooting - 5) * 0.02 + mods.shotBoost * 0.04, 0.08, 0.42);

  return {
    player,
    stamina,
    overall,
    athleticism,
    size,
    shooting,
    speed,
    playmaking,
    perimeterDefense,
    interiorDefense,
    finishing,
    dunk,
    rebounding,
    usage,
    threeTendency,
  };
}

function teamProfile(state: TeamSimState, context?: { isLateGame?: boolean; scoreMargin?: number }): TeamProfile {
  const players = activePlayers(state);
  const pool = players.length ? players : state.team.roster.slice(0, 2);
  const profiles = pool.map((player) => buildPlayerProfile(player, state.team, state.staminaById[player.id] ?? 100, context));
  const average = (pick: (profile: SimPlayerProfile) => number, fallback = 5) =>
    profiles.length ? profiles.reduce((sum, profile) => sum + pick(profile), 0) / profiles.length : fallback;

  return {
    players: pool,
    shooting: average((profile) => profile.shooting),
    speed: average((profile) => profile.speed),
    playmaking: average((profile) => profile.playmaking),
    perimeterDefense: average((profile) => profile.perimeterDefense),
    interiorDefense: average((profile) => profile.interiorDefense),
    rebounding: average((profile) => profile.rebounding),
    depthScore: getDepthScore(state.team),
  };
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

function computeContest(
  shotType: ShotType,
  shooter: SimPlayerProfile,
  perimeterDefender: SimPlayerProfile,
  rimDefender: SimPlayerProfile,
  wasPass: boolean,
  seed: string,
): ContestProfile {
  if (shotType === 'three' || shotType === 'mid') {
    const closeoutGap = perimeterDefender.perimeterDefense - (shooter.playmaking * 0.55 + shooter.speed * 0.45) + seededCentered(`${seed}:closeout`) * 1.2;
    const distance = clamp(
      (shotType === 'three' ? 0.32 : 0.24) +
        clamp(-closeoutGap / 18, -0.12, 0.44) -
        (wasPass ? 0.1 : 0) +
        seededCentered(`${seed}:distance`) * 0.06,
      0.06,
      1.05,
    );
    const positioning = closeoutGap >= 1.35 ? 'front' : closeoutGap >= -0.35 ? 'side' : 'behind';
    const positioningMultiplier = positioning === 'front' ? 1 : positioning === 'side' ? 0.7 : 0.38;
    return {
      distance,
      positioning,
      strength: clamp((perimeterDefender.perimeterDefense / 10) * (1 - distance * 0.72) * positioningMultiplier, 0, 0.95),
    };
  }

  const rimGap = rimDefender.interiorDefense - (shooter.finishing * 0.62 + shooter.speed * 0.22) + seededCentered(`${seed}:rim`) * 1.1;
  const distance = clamp(
    0.14 +
      clamp(rimGap / 20, -0.08, 0.42) +
      seededCentered(`${seed}:rim-distance`) * 0.05,
    0.05,
    1,
  );
  const positioning = rimGap >= 1.4 ? 'front' : rimGap >= -0.2 ? 'side' : 'behind';
  const positioningMultiplier = positioning === 'front' ? 1 : positioning === 'side' ? 0.68 : 0.34;
  return {
    distance,
    positioning,
    strength: clamp((rimDefender.interiorDefense / 10) * (1 - distance * 0.64) * positioningMultiplier, 0, 0.98),
  };
}

function resolveShotChance(
  shotType: ShotType,
  shooter: SimPlayerProfile,
  contest: ContestProfile,
  perimeterDefender: SimPlayerProfile,
  rimDefender: SimPlayerProfile,
  seed: string,
) {
  const fatiguePenalty = clamp((82 - shooter.stamina) / 120, 0, 0.18);
  if (shotType === 'dunk') {
    const awkwardPenalty = Math.max(0, seeded01(`${seed}:awkward`) - 0.82) * 0.16;
    const lowDunkPenalty = clamp((6.2 - shooter.dunk) * 0.05, 0, 0.26);
    const strongContest = contest.strength > 0.42 || contest.positioning === 'front';
    const openChance = clamp(0.997 - fatiguePenalty - lowDunkPenalty - awkwardPenalty, 0.98, 0.999);
    const contestedChance = clamp(0.84 + (shooter.dunk / 10) * 0.14 - contest.strength * 0.46 - lowDunkPenalty - fatiguePenalty, 0.5, 0.97);
    const blockChance = clamp(0.02 + rimDefender.interiorDefense * 0.015 + (strongContest ? 0.06 : 0) - shooter.dunk * 0.008, 0.01, 0.28);
    return { hitChance: strongContest ? contestedChance : openChance, blockChance };
  }

  const baseChance = shotType === 'layup' ? 0.56 : shotType === 'mid' ? 0.43 : 0.35;
  const shotSkill = shotType === 'layup' ? shooter.finishing : shooter.shooting;
  const defenderImpact = shotType === 'layup' ? rimDefender.interiorDefense : perimeterDefender.perimeterDefense;
  const ratingBoost = clamp((shotSkill - 5) * (shotType === 'three' ? 0.038 : shotType === 'mid' ? 0.042 : 0.036), -0.16, 0.28);
  const defenderPenalty = clamp((defenderImpact - 5) * (shotType === 'three' ? 0.026 : shotType === 'mid' ? 0.03 : 0.034), -0.1, 0.26);
  const positioningPenalty = contest.positioning === 'front' ? 0.11 : contest.positioning === 'side' ? 0.06 : 0.02;
  const hitChance = clamp(baseChance + ratingBoost - contest.strength * 0.44 - defenderPenalty - positioningPenalty - fatiguePenalty, 0.12, 0.92);
  const blockChance =
    shotType === 'layup'
      ? clamp(0.015 + rimDefender.interiorDefense * 0.012 + contest.strength * 0.14 - shooter.finishing * 0.006, 0.01, 0.22)
      : clamp(0.004 + perimeterDefender.perimeterDefense * 0.004 + contest.strength * 0.05, 0.002, 0.08);
  return { hitChance, blockChance };
}

function resolveShotOutcome(
  shotType: ShotType,
  shooter: SimPlayerProfile,
  perimeterDefender: SimPlayerProfile,
  rimDefender: SimPlayerProfile,
  wasPass: boolean,
  seed: string,
) {
  const contest = computeContest(shotType, shooter, perimeterDefender, rimDefender, wasPass, seed);
  const { hitChance, blockChance } = resolveShotChance(shotType, shooter, contest, perimeterDefender, rimDefender, seed);
  const blocked = seeded01(`${seed}:block`) < blockChance;
  const made = !blocked && seeded01(`${seed}:make`) < hitChance;
  return { contest, hitChance, blocked, made };
}

function reboundWeight(profile: SimPlayerProfile, shotType: ShotType) {
  return profile.rebounding * 0.66 + profile.size * 0.22 + profile.athleticism * 0.12 + (shotType === 'three' ? profile.speed * 0.06 : 0);
}

function simulatePossession(
  offense: TeamSimState,
  defense: TeamSimState,
  offenseStats: Record<string, PlayerInGameStats>,
  defenseStats: Record<string, PlayerInGameStats>,
  possessionIndex: number,
  intensity: number,
  context?: { isLateGame?: boolean; scoreMargin?: number },
) {
  const seed = `${offense.team.id}:${defense.team.id}:${possessionIndex}:${context?.isLateGame ? 1 : 0}:${context?.scoreMargin ?? 0}`;
  const offensePlayers = activePlayers(offense);
  const defensePlayers = activePlayers(defense);
  if (!offensePlayers.length || !defensePlayers.length) return 0;

  const offenseTeam = teamProfile(offense, context);
  const defenseTeam = teamProfile(defense, context);
  const offenseProfiles = new Map(offensePlayers.map((player) => [player.id, buildPlayerProfile(player, offense.team, offense.staminaById[player.id] ?? 100, context)]));
  const defenseProfiles = new Map(defensePlayers.map((player) => [player.id, buildPlayerProfile(player, defense.team, defense.staminaById[player.id] ?? 100, context)]));

  const ballHandler = deterministicWeightedPick(
    offensePlayers,
    (player) => (offenseProfiles.get(player.id)?.usage ?? 5) * (1 + player.prospect.potential / 50),
    `${seed}:handler`,
  );
  const ballHandlerProfile = offenseProfiles.get(ballHandler.id)!;
  const primaryDefender = deterministicWeightedPick(
    defensePlayers,
    (player) => defenseProfiles.get(player.id)?.perimeterDefense ?? 5,
    `${seed}:perimeter-defender`,
  );
  const primaryDefenderProfile = defenseProfiles.get(primaryDefender.id)!;
  const rimDefender =
    defensePlayers
      .slice()
      .sort((a, b) => (defenseProfiles.get(b.id)?.interiorDefense ?? 0) - (defenseProfiles.get(a.id)?.interiorDefense ?? 0))[0] ?? primaryDefender;
  const rimDefenderProfile = defenseProfiles.get(rimDefender.id)!;

  const receiverCandidates = offensePlayers.filter((player) => player.id !== ballHandler.id);
  const bestReceiver = receiverCandidates
    .map((player) => {
      const profile = offenseProfiles.get(player.id)!;
      const shotEdge = profile.shooting - defenseTeam.perimeterDefense + profile.threeTendency * 10;
      const driveEdge = profile.finishing - defenseTeam.interiorDefense + profile.speed * 0.18;
      return { player, score: Math.max(shotEdge, driveEdge) + profile.playmaking * 0.08 };
    })
    .sort((a, b) => b.score - a.score)[0]?.player ?? null;
  const bestReceiverProfile = bestReceiver ? offenseProfiles.get(bestReceiver.id)! : null;
  const creatorPerimeterEdge = ballHandlerProfile.shooting - primaryDefenderProfile.perimeterDefense + ballHandlerProfile.threeTendency * 10;
  const creatorDriveEdge = ballHandlerProfile.finishing + ballHandlerProfile.speed * 0.2 - primaryDefenderProfile.perimeterDefense - rimDefenderProfile.interiorDefense * 0.4;
  const bestReceiverEdge = bestReceiverProfile ? Math.max(bestReceiverProfile.shooting - defenseTeam.perimeterDefense, bestReceiverProfile.finishing - defenseTeam.interiorDefense) : -1;

  const action = deterministicWeightedPick(
    ['pass', 'three', 'mid', 'drive'] as const,
    (actionType) => {
      if (actionType === 'pass') {
        return clamp(0.12 + ballHandlerProfile.playmaking * 0.08 + Math.max(0, bestReceiverEdge - Math.max(creatorPerimeterEdge, creatorDriveEdge)) * 0.08, 0.05, 1.2);
      }
      if (actionType === 'three') {
        return clamp(0.1 + ballHandlerProfile.threeTendency * 1.2 + creatorPerimeterEdge * 0.05, 0.03, 1.1);
      }
      if (actionType === 'mid') {
        return clamp(0.08 + ballHandlerProfile.shooting * 0.05 + ballHandlerProfile.size * 0.02 - primaryDefenderProfile.perimeterDefense * 0.03, 0.03, 0.9);
      }
      return clamp(0.12 + creatorDriveEdge * 0.06 + ballHandlerProfile.speed * 0.03, 0.04, 1.1);
    },
    `${seed}:action`,
  );

  let shooter = ballHandler;
  let shooterProfile = ballHandlerProfile;
  let perimeterDefender = primaryDefenderProfile;
  let shotType: ShotType = action === 'three' ? 'three' : action === 'mid' ? 'mid' : 'layup';
  let wasPass = false;
  let assisterId: string | null = null;
  const workloadsOffense: Array<{ playerId: string; workload: number }> = [{ playerId: ballHandler.id, workload: 0.6 }];
  const workloadsDefense: Array<{ playerId: string; workload: number }> = [
    { playerId: primaryDefender.id, workload: 0.56 },
    { playerId: rimDefender.id, workload: 0.52 },
  ];

  if (action === 'pass' && bestReceiver && bestReceiverProfile) {
    const passPressure = clamp(
      0.04 +
        (defenseTeam.perimeterDefense - ballHandlerProfile.playmaking) * 0.012 +
        (defenseTeam.playmaking - offenseTeam.playmaking) * 0.004 +
        Math.max(0, 0.08 - bestReceiverEdge * 0.01),
      0.02,
      0.18,
    );
    if (seeded01(`${seed}:pass-turnover`) < passPressure) {
      addLine(defenseStats, primaryDefender.id, { steals: 1 });
      applyFatigue(offense, workloadsOffense, intensity);
      applyFatigue(defense, workloadsDefense, intensity);
      return 0;
    }

    shooter = bestReceiver;
    shooterProfile = bestReceiverProfile;
    perimeterDefender = defenseProfiles.get(defensePlayers.find((player) => player.id !== primaryDefender.id)?.id ?? primaryDefender.id)!;
    const receiverDriveEdge = shooterProfile.finishing + shooterProfile.speed * 0.22 - perimeterDefender.perimeterDefense - rimDefenderProfile.interiorDefense * 0.42;
    const receiverThreeEdge = shooterProfile.shooting - perimeterDefender.perimeterDefense + shooterProfile.threeTendency * 9 + 0.75;
    shotType = receiverDriveEdge > receiverThreeEdge + 0.2 ? (shooterProfile.dunk >= 7.2 && receiverDriveEdge > 1 ? 'dunk' : 'layup') : shooterProfile.threeTendency >= 0.2 ? 'three' : 'mid';
    wasPass = true;
    assisterId = ballHandler.id;
    workloadsOffense.push({ playerId: shooter.id, workload: 0.68 });
  } else {
    shotType = action === 'drive'
      ? ballHandlerProfile.dunk >= 7.4 && creatorDriveEdge > 0.8
        ? 'dunk'
        : 'layup'
      : action === 'three'
        ? 'three'
        : 'mid';
    workloadsOffense.push({ playerId: shooter.id, workload: shotType === 'dunk' ? 0.78 : 0.7 });
  }

  const shot = resolveShotOutcome(shotType, shooterProfile, perimeterDefender, rimDefenderProfile, wasPass, `${seed}:shot`);
  if (shot.blocked) {
    addLine(defenseStats, rimDefender.id, { blocks: 1 });
    applyFatigue(offense, workloadsOffense, intensity);
    applyFatigue(defense, workloadsDefense, intensity);
    return 0;
  }

  if (shot.made) {
    const points = shotType === 'three' ? 3 : 2;
    addLine(offenseStats, shooter.id, { points });
    if (assisterId && assisterId !== shooter.id) addLine(offenseStats, assisterId, { assists: 1 });
    applyFatigue(offense, workloadsOffense, intensity);
    applyFatigue(defense, workloadsDefense, intensity);
    return points;
  }

  const offenseReboundEdge =
    offensePlayers.reduce((sum, player) => sum + reboundWeight(offenseProfiles.get(player.id)!, shotType), 0) / offensePlayers.length -
    defensePlayers.reduce((sum, player) => sum + reboundWeight(defenseProfiles.get(player.id)!, shotType), 0) / defensePlayers.length;
  const offensiveReboundChance = clamp(0.12 + offenseReboundEdge * 0.02 - (shotType === 'three' ? 0.02 : 0.01), 0.08, 0.28);
  if (seeded01(`${seed}:oreb`) < offensiveReboundChance) {
    const rebounder = deterministicWeightedPick(
      offensePlayers,
      (player) => reboundWeight(offenseProfiles.get(player.id)!, shotType),
      `${seed}:oreb-player`,
    );
    addLine(offenseStats, rebounder.id, { rebounds: 1 });
    applyFatigue(offense, [...workloadsOffense, { playerId: rebounder.id, workload: 0.4 }], intensity);
    applyFatigue(defense, workloadsDefense, intensity);
    const putbackProfile = offenseProfiles.get(rebounder.id)!;
    const putbackShot = resolveShotOutcome(
      putbackProfile.dunk >= 7.8 && shotType !== 'three' ? 'dunk' : 'layup',
      putbackProfile,
      perimeterDefender,
      rimDefenderProfile,
      false,
      `${seed}:putback`,
    );
    if (putbackShot.blocked) {
      addLine(defenseStats, rimDefender.id, { blocks: 1 });
      return 0;
    }
    if (putbackShot.made) {
      addLine(offenseStats, rebounder.id, { points: 2 });
      return 2;
    }
    return 0;
  }

  const rebounder = deterministicWeightedPick(
    defensePlayers,
    (player) => reboundWeight(defenseProfiles.get(player.id)!, shotType),
    `${seed}:dreb-player`,
  );
  addLine(defenseStats, rebounder.id, { rebounds: 1 });
  applyFatigue(offense, workloadsOffense, intensity);
  applyFatigue(defense, [...workloadsDefense, { playerId: rebounder.id, workload: 0.34 }], intensity);
  return 0;
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
  const stateA = createTeamSimState(teamA);
  const stateB = createTeamSimState(teamB);
  const teamAProfile = teamProfile(stateA);
  const teamBProfile = teamProfile(stateB);
  const playerStatsByEntityId: Record<string, PlayerInGameStats> = {};
  ensurePlayerStats(teamA, playerStatsByEntityId);
  ensurePlayerStats(teamB, playerStatsByEntityId);

  const paceBase = pace === 'fast' ? 54 : pace === 'slow' ? 42 : 48;
  const paceOffset = Math.round(((teamAProfile.speed + teamBProfile.speed) / 2 - 5.5) * 1.8);
  const possessionsPerTeam = clamp(paceBase + paceOffset, 38, 60);

  let scoreA = 0;
  let scoreB = 0;

  for (let possession = 0; possession < possessionsPerTeam; possession += 1) {
    const possessionStage = possession / Math.max(1, possessionsPerTeam - 1);
    const lateGame = possessionStage >= 0.72;
    const closeGame = Math.abs(scoreA - scoreB) <= 6 ? 0.08 : 0;
    const intensity = (pace === 'fast' ? 0.18 : pace === 'slow' ? -0.03 : 0.06) + (lateGame ? 0.12 : 0) + closeGame;

    maybeSubstitute(stateA, lateGame);
    maybeSubstitute(stateB, lateGame);

    scoreA += simulatePossession(stateA, stateB, playerStatsByEntityId, playerStatsByEntityId, possession * 2, intensity, {
      isLateGame: lateGame,
      scoreMargin: Math.abs(scoreA - scoreB),
    });
    scoreB += simulatePossession(stateB, stateA, playerStatsByEntityId, playerStatsByEntityId, possession * 2 + 1, intensity, {
      isLateGame: lateGame,
      scoreMargin: Math.abs(scoreA - scoreB),
    });
  }

  let overtimeIndex = 0;
  while (scoreA === scoreB) {
    overtimeIndex += 1;
    for (let possession = 0; possession < 4; possession += 1) {
      scoreA += simulatePossession(stateA, stateB, playerStatsByEntityId, playerStatsByEntityId, 10_000 + overtimeIndex * 10 + possession * 2, 0.22, {
        isLateGame: true,
        scoreMargin: 0,
      });
      scoreB += simulatePossession(stateB, stateA, playerStatsByEntityId, playerStatsByEntityId, 10_000 + overtimeIndex * 10 + possession * 2 + 1, 0.22, {
        isLateGame: true,
        scoreMargin: 0,
      });
      if (scoreA !== scoreB) break;
    }
  }

  const result: MatchResult = {
    status: 'ended',
    winner: scoreA > scoreB ? 'user' : 'ai',
    finalScore: { user: scoreA, ai: scoreB },
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
