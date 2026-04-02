import type { PlayerInGameStats, TeamPlayer, TeamState } from './types';
import { getPlayerGameplayModifiers, getTeamGameplayModifiers } from './personality';
import { overallToTenScale } from './ratings';
import { getAiAggressionMultiplier, getArcadeBalanceBias, getCurrentSettings, getDifficultyTuning } from './settings';
import { chooseSubstitution, decayStamina, fatigueMultiplier, recoverBenchStamina } from './stamina';

export type MatchStatus = 'running' | 'ended';
export type MatchResult = {
  status: MatchStatus;
  winner: 'user' | 'ai' | 'draw';
  finalScore: { user: number; ai: number };
  playerStatsByEntityId: Record<string, PlayerInGameStats>;
};

export type MatchEventTone = 'green' | 'red' | 'gold' | 'blue';

export type MatchEvent = {
  id: string;
  tone: MatchEventTone;
  text: string;
  x: number;
  y: number;
  createdAtMs: number;
};

export type Court = {
  width: number;
  height: number;
};

export type EntityTeam = 'user' | 'ai';

type Vec2 = { x: number; y: number };
type LooseBallSource = 'shot' | 'pass' | 'turnover';

type Entity = {
  id: string;
  slotIndex: 0 | 1;
  jerseyNumber: number;
  team: EntityTeam;
  name: string;
  color: string;
  accentColor: string;
  pos: Vec2;
  vel: Vec2;
  facing: Vec2;
  dashDir: Vec2;
  radius: number;
  jumpMs: number;
  dunkMs: number;
  blockMs: number;
  dodgeMs: number;
  stunMs: number;
  impactMs: number;
  actionCooldownMs: number;
  koMs: number;
  health: number;
  maxHealth: number;
  healthRegenDelayMs: number;
  categories: {
    shooting: number;
    speed: number;
    playmaking: number;
    defense: number;
  };
};

type BallState =
  | { kind: 'possession'; ownerId: string }
  | {
      kind: 'pass';
      passerId: string;
      receiverId: string;
      start: Vec2;
      end: Vec2;
      t: number;
      duration: number;
      passAccuracy: number;
      offset: Vec2;
    }
  | {
      kind: 'shot';
      shooterId: string;
      start: Vec2;
      target: Vec2;
      t: number;
      duration: number;
      arcHeight: number;
      defenseContestId?: string;
      willBlock: boolean;
      hitChance: number;
      points: number;
      isDunk?: boolean;
    }
  | {
      kind: 'loose';
      pos: Vec2;
      vel: Vec2;
      pickupDelayMs: number;
      lastTouchTeam?: EntityTeam | null;
      bounceMs: number;
      source: LooseBallSource;
    };

export type MatchState = {
  status: MatchStatus;
  court: Court;
  user: TeamState;
  ai: TeamState;
  entities: Entity[];
  ball: BallState;
  score: { user: number; ai: number };
  timeLeftMs: number;
  resetTimerMs: number;
  lastScoringTeam: EntityTeam | null;
  events: MatchEvent[];
  playerStatsByEntityId: Record<string, PlayerInGameStats>;
  staminaByPlayerId: Record<string, number>;
  substitutionCooldownMs: Record<EntityTeam, number>;
  staminaPulseMs: number;
};

export type PlayerInput = {
  moveX: number;
  moveY: number;
  shootPressed: boolean;
  passPressed: boolean;
  passTarget?: Vec2;
  dodgePressed: boolean;
  jumpPressed: boolean;
  karatePressed: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function len2(v: Vec2) {
  return Math.hypot(v.x, v.y);
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(a: Vec2, s: number): Vec2 {
  return { x: a.x * s, y: a.y * s };
}

function normalize(v: Vec2): Vec2 {
  const l = len2(v);
  if (l <= 0.0001) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function dist(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clonePlayer(player: TeamPlayer): TeamPlayer {
  return {
    ...player,
    personality: { ...player.personality },
    prospect: {
      ...player.prospect,
      categories: { ...player.prospect.categories },
    },
    contract: { ...player.contract },
    seasonStats: { ...player.seasonStats },
    playoffStats: { ...player.playoffStats },
  };
}

function cloneTeam(team: TeamState): TeamState {
  return {
    ...team,
    roster: team.roster.map(clonePlayer),
    draftPicks: team.draftPicks.map((pick) => ({ ...pick })),
    activePlayerIds: [...team.activePlayerIds] as [string, string],
  };
}

function pickBallHandler(team: TeamState): TeamPlayer {
  const [ballId] = team.activePlayerIds;
  const found = team.roster.find((p) => p.id === ballId);
  if (found) return found;
  return [...team.roster].sort((a, b) => b.prospect.overall - a.prospect.overall)[0];
}

function pickOffBall(team: TeamState): TeamPlayer {
  const [, offId] = team.activePlayerIds;
  const found = team.roster.find((p) => p.id === offId);
  if (found) return found;
  return [...team.roster].sort((a, b) => b.prospect.overall - a.prospect.overall)[1] ?? [...team.roster][0];
}

function findPlayer(team: TeamState, playerId: string) {
  return team.roster.find((player) => player.id === playerId);
}

function playerSizeScore(player: TeamPlayer) {
  const heightScore = clamp(4.6 + (player.prospect.height - 74) * 0.34, 1, 10);
  const wingspanDelta = player.prospect.wingspan - player.prospect.height;
  const lengthScore = clamp(4.8 + wingspanDelta * 0.24, 1, 10);
  const frameScore = clamp(4.7 + (player.prospect.weight - 205) * 0.03, 1, 10);
  return clamp(heightScore * 0.42 + lengthScore * 0.38 + frameScore * 0.2, 1, 10);
}

function playerSkillBlend(player: TeamPlayer) {
  const overall = overallToTenScale(player.prospect.overall);
  const athleticism = clamp(player.prospect.athleticism, 1, 10);
  const size = playerSizeScore(player);
  const shooting = clamp(player.prospect.categories.shooting * 0.72 + overall * 0.18 + athleticism * 0.1, 1, 10);
  const speed = clamp(player.prospect.categories.speed * 0.68 + athleticism * 0.24 + overall * 0.08, 1, 10);
  const playmaking = clamp(player.prospect.categories.playmaking * 0.7 + overall * 0.18 + athleticism * 0.12, 1, 10);
  const defense = clamp(player.prospect.categories.defense * 0.68 + overall * 0.14 + size * 0.1 + athleticism * 0.08, 1, 10);
  const hands = clamp(playmaking * 0.46 + speed * 0.16 + overall * 0.22 + athleticism * 0.16, 1, 10);
  const rebounding = clamp(defense * 0.42 + size * 0.3 + athleticism * 0.18 + speed * 0.1, 1, 10);
  return { overall, athleticism, size, shooting, speed, playmaking, defense, hands, rebounding };
}

function liveGameContext(state: MatchState) {
  return {
    isLateGame: state.timeLeftMs <= 30_000,
    scoreMargin: Math.abs(state.score.user - state.score.ai),
  };
}

function entitySkillBlend(state: MatchState, entity: Entity) {
  const player = findPlayer(state[entity.team], entity.id);
  if (player) {
    const base = playerSkillBlend(player);
    const mods = getPlayerGameplayModifiers(player, state[entity.team], liveGameContext(state));
    return {
      ...base,
      shooting: clamp(base.shooting * (1 + mods.shotBoost), 1, 10),
      speed: clamp(base.speed * (1 + mods.reactionBoost * 0.65), 1, 10),
      playmaking: clamp(base.playmaking * (1 + mods.passBias * 0.45), 1, 10),
      defense: clamp(base.defense * (1 + mods.reactionBoost + mods.stealBoost * 0.35), 1, 10),
      hands: clamp(base.hands * (1 + mods.passBias * 0.2 + mods.reactionBoost * 0.15), 1, 10),
      rebounding: clamp(base.rebounding * (1 + mods.reactionBoost * 0.12), 1, 10),
    };
  }
  const overall = clamp((entity.categories.shooting + entity.categories.speed + entity.categories.playmaking + entity.categories.defense) / 4, 1, 10);
  return {
    overall,
    athleticism: clamp(entity.categories.speed * 0.7 + entity.categories.defense * 0.3, 1, 10),
    size: clamp(4.8 + entity.radius * 0.18, 1, 10),
    shooting: entity.categories.shooting,
    speed: entity.categories.speed,
    playmaking: entity.categories.playmaking,
    defense: entity.categories.defense,
    hands: clamp(entity.categories.playmaking * 0.54 + entity.categories.speed * 0.2 + overall * 0.26, 1, 10),
    rebounding: clamp(entity.categories.defense * 0.5 + entity.categories.speed * 0.2 + overall * 0.3, 1, 10),
  };
}

function getPlayerStamina(state: MatchState, playerId: string) {
  return clamp(state.staminaByPlayerId[playerId] ?? 100, 0, 100);
}

function setPlayerStamina(state: MatchState, teamKey: EntityTeam, playerId: string, nextStamina: number) {
  state.staminaByPlayerId[playerId] = clamp(nextStamina, 0, 100);
  const player = findPlayer(state[teamKey], playerId);
  if (player) player.stamina = state.staminaByPlayerId[playerId];
}

function getTeamEntities(state: MatchState, team: EntityTeam) {
  return state.entities
    .filter((entity) => entity.team === team)
    .sort((a, b) => a.slotIndex - b.slotIndex);
}

function activePlayers(team: TeamState) {
  return team.activePlayerIds
    .map((id) => findPlayer(team, id))
    .filter((player): player is TeamPlayer => Boolean(player));
}

function benchPlayers(team: TeamState) {
  const activeIds = new Set(team.activePlayerIds);
  return team.roster.filter((player) => !activeIds.has(player.id));
}

function teamAverages(team: TeamState, state: MatchState) {
  const players = activePlayers(team);
  const fallback = players.length ? players : team.roster.slice(0, 2);
  const pool = fallback.length ? fallback : [pickBallHandler(team)];
  const teamMods = getTeamGameplayModifiers(team);
  const sums = pool.reduce(
    (acc, player) => {
      const fatigue = fatigueMultiplier(getPlayerStamina(state, player.id));
      const profile = entitySkillBlend(state, {
        id: player.id,
        slotIndex: 0,
        jerseyNumber: 0,
        team: team.id === state.user.id ? 'user' : 'ai',
        name: player.prospect.name,
        color: '',
        accentColor: '',
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        facing: { x: 0, y: 0 },
        dashDir: { x: 0, y: 0 },
        radius: 16,
        jumpMs: 0,
        dunkMs: 0,
        blockMs: 0,
        dodgeMs: 0,
        stunMs: 0,
        impactMs: 0,
        actionCooldownMs: 0,
        koMs: 0,
        health: 10,
        maxHealth: 10,
        healthRegenDelayMs: 0,
        categories: { ...player.prospect.categories },
      });
      acc.shooting += profile.shooting * fatigue;
      acc.speed += profile.speed * fatigue;
      acc.playmaking += profile.playmaking * fatigue;
      acc.defense += profile.defense * fatigue;
      acc.overall += profile.overall * fatigue;
      acc.athleticism += profile.athleticism * fatigue;
      acc.size += profile.size * fatigue;
      return acc;
    },
    { shooting: 0, speed: 0, playmaking: 0, defense: 0, overall: 0, athleticism: 0, size: 0 },
  );
  const n = pool.length || 1;
  return {
    shooting: (sums.shooting / n) * (1 + teamMods.shootingBoost),
    speed: (sums.speed / n) * (1 + teamMods.reactionBoost * 0.65),
    playmaking: (sums.playmaking / n) * (1 + teamMods.passingBoost),
    defense: (sums.defense / n) * (1 + teamMods.reactionBoost),
    overall: sums.overall / n,
    athleticism: sums.athleticism / n,
    size: sums.size / n,
  };
}

function teamAttackMultiplier(team: TeamState, state: MatchState) {
  const a = teamAverages(team, state);
  const teamMods = getTeamGameplayModifiers(team);
  const off = 0.42 * a.shooting + 0.27 * a.playmaking + 0.17 * a.overall + 0.14 * a.athleticism;
  return clamp(0.74 + (off / 10) * 0.54 + teamMods.shootingBoost * 0.18 + teamMods.passingBoost * 0.12, 0.7, 1.28);
}

function teamDefenseMultiplier(team: TeamState, state: MatchState) {
  const a = teamAverages(team, state);
  const teamMods = getTeamGameplayModifiers(team);
  const defenseBase = 0.48 * a.defense + 0.18 * a.size + 0.16 * a.overall + 0.18 * a.athleticism;
  return clamp(0.74 + (defenseBase / 10) * 0.5 + teamMods.reactionBoost * 0.18, 0.7, 1.26);
}

function spawnPositions(court: Court) {
  const rightX = court.width * 0.78;
  const leftX = court.width * 0.22;
  const topY = court.height * 0.35;
  const botY = court.height * 0.68;
  return { rightX, leftX, topY, botY };
}

function addEvent(state: MatchState, ev: Omit<MatchEvent, 'id' | 'createdAtMs'>) {
  state.events.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAtMs: performance.now(),
    ...ev,
  });
}

function getEntity(state: MatchState, id: string) {
  const entity = state.entities.find((candidate) => candidate.id === id);
  if (!entity) throw new Error(`Missing entity ${id}`);
  return entity;
}

function closestOpponent(
  state: MatchState,
  fromId: string,
  toTeam: EntityTeam,
): { entity: Entity; d: number } | null {
  const from = getEntity(state, fromId);
  let best: { entity: Entity; d: number } | null = null;
  for (const entity of state.entities) {
    if (entity.team !== toTeam || !isEntityAvailable(entity)) continue;
    const d = dist(from.pos, entity.pos);
    if (!best || d < best.d) best = { entity, d };
  }
  return best;
}

function closestTeamToPoint(
  state: MatchState,
  point: Vec2,
  team: EntityTeam,
  excludeId?: string,
): { entity: Entity; d: number } | null {
  let best: { entity: Entity; d: number } | null = null;
  for (const entity of state.entities) {
    if (entity.team !== team || entity.id === excludeId || !isEntityAvailable(entity)) continue;
    const d = dist(point, entity.pos);
    if (!best || d < best.d) best = { entity, d };
  }
  return best;
}

function pointToSegmentDistance(point: Vec2, start: Vec2, end: Vec2) {
  const segment = sub(end, start);
  const lengthSq = segment.x * segment.x + segment.y * segment.y;
  if (lengthSq <= 0.0001) return dist(point, start);
  const projection = clamp(((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) / lengthSq, 0, 1);
  return dist(point, {
    x: start.x + segment.x * projection,
    y: start.y + segment.y * projection,
  });
}

function projectPointToSegment(point: Vec2, start: Vec2, end: Vec2) {
  const segment = sub(end, start);
  const lengthSq = segment.x * segment.x + segment.y * segment.y;
  if (lengthSq <= 0.0001) return { t: 0, point: { ...start } };
  const t = clamp(((point.x - start.x) * segment.x + (point.y - start.y) * segment.y) / lengthSq, 0, 1);
  return {
    t,
    point: {
      x: start.x + segment.x * t,
      y: start.y + segment.y * t,
    },
  };
}

function laneTrafficScore(
  state: MatchState,
  start: Vec2,
  end: Vec2,
  team: EntityTeam,
  excludeId?: string,
) {
  const directDistance = dist(start, end);
  if (directDistance <= 0.0001) return 0;

  let score = 0;
  for (const entity of state.entities) {
    if (entity.team !== team || entity.id === excludeId || !isEntityAvailable(entity)) continue;
    const laneDistance = pointToSegmentDistance(entity.pos, start, end);
    if (laneDistance > 54) continue;
    const detour = dist(start, entity.pos) + dist(entity.pos, end) - directDistance;
    const laneFactor = clamp(1 - laneDistance / 54, 0, 1);
    const detourFactor = clamp(1 - detour / 90, 0, 1);
    score += laneFactor * (0.55 + detourFactor * 0.45);
  }

  return clamp(score, 0, 1.8);
}

function shotQualityScore(state: MatchState, shooter: Entity, basket: Vec2, defenderTeam: EntityTeam) {
  const defender = closestOpponent(state, shooter.id, defenderTeam);
  const distanceScore = clamp(1 - dist(shooter.pos, basket) / 340, 0, 1);
  const pressure = clamp(1 - (defender?.d ?? 132) / 96, 0, 1);
  const profile = entitySkillBlend(state, shooter);
  const shooterPlayer = findPlayer(state[shooter.team], shooter.id);
  const shooterMods = shooterPlayer ? getPlayerGameplayModifiers(shooterPlayer, state[shooter.team], liveGameContext(state)) : null;
  const shooterTeamMods = getTeamGameplayModifiers(state[shooter.team]);
  const shootingTouch = (profile.shooting / 10) * fatigueMultiplier(getPlayerStamina(state, shooter.id));
  const laneTraffic = laneTrafficScore(state, shooter.pos, basket, defenderTeam, shooter.id);
  return clamp(
    0.12 +
      shootingTouch * 0.42 +
      distanceScore * 0.26 +
      (1 - pressure) * 0.18 +
      (profile.athleticism / 10) * 0.08 +
      (shooterMods?.shotBoost ?? 0) * 0.22 +
      shooterTeamMods.shootingBoost * 0.2 -
      laneTraffic * 0.15,
    0,
    1,
  );
}

function passWindowScore(state: MatchState, passer: Entity, receiver: Entity, defenderTeam: EntityTeam) {
  const receiverDefender = closestTeamToPoint(state, receiver.pos, defenderTeam, passer.id);
  const receiverPressure = clamp(1 - (receiverDefender?.d ?? 140) / 104, 0, 1);
  const passerProfile = entitySkillBlend(state, passer);
  const receiverProfile = entitySkillBlend(state, receiver);
  const passerPlayer = findPlayer(state[passer.team], passer.id);
  const passerMods = passerPlayer ? getPlayerGameplayModifiers(passerPlayer, state[passer.team], liveGameContext(state)) : null;
  const passerTeamMods = getTeamGameplayModifiers(state[passer.team]);
  const playmakingTouch = (passerProfile.playmaking / 10) * fatigueMultiplier(getPlayerStamina(state, passer.id));
  const laneTraffic = laneTrafficScore(state, passer.pos, receiver.pos, defenderTeam, passer.id);
  const distancePenalty = clamp(dist(passer.pos, receiver.pos) / 360, 0, 1);
  return clamp(
    0.22 +
      playmakingTouch * 0.38 +
      (receiverProfile.hands / 10) * 0.14 +
      (passerMods?.passBias ?? 0) * 0.22 +
      passerTeamMods.passingBoost * 0.18 +
      (1 - receiverPressure) * 0.14 -
      laneTraffic * 0.24 -
      distancePenalty * 0.1,
    0,
    1,
  );
}

function bestPassInterceptor(state: MatchState, start: Vec2, end: Vec2, defendingTeam: EntityTeam, excludeId?: string) {
  let best: { entity: Entity; score: number; laneDistance: number } | null = null;
  for (const entity of state.entities) {
    if (entity.team !== defendingTeam || entity.id === excludeId || !isEntityAvailable(entity)) continue;
    const projection = projectPointToSegment(entity.pos, start, end);
    const laneDistance = dist(entity.pos, projection.point);
    if (laneDistance > 74) continue;
    const profile = entitySkillBlend(state, entity);
    const arrivalScore = clamp(1 - dist(entity.pos, projection.point) / 92, 0, 1);
    const laneScore = clamp(1 - laneDistance / 74, 0, 1);
    const handsScore = profile.hands / 10;
    const defenseScore = profile.defense / 10;
    const athleticScore = profile.athleticism / 10;
    const score = laneScore * 0.36 + arrivalScore * 0.24 + defenseScore * 0.22 + handsScore * 0.1 + athleticScore * 0.08;
    if (!best || score > best.score) best = { entity, score, laneDistance };
  }
  return best;
}

function passOutcomeProfile(
  state: MatchState,
  passer: Entity,
  receiver: Entity,
  receiverTarget: Vec2,
  defenderTeam: EntityTeam,
) {
  const passerProfile = entitySkillBlend(state, passer);
  const receiverProfile = entitySkillBlend(state, receiver);
  const laneTraffic = laneTrafficScore(state, passer.pos, receiverTarget, defenderTeam, passer.id);
  const passDist = dist(passer.pos, receiverTarget);
  const distFactor = clamp(passDist / 520, 0, 1);
  const interceptor = bestPassInterceptor(state, passer.pos, receiverTarget, defenderTeam, passer.id);
  const releaseTouch = (passerProfile.playmaking * 0.58 + passerProfile.hands * 0.24 + passerProfile.overall * 0.18) / 10;
  const receiveTouch = (receiverProfile.hands * 0.6 + receiverProfile.speed * 0.16 + receiverProfile.overall * 0.24) / 10;
  const interceptChance = interceptor
    ? clamp(
        0.03 +
          laneTraffic * 0.1 +
          interceptor.score * 0.26 -
          releaseTouch * 0.17 -
          receiveTouch * 0.06 +
          distFactor * 0.06,
        0.02,
        0.42,
      )
    : 0;
  const passAccuracy = clamp(0.82 + releaseTouch * 0.13 + receiveTouch * 0.06 - laneTraffic * 0.05 - distFactor * 0.06, 0.76, 0.99);
  const duration = clamp((passDist / 780) * 1000, 210, 390);
  const spread = (1 - passAccuracy) * 24;
  return { interceptor, interceptChance, passAccuracy, duration, spread };
}

function reboundContestScore(
  state: MatchState,
  entity: Entity,
  loosePos: Vec2,
  looseVel: Vec2,
  lastTouchTeam?: EntityTeam | null,
  source: LooseBallSource = 'turnover',
) {
  const distance = dist(entity.pos, loosePos);
  const profile = entitySkillBlend(state, entity);
  const staminaBoost = fatigueMultiplier(getPlayerStamina(state, entity.id));
  const speedTouch = profile.speed / 10;
  const reboundTouch = profile.rebounding / 10;
  const sizeTouch = profile.size / 10;
  const jumpBonus = entity.jumpMs > 0 ? 0.17 + profile.athleticism / 55 : 0;
  const movingToBall = len2(entity.vel) > 8 ? clamp(((loosePos.x - entity.pos.x) * entity.vel.x + (loosePos.y - entity.pos.y) * entity.vel.y) / 8600, 0, 0.18) : 0;
  const looseBallAngle = len2(looseVel) > 8 ? clamp(((loosePos.x - entity.pos.x) * looseVel.x + (loosePos.y - entity.pos.y) * looseVel.y) / 12000, -0.08, 0.08) : 0;
  const boxOutBias =
    source === 'shot'
      ? entity.team === lastTouchTeam
        ? -0.2 + reboundTouch * 0.04
        : 0.18 + sizeTouch * 0.08
      : 0;
  return 1.04 - distance / 76 + reboundTouch * 0.32 + sizeTouch * 0.18 + speedTouch * 0.12 + staminaBoost * 0.12 + jumpBonus + movingToBall + looseBallAngle + boxOutBias;
}

function missCaromVelocity(target: Vec2, shooter: Entity | null, points: number) {
  const sideSign = target.x < 200 ? 1 : -1;
  const angleJitter = (Math.random() - 0.5) * 110;
  const longMissBoost = points === 3 ? 1.28 : 1.08;
  const outward = 168 * longMissBoost + Math.random() * 92;
  const vertical = (Math.random() - 0.5) * 190 + (shooter ? shooter.vel.y * 0.42 : 0);
  return {
    x: sideSign * outward + angleJitter + (shooter ? shooter.vel.x * 0.22 : 0),
    y: vertical,
  };
}

function blockRejectionVelocity(state: MatchState, blocker: Entity, shooter: Entity | null) {
  const profile = entitySkillBlend(state, blocker);
  const downCourt = blocker.team === 'user' ? 1 : -1;
  const launch = 320 + profile.defense * 18 + profile.athleticism * 16;
  const sidelineDrift =
    (shooter ? clamp((shooter.pos.y - state.court.height * 0.5) * 0.9, -120, 120) : 0) +
    (Math.random() - 0.5) * 140;
  return {
    x: downCourt * launch + (shooter ? shooter.vel.x * 0.35 : 0),
    y: sidelineDrift,
  };
}

function dunkWindowProfile(state: MatchState, entity: Entity, basket: Vec2, defenderTeam: EntityTeam) {
  const defender = closestOpponent(state, entity.id, defenderTeam);
  const profile = entitySkillBlend(state, entity);
  const distance = dist(entity.pos, basket);
  const pressure = clamp(1 - (defender?.d ?? 132) / 104, 0, 1);
  const laneTraffic = laneTrafficScore(state, entity.pos, basket, defenderTeam, entity.id);
  const toBasket = normalize(sub(basket, entity.pos));
  const facing = len2(entity.facing) > 0.01 ? normalize(entity.facing) : toBasket;
  const moving = len2(entity.vel) > 10 ? normalize(entity.vel) : toBasket;
  const facingScore = clamp((facing.x * toBasket.x + facing.y * toBasket.y + 1) / 2, 0, 1);
  const speedScore = clamp(len2(entity.vel) / 220, 0, 1);
  const movingScore = clamp((moving.x * toBasket.x + moving.y * toBasket.y + 1) / 2, 0, 1);
  const athleteScore = clamp(
    ((profile.speed * 0.28 + profile.shooting * 0.24 + profile.playmaking * 0.16 + profile.athleticism * 0.22 + profile.size * 0.1) / 10) *
      fatigueMultiplier(getPlayerStamina(state, entity.id)),
    0,
    1,
  );
  const windowScore = clamp(
    (1 - distance / 148) * 0.64 +
      (1 - pressure) * 0.18 +
      (1 - clamp(laneTraffic / 1.3, 0, 1)) * 0.12 +
      facingScore * 0.08 +
      movingScore * 0.08 +
      speedScore * 0.1 +
      athleteScore * 0.16,
    0,
    1.6,
  );

  return {
    defender,
    distance,
    pressure,
    laneTraffic,
    canDunk: distance < 138 && pressure < 0.78 && laneTraffic < 1.08 && facingScore > 0.38,
    windowScore,
  };
}

function ensureStatLine(state: MatchState, playerId: string) {
  if (!state.playerStatsByEntityId[playerId]) {
    state.playerStatsByEntityId[playerId] = { points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0 };
  }
}

function applyEntityPlayer(entity: Entity, player: TeamPlayer) {
  entity.id = player.id;
  entity.name = player.prospect.name;
  entity.categories = { ...player.prospect.categories };
  entity.jumpMs = 0;
  entity.dunkMs = 0;
  entity.blockMs = 0;
  entity.dodgeMs = 0;
  entity.stunMs = 0;
  entity.impactMs = 0;
  entity.actionCooldownMs = 0;
  entity.koMs = 0;
  entity.maxHealth = 10;
  entity.health = entity.maxHealth;
  entity.healthRegenDelayMs = 0;
}

function closeGameIntensity(state: MatchState) {
  const diff = Math.abs(state.score.user - state.score.ai);
  const closeness = 1 - clamp(diff / 8, 0, 1);
  const timePressure = 1 - clamp(state.timeLeftMs / 120_000, 0, 1);
  return clamp(0.45 + closeness * 0.35 + timePressure * 0.2, 0.35, 1);
}

function applyFatigueTick(state: MatchState) {
  const intensity = closeGameIntensity(state);
  const applyTeam = (teamKey: EntityTeam) => {
    const team = state[teamKey];
    const activeIds = new Set(team.activePlayerIds);
    for (const player of team.roster) {
      const current = getPlayerStamina(state, player.id);
      if (activeIds.has(player.id)) {
        const hasBall = state.ball.kind === 'possession' && state.ball.ownerId === player.id;
        const slotWorkload = team.activePlayerIds[0] === player.id ? 0.74 : 0.62;
        const next = decayStamina(player, current, {
          workload: hasBall ? slotWorkload + 0.18 : slotWorkload,
          intensity,
          onCourt: true,
        });
        setPlayerStamina(state, teamKey, player.id, next);
      } else {
        setPlayerStamina(state, teamKey, player.id, recoverBenchStamina(player, current));
      }
    }
  };

  applyTeam('user');
  applyTeam('ai');
}

function replaceBallReference(state: MatchState, previousId: string, nextId: string) {
  if (state.ball.kind === 'possession' && state.ball.ownerId === previousId) {
    state.ball.ownerId = nextId;
  }
}

function createLooseBall(
  pos: Vec2,
  vel?: Vec2,
  opts?: { pickupDelayMs?: number; lastTouchTeam?: EntityTeam | null; bounceMs?: number; source?: LooseBallSource },
): BallState {
  return {
    kind: 'loose',
    pos: { ...pos },
    vel: vel ? { ...vel } : { x: (Math.random() - 0.5) * 180, y: (Math.random() - 0.5) * 180 },
    pickupDelayMs: opts?.pickupDelayMs ?? 260,
    lastTouchTeam: opts?.lastTouchTeam ?? null,
    bounceMs: opts?.bounceMs ?? 260,
    source: opts?.source ?? 'turnover',
  };
}

function isEntityAvailable(entity: Entity) {
  return entity.koMs <= 0;
}

function applyDamage(state: MatchState, attacker: Entity, target: Entity, damage: number, force: Vec2) {
  if (!isEntityAvailable(target)) return false;
  const hadBall = state.ball.kind === 'possession' && state.ball.ownerId === target.id;
  target.health = clamp(target.health - damage, 0, target.maxHealth);
  target.healthRegenDelayMs = 5000;
  target.impactMs = Math.max(target.impactMs, 260);
  target.stunMs = Math.max(target.stunMs, 260);
  target.vel = add(target.vel, force);

  if (hadBall) {
    state.ball = createLooseBall(target.pos, add(force, { x: (Math.random() - 0.5) * 120, y: (Math.random() - 0.5) * 120 }), {
      pickupDelayMs: 340,
      lastTouchTeam: attacker.team,
      bounceMs: 320,
      source: 'turnover',
    });
  }

  if (target.health <= 0) {
    target.koMs = 1850;
    target.stunMs = Math.max(target.stunMs, 820);
    target.vel = scale(force, 0.82);
    addEvent(state, { tone: 'red', text: 'KO!', x: target.pos.x, y: target.pos.y - 26 });
  }

  return hadBall;
}

function cloneBallState(ball: BallState): BallState {
  if (ball.kind === 'possession') return { ...ball };
  if (ball.kind === 'loose') {
    return {
      kind: 'loose',
      pos: { ...ball.pos },
      vel: { ...ball.vel },
      pickupDelayMs: ball.pickupDelayMs,
      lastTouchTeam: ball.lastTouchTeam,
      bounceMs: ball.bounceMs,
      source: ball.source,
    };
  }
  if (ball.kind === 'pass') {
    return {
      kind: 'pass' as const,
      passerId: ball.passerId,
      receiverId: ball.receiverId,
      start: { ...ball.start },
      end: { ...ball.end },
      t: ball.t,
      duration: ball.duration,
      passAccuracy: ball.passAccuracy,
      offset: { ...ball.offset },
    };
  }
  return {
    kind: 'shot' as const,
    shooterId: ball.shooterId,
    start: { ...ball.start },
    target: { ...ball.target },
    t: ball.t,
    duration: ball.duration,
    arcHeight: ball.arcHeight,
    defenseContestId: ball.defenseContestId,
    willBlock: ball.willBlock,
    hitChance: ball.hitChance,
    points: ball.points,
    isDunk: ball.isDunk,
  };
}

function cloneMatchState(state: MatchState): MatchState {
  return {
    ...state,
    user: cloneTeam(state.user),
    ai: cloneTeam(state.ai),
    entities: state.entities.map((entity) => ({
      ...entity,
      pos: { ...entity.pos },
      vel: { ...entity.vel },
      facing: { ...entity.facing },
      dashDir: { ...entity.dashDir },
      categories: { ...entity.categories },
    })),
    ball: cloneBallState(state.ball),
    score: { ...state.score },
    events: state.events.map((event) => ({ ...event })),
    playerStatsByEntityId: Object.fromEntries(
      Object.entries(state.playerStatsByEntityId).map(([playerId, stats]) => [playerId, { ...stats }]),
    ),
    staminaByPlayerId: { ...state.staminaByPlayerId },
    substitutionCooldownMs: { ...state.substitutionCooldownMs },
  };
}

function getEntitySafe(state: MatchState, id?: string | null) {
  if (!id) return null;
  return state.entities.find((candidate) => candidate.id === id) ?? null;
}

function ballPosition(state: MatchState): Vec2 {
  if (state.ball.kind === 'possession') {
    return getEntity(state, state.ball.ownerId).pos;
  }
  if (state.ball.kind === 'loose') return state.ball.pos;
  if (state.ball.kind === 'pass') {
    const t = state.ball.duration ? clamp(state.ball.t / state.ball.duration, 0, 1) : 0;
    return {
      x: state.ball.start.x + (state.ball.end.x - state.ball.start.x) * t,
      y: state.ball.start.y + (state.ball.end.y - state.ball.start.y) * t,
    };
  }
  const t = state.ball.duration ? clamp(state.ball.t / state.ball.duration, 0, 1) : 0;
  return {
    x: state.ball.start.x + (state.ball.target.x - state.ball.start.x) * t,
    y: state.ball.start.y + (state.ball.target.y - state.ball.start.y) * t,
  };
}

function getControlledUserEntity(state: MatchState) {
  if (state.ball.kind === 'possession') {
    const owner = getEntitySafe(state, state.ball.ownerId);
    if (owner?.team === 'user' && isEntityAvailable(owner)) return owner;
  }
  const ballPos = ballPosition(state);
  return getTeamEntities(state, 'user')
    .slice()
    .filter((entity) => isEntityAvailable(entity))
    .sort((a, b) => dist(a.pos, ballPos) - dist(b.pos, ballPos))[0];
}

function drainPlayerStamina(state: MatchState, entity: Entity, amount: number) {
  const current = getPlayerStamina(state, entity.id);
  const player = findPlayer(state[entity.team], entity.id);
  const modifier = player ? getPlayerGameplayModifiers(player, state[entity.team], liveGameContext(state)).staminaUseMultiplier : 1;
  setPlayerStamina(state, entity.team, entity.id, current - amount * modifier);
}

function beginJump(state: MatchState, entity: Entity) {
  if (entity.jumpMs > 0 || entity.stunMs > 0) return;
  entity.jumpMs = 420;
  entity.actionCooldownMs = Math.max(entity.actionCooldownMs, 170);
  drainPlayerStamina(state, entity, 1.1);
}

function beginDunk(state: MatchState, entity: Entity, basket: Vec2) {
  if (entity.stunMs > 0) return false;
  const dir = normalize(sub(basket, entity.pos));
  if (len2(dir) > 0.01) {
    entity.facing = dir;
    entity.dashDir = dir;
  }
  entity.jumpMs = Math.max(entity.jumpMs, 460);
  entity.dunkMs = Math.max(entity.dunkMs, 360);
  entity.impactMs = Math.max(entity.impactMs, 220);
  entity.actionCooldownMs = Math.max(entity.actionCooldownMs, 320);
  drainPlayerStamina(state, entity, 1.8);
  return true;
}

function beginBlock(state: MatchState, entity: Entity, shotTarget: Vec2, shooter?: Entity | null) {
  if (entity.stunMs > 0 || !isEntityAvailable(entity)) return false;
  const leapDir = shooter ? normalize(sub(shooter.pos, entity.pos)) : normalize(sub(shotTarget, entity.pos));
  if (len2(leapDir) > 0.01) {
    entity.facing = leapDir;
    entity.dashDir = leapDir;
  }
  entity.jumpMs = Math.max(entity.jumpMs, 540);
  entity.blockMs = Math.max(entity.blockMs, 420);
  entity.impactMs = Math.max(entity.impactMs, 260);
  entity.actionCooldownMs = Math.max(entity.actionCooldownMs, 340);
  drainPlayerStamina(state, entity, 1.9);
  return true;
}

function beginDodge(state: MatchState, entity: Entity, desiredDir: Vec2) {
  if (entity.dodgeMs > 0 || entity.stunMs > 0 || entity.actionCooldownMs > 0) return;
  const dir = len2(desiredDir) > 0.01 ? normalize(desiredDir) : len2(entity.facing) > 0.01 ? normalize(entity.facing) : { x: entity.team === 'user' ? -1 : 1, y: 0 };
  entity.dashDir = dir;
  entity.facing = dir;
  entity.dodgeMs = 220;
  entity.actionCooldownMs = 620;
  entity.impactMs = 120;
  entity.vel = scale(dir, 360 * (0.72 + entity.categories.speed / 20));
  drainPlayerStamina(state, entity, 2.2);
  addEvent(state, { tone: 'blue', text: 'DODGE', x: entity.pos.x, y: entity.pos.y - 16 });
}

function attemptKarateMove(state: MatchState, attacker: Entity, targetTeam: EntityTeam) {
  if (attacker.stunMs > 0 || attacker.actionCooldownMs > 0 || !isEntityAvailable(attacker)) return false;
  const targetPick = state.entities
    .filter((entity) => entity.team === targetTeam && isEntityAvailable(entity))
    .map((entity) => ({ entity, d: dist(entity.pos, attacker.pos) }))
    .sort((a, b) => a.d - b.d)[0];

  if (!targetPick || targetPick.d > 56) return false;

  const target = targetPick.entity;
  const direction = normalize(sub(target.pos, attacker.pos));
  const attackerProfile = entitySkillBlend(state, attacker);
  const targetProfile = entitySkillBlend(state, target);
  const attackerPlayer = findPlayer(state[attacker.team], attacker.id);
  const attackerMods = attackerPlayer ? getPlayerGameplayModifiers(attackerPlayer, state[attacker.team], liveGameContext(state)) : null;
  const attackScore = (attackerProfile.defense * 0.44 + attackerProfile.speed * 0.24 + attackerProfile.athleticism * 0.2 + attackerProfile.overall * 0.12) * fatigueMultiplier(getPlayerStamina(state, attacker.id));
  const protectScore = (targetProfile.playmaking * 0.38 + targetProfile.speed * 0.18 + targetProfile.hands * 0.24 + targetProfile.overall * 0.2) * fatigueMultiplier(getPlayerStamina(state, target.id));
  const targetHasBall = state.ball.kind === 'possession' && state.ball.ownerId === target.id;
  const difficulty = getDifficultyTuning();
  const stealBias = attacker.team === 'user' ? difficulty.userStealBoost : difficulty.aiStealBoost;
  const successChance = targetHasBall
    ? clamp(
        0.12 +
          (attackScore - protectScore) * 0.045 +
          (56 - targetPick.d) * 0.01 +
          stealBias +
          (attackerMods?.stealBoost ?? 0) * 0.35 +
          (attackerMods?.gamblePenalty ?? 0) * 0.12,
        0.08,
        0.7,
      )
    : clamp(
        0.26 +
          (attackScore - protectScore) * 0.03 +
          (56 - targetPick.d) * 0.008 +
          stealBias * 0.7 +
          (attackerMods?.stealBoost ?? 0) * 0.22 +
          (attackerMods?.gamblePenalty ?? 0) * 0.1,
        0.18,
        0.82,
      );

  attacker.actionCooldownMs = 760;
  attacker.impactMs = 180;
  target.impactMs = 220;
  target.stunMs = Math.max(target.stunMs, targetHasBall ? 360 : 240);
  target.vel = add(target.vel, scale(direction, targetHasBall ? 210 : 170));
  drainPlayerStamina(state, attacker, 2.6);

  if (Math.random() < successChance) {
    const hadBall = applyDamage(state, attacker, target, targetHasBall ? 2.4 : 1.6, scale(direction, targetHasBall ? 180 : 150));
    if (targetHasBall) {
      const stats = state.playerStatsByEntityId[attacker.id];
      if (stats) stats.steals += 1;
      if (target.health > 0 && Math.random() < 0.58) {
        state.ball = { kind: 'possession', ownerId: attacker.id };
        addEvent(state, { tone: 'blue', text: 'STRIP STEAL!', x: attacker.pos.x, y: attacker.pos.y - 18 });
      } else if (!hadBall) {
        state.ball = createLooseBall(target.pos, scale(direction, 160), { pickupDelayMs: 340, lastTouchTeam: attacker.team, bounceMs: 320, source: 'turnover' });
        addEvent(state, { tone: 'red', text: 'BALL LOOSE!', x: target.pos.x, y: target.pos.y - 18 });
      }
      return true;
    }
    addEvent(state, { tone: 'red', text: target.health <= 0 ? 'DROPPED!' : 'KARATE HIT', x: target.pos.x, y: target.pos.y - 18 });
    return true;
  }

  attacker.stunMs = Math.max(attacker.stunMs, 120);
  if (attackerMods?.gamblePenalty) {
    attacker.stunMs = Math.max(attacker.stunMs, 120 + attackerMods.gamblePenalty * 260);
  }
  addEvent(state, { tone: 'red', text: 'WHIFF', x: attacker.pos.x, y: attacker.pos.y - 18 });
  return false;
}

function updateEntityTimers(state: MatchState, dtMs: number) {
  for (const entity of state.entities) {
    entity.jumpMs = Math.max(0, entity.jumpMs - dtMs);
    entity.dunkMs = Math.max(0, entity.dunkMs - dtMs);
    entity.blockMs = Math.max(0, entity.blockMs - dtMs);
    entity.dodgeMs = Math.max(0, entity.dodgeMs - dtMs);
    entity.stunMs = Math.max(0, entity.stunMs - dtMs);
    entity.impactMs = Math.max(0, entity.impactMs - dtMs);
    entity.actionCooldownMs = Math.max(0, entity.actionCooldownMs - dtMs);
    const wasKo = entity.koMs > 0;
    entity.koMs = Math.max(0, entity.koMs - dtMs);
    entity.healthRegenDelayMs = Math.max(0, entity.healthRegenDelayMs - dtMs);
    if (wasKo && entity.koMs === 0) {
      entity.health = Math.max(entity.health, entity.maxHealth * 0.45);
      entity.stunMs = Math.max(entity.stunMs, 180);
      addEvent(state, { tone: 'blue', text: 'BACK UP', x: entity.pos.x, y: entity.pos.y - 22 });
    }
    if (!entity.koMs && entity.healthRegenDelayMs === 0 && entity.health < entity.maxHealth) {
      entity.health = clamp(entity.health + dtMs / 1800, 0, entity.maxHealth);
    }
  }
}

function resolveEntityCollisions(state: MatchState) {
  for (let i = 0; i < state.entities.length; i += 1) {
    for (let j = i + 1; j < state.entities.length; j += 1) {
      const a = state.entities[i];
      const b = state.entities[j];
      const between = sub(b.pos, a.pos);
      const d = len2(between) || 0.0001;
      const minDist = a.radius + b.radius + 1;
      if (d >= minDist) continue;
      const dir = scale(between, 1 / d);
      const overlap = minDist - d;
      a.pos = courtClampPosition(state, add(a.pos, scale(dir, -overlap * 0.5)));
      b.pos = courtClampPosition(state, add(b.pos, scale(dir, overlap * 0.5)));
      a.vel = add(a.vel, scale(dir, -overlap * 6));
      b.vel = add(b.vel, scale(dir, overlap * 6));

      if (state.ball.kind === 'possession') {
        const owner = state.ball.ownerId === a.id ? a : state.ball.ownerId === b.id ? b : null;
        const defender = owner === a ? b : owner === b ? a : null;
        if (owner && defender && owner.team !== defender.team) {
          owner.vel = scale(owner.vel, 0.88);
          owner.impactMs = Math.max(owner.impactMs, 90);
          defender.impactMs = Math.max(defender.impactMs, 110);
        }
      }
    }
  }
}

export function substituteActivePlayer(
  state: MatchState,
  teamKey: EntityTeam,
  slotIndex: 0 | 1,
  nextPlayerId: string,
  reason: 'manual' | 'auto' = 'manual',
) {
  if (state.status !== 'running') return false;
  if (state.resetTimerMs > 0) return false;
  if (state.ball.kind !== 'possession') return false;

  const team = state[teamKey];
  const currentId = team.activePlayerIds[slotIndex];
  if (currentId === nextPlayerId) return false;
  if (team.activePlayerIds.includes(nextPlayerId)) return false;

  const nextPlayer = findPlayer(team, nextPlayerId);
  const currentPlayer = findPlayer(team, currentId);
  if (!nextPlayer || !currentPlayer) return false;

  const entities = getTeamEntities(state, teamKey);
  const entity = entities.find((candidate) => candidate.slotIndex === slotIndex);
  if (!entity) return false;

  const nextActive = [...team.activePlayerIds] as [string, string];
  nextActive[slotIndex] = nextPlayerId;
  team.activePlayerIds = nextActive;
  applyEntityPlayer(entity, nextPlayer);
  ensureStatLine(state, nextPlayerId);
  replaceBallReference(state, currentId, nextPlayerId);
  state.substitutionCooldownMs[teamKey] = reason === 'manual' ? 1600 : 2200;

  const text = reason === 'manual' ? `SUB: ${nextPlayer.prospect.name}` : `${nextPlayer.prospect.name} checks in`;
  addEvent(state, {
    tone: 'blue',
    text,
    x: entity.pos.x,
    y: entity.pos.y - 18,
  });
  return true;
}

function maybeAutoSubstitute(state: MatchState, teamKey: EntityTeam) {
  if (!getCurrentSettings().autoSubstitutions) return;
  if (state.substitutionCooldownMs[teamKey] > 0) return;
  const team = state[teamKey];
  if (benchPlayers(team).length === 0) return;

  const teamEntities = getTeamEntities(state, teamKey);
  for (const slotIndex of [0, 1] as Array<0 | 1>) {
    const entity = teamEntities.find((candidate) => candidate.slotIndex === slotIndex);
    if (entity && (entity.koMs > 0 || entity.health <= entity.maxHealth * 0.32)) {
      const candidate = chooseSubstitution(team, state.staminaByPlayerId, slotIndex);
      if (candidate && substituteActivePlayer(state, teamKey, slotIndex, candidate, 'auto')) return;
    }
  }

  const slotOrder: Array<0 | 1> = getPlayerStamina(state, team.activePlayerIds[0]) <= getPlayerStamina(state, team.activePlayerIds[1]) ? [0, 1] : [1, 0];
  for (const slotIndex of slotOrder) {
    const candidate = chooseSubstitution(team, state.staminaByPlayerId, slotIndex);
    if (candidate && substituteActivePlayer(state, teamKey, slotIndex, candidate, 'auto')) {
      break;
    }
  }
}

function autoMoveToward(from: Vec2, to: Vec2) {
  const dir = normalize(sub(to, from));
  return { moveX: dir.x, moveY: dir.y };
}

function buildAutoUserInput(state: MatchState): PlayerInput {
  const input: PlayerInput = {
    moveX: 0,
    moveY: 0,
    shootPressed: false,
    passPressed: false,
    passTarget: undefined,
    dodgePressed: false,
    jumpPressed: false,
    karatePressed: false,
  };

  const controlled = getControlledUserEntity(state);
  if (!controlled || state.resetTimerMs > 0) return input;

  const liveBallPos = ballPosition(state);
  const targets = basketTargets(state);
  const ballOwner = state.ball.kind === 'possession' ? getEntitySafe(state, state.ball.ownerId) : null;
  const controlledHasBall = state.ball.kind === 'possession' && ballOwner?.team === 'user' && ballOwner.id === controlled.id;
  const teammate = state.entities.find((entity) => entity.team === 'user' && entity.id !== controlled.id) ?? null;
  const nearestDefender = closestOpponent(state, controlled.id, 'ai');
  const pressure = nearestDefender ? clamp(1 - nearestDefender.d / 92, 0, 1) : 0;

  if (controlledHasBall) {
    const driveLaneY = clamp(
      controlled.pos.y + (nearestDefender ? (nearestDefender.entity.pos.y > controlled.pos.y ? -22 : 22) : 0),
      72,
      state.court.height - 72,
    );
    const driveTarget = { x: targets.user.x - 26, y: driveLaneY };
    const toBasketDist = dist(controlled.pos, targets.user);
    const goodShotWindow = clamp(0.04 + controlled.categories.shooting / 140 + (1 - pressure) * 0.08, 0.03, 0.32);
    const shouldPass =
      teammate &&
      (pressure > 0.58 ||
        ((teammate.categories.shooting + teammate.categories.playmaking) > controlled.categories.shooting + controlled.categories.playmaking + 1.2 &&
          Math.random() < 0.16));

    if (pressure > 0.48 && Math.random() < 0.12) {
      input.dodgePressed = true;
    }

    if (shouldPass && teammate) {
      input.passPressed = true;
      input.passTarget = { ...teammate.pos };
      return input;
    }

    if (toBasketDist < state.court.width * 0.36 && Math.random() < goodShotWindow) {
      input.shootPressed = true;
      if (toBasketDist < 170 || pressure > 0.34) input.jumpPressed = true;
      return input;
    }

    if (pressure > 0.7 && nearestDefender && nearestDefender.d < 46 && Math.random() < 0.06) {
      input.karatePressed = true;
    }

    return { ...input, ...autoMoveToward(controlled.pos, driveTarget) };
  }

  if (state.ball.kind === 'loose') {
    const chase = { ...input, ...autoMoveToward(controlled.pos, liveBallPos) };
    const looseDistance = dist(controlled.pos, liveBallPos);
    if (looseDistance < 42 && Math.random() < 0.08) chase.jumpPressed = true;
    if (looseDistance > 54 && Math.random() < 0.045) chase.dodgePressed = true;
    return chase;
  }

  if (ballOwner?.team === 'user') {
    const supportLane = controlled.slotIndex === 0 ? -54 : 54;
    const openSpot = {
      x: clamp(ballOwner.pos.x - 108, state.court.width * 0.54, state.court.width - 98),
      y: clamp(ballOwner.pos.y + supportLane, 70, state.court.height - 70),
    };
    if (dist(controlled.pos, openSpot) > 24) {
      return { ...input, ...autoMoveToward(controlled.pos, openSpot) };
    }
    if (Math.random() < 0.03) input.jumpPressed = true;
    return input;
  }

  if (ballOwner) {
    const closeoutTarget = {
      x: ballOwner.pos.x + 10,
      y: ballOwner.pos.y + (controlled.slotIndex === 0 ? -18 : 18),
    };
    const chase = autoMoveToward(controlled.pos, closeoutTarget);
    input.moveX = chase.moveX;
    input.moveY = chase.moveY;
    const ownerDist = dist(controlled.pos, ballOwner.pos);
    if (ownerDist < 54 && Math.random() < 0.05) input.karatePressed = true;
    if (ownerDist < 92 && Math.random() < 0.04) input.jumpPressed = true;
    if (ownerDist > 68 && Math.random() < 0.035) input.dodgePressed = true;
    return input;
  }

  return { ...input, ...autoMoveToward(controlled.pos, liveBallPos) };
}

export function simulateRestOfMatch(state: MatchState): MatchResult {
  const simState = cloneMatchState(state);
  const maxTicks = 2400;
  for (let tick = 0; tick < maxTicks; tick += 1) {
    const result = updateMatch(simState, buildAutoUserInput(simState), 80);
    if ((result as MatchResult).status === 'ended') {
      return result as MatchResult;
    }
  }

  const winner = simState.score.user === simState.score.ai ? 'draw' : simState.score.user > simState.score.ai ? 'user' : 'ai';
  return {
    status: 'ended',
    winner,
    finalScore: { ...simState.score },
    playerStatsByEntityId: simState.playerStatsByEntityId,
  };
}

export function createMatch(user: TeamState, ai: TeamState, opts?: { courtWidth?: number; courtHeight?: number }): MatchState {
  const userTeam = cloneTeam(user);
  const aiTeam = cloneTeam(ai);
  const court: Court = {
    width: opts?.courtWidth ?? 960,
    height: opts?.courtHeight ?? 540,
  };

  const userBall = pickBallHandler(userTeam);
  const userOff = pickOffBall(userTeam);
  const aiBall = pickBallHandler(aiTeam);
  const aiOff = pickOffBall(aiTeam);

  const entities: Entity[] = [
    {
      id: userBall.id,
      slotIndex: 0,
      jerseyNumber: 1,
      team: 'user',
      name: userBall.prospect.name,
      color: '#2b6cff',
      accentColor: '#a9d1ff',
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      facing: { x: 1, y: 0 },
      dashDir: { x: 1, y: 0 },
      radius: 16,
      jumpMs: 0,
      dunkMs: 0,
      blockMs: 0,
      dodgeMs: 0,
      stunMs: 0,
      impactMs: 0,
      actionCooldownMs: 0,
      koMs: 0,
      health: 10,
      maxHealth: 10,
      healthRegenDelayMs: 0,
      categories: { ...userBall.prospect.categories },
    },
    {
      id: userOff.id,
      slotIndex: 1,
      jerseyNumber: 2,
      team: 'user',
      name: userOff.prospect.name,
      color: '#4aa3ff',
      accentColor: '#d6ecff',
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      facing: { x: 1, y: 0 },
      dashDir: { x: 1, y: 0 },
      radius: 16,
      jumpMs: 0,
      dunkMs: 0,
      blockMs: 0,
      dodgeMs: 0,
      stunMs: 0,
      impactMs: 0,
      actionCooldownMs: 0,
      koMs: 0,
      health: 10,
      maxHealth: 10,
      healthRegenDelayMs: 0,
      categories: { ...userOff.prospect.categories },
    },
    {
      id: aiBall.id,
      slotIndex: 0,
      jerseyNumber: 1,
      team: 'ai',
      name: aiBall.prospect.name,
      color: '#ff3b3b',
      accentColor: '#ffc5c5',
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      facing: { x: -1, y: 0 },
      dashDir: { x: -1, y: 0 },
      radius: 16,
      jumpMs: 0,
      dunkMs: 0,
      blockMs: 0,
      dodgeMs: 0,
      stunMs: 0,
      impactMs: 0,
      actionCooldownMs: 0,
      koMs: 0,
      health: 10,
      maxHealth: 10,
      healthRegenDelayMs: 0,
      categories: { ...aiBall.prospect.categories },
    },
    {
      id: aiOff.id,
      slotIndex: 1,
      jerseyNumber: 2,
      team: 'ai',
      name: aiOff.prospect.name,
      color: '#ff6b6b',
      accentColor: '#ffe1de',
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      facing: { x: -1, y: 0 },
      dashDir: { x: -1, y: 0 },
      radius: 16,
      jumpMs: 0,
      dunkMs: 0,
      blockMs: 0,
      dodgeMs: 0,
      stunMs: 0,
      impactMs: 0,
      actionCooldownMs: 0,
      koMs: 0,
      health: 10,
      maxHealth: 10,
      healthRegenDelayMs: 0,
      categories: { ...aiOff.prospect.categories },
    },
  ];

  userTeam.activePlayerIds = [userBall.id, userOff.id];
  aiTeam.activePlayerIds = [aiBall.id, aiOff.id];

  const staminaByPlayerId: Record<string, number> = {};
  for (const player of [...userTeam.roster, ...aiTeam.roster]) {
    staminaByPlayerId[player.id] = clamp(player.stamina ?? 100, 0, 100);
  }

  const state: MatchState = {
    status: 'running',
    court,
    user: userTeam,
    ai: aiTeam,
    entities,
    ball: { kind: 'possession', ownerId: userBall.id },
    score: { user: 0, ai: 0 },
    timeLeftMs: 120_000,
    resetTimerMs: 0,
    lastScoringTeam: null,
    events: [],
    playerStatsByEntityId: {},
    staminaByPlayerId,
    substitutionCooldownMs: { user: 0, ai: 0 },
    staminaPulseMs: 0,
  };

  for (const player of [...userTeam.roster, ...aiTeam.roster]) {
    ensureStatLine(state, player.id);
  }

  resetPositions(state, 'user');

  return state;
}

function courtClampPosition(state: MatchState, p: Vec2) {
  const pad = 32;
  return {
    x: clamp(p.x, pad, state.court.width - pad),
    y: clamp(p.y, pad, state.court.height - pad),
  };
}

function basketTargets(state: MatchState) {
  const { width, height } = state.court;
  return {
    user: { x: width - 104, y: height * 0.5 },
    ai: { x: 104, y: height * 0.5 },
  };
}

function isThreePointShot(state: MatchState, releasePos: Vec2, basket: Vec2) {
  const releaseDistance = dist(releasePos, basket);
  const lineRadius = Math.max(126, state.court.width * 0.13);
  return releaseDistance >= lineRadius;
}

function resetPositions(state: MatchState, possessionTeam: EntityTeam) {
  const pos = spawnPositions(state.court);
  for (const entity of state.entities) {
    const startsOnLeft = entity.team === 'user';
    entity.pos = {
      x: startsOnLeft ? pos.leftX : pos.rightX,
      y: entity.slotIndex === 0 ? pos.topY : pos.botY,
    };
    entity.facing = startsOnLeft ? { x: 1, y: 0 } : { x: -1, y: 0 };
    entity.dashDir = startsOnLeft ? { x: 1, y: 0 } : { x: -1, y: 0 };
    entity.vel = { x: 0, y: 0 };
    entity.jumpMs = 0;
    entity.dunkMs = 0;
    entity.blockMs = 0;
    entity.dodgeMs = 0;
    entity.stunMs = 0;
    entity.impactMs = 0;
    entity.actionCooldownMs = 0;
  }
}

export function updateMatch(state: MatchState, input: PlayerInput, dtMs: number): MatchState | MatchResult {
  if (state.status !== 'running') {
    return { status: 'ended', winner: 'draw', finalScore: state.score, playerStatsByEntityId: state.playerStatsByEntityId };
  }

  const now = performance.now();
  state.events = state.events.filter((event) => now - event.createdAtMs < 2500);

  state.timeLeftMs = Math.max(0, state.timeLeftMs - dtMs);
  state.substitutionCooldownMs.user = Math.max(0, state.substitutionCooldownMs.user - dtMs);
  state.substitutionCooldownMs.ai = Math.max(0, state.substitutionCooldownMs.ai - dtMs);
  state.staminaPulseMs += dtMs;
  updateEntityTimers(state, dtMs);

  while (state.staminaPulseMs >= 1000) {
    applyFatigueTick(state);
    maybeAutoSubstitute(state, 'user');
    maybeAutoSubstitute(state, 'ai');
    state.staminaPulseMs -= 1000;
  }

  if (state.timeLeftMs <= 0 || state.score.user >= 21 || state.score.ai >= 21) {
    const winner = state.score.user === state.score.ai ? 'draw' : state.score.user > state.score.ai ? 'user' : 'ai';
    state.status = 'ended';
    return { status: 'ended', winner, finalScore: state.score, playerStatsByEntityId: state.playerStatsByEntityId };
  }

    if (state.resetTimerMs > 0) {
      state.resetTimerMs = Math.max(0, state.resetTimerMs - dtMs);
      if (state.resetTimerMs === 0) {
        const nextTeam: EntityTeam = state.lastScoringTeam === 'user' ? 'ai' : 'user';
        resetPositions(state, nextTeam);
        const candidates = state.entities.filter((entity) => entity.team === nextTeam && isEntityAvailable(entity));
        const owner = candidates.sort((a, b) => b.categories.playmaking - a.categories.playmaking)[0] ?? candidates[0];
        if (owner) state.ball = { kind: 'possession', ownerId: owner.id };
        state.lastScoringTeam = null;
      }
      return state;
    }

  const attackMulUser = teamAttackMultiplier(state.user, state);
  const defenseMulUser = teamDefenseMultiplier(state.user, state);
  const attackMulAI = teamAttackMultiplier(state.ai, state);
  const defenseMulAI = teamDefenseMultiplier(state.ai, state);

  let ballOwnerId: string | null = null;
  let ballPossessor: Entity | null = null;
  if (state.ball.kind === 'possession') {
    ballOwnerId = state.ball.ownerId;
    ballPossessor = state.entities.find((entity) => entity.id === ballOwnerId) ?? null;
  }

    const userHasBall = ballPossessor?.team === 'user';
    const aiHasBall = ballPossessor?.team === 'ai';
    const move = normalize({ x: input.moveX, y: input.moveY });
    const userControlled = getControlledUserEntity(state);
    const liveBallPos = ballPosition(state);

    if (userControlled) {
      if (input.jumpPressed) beginJump(state, userControlled);
      if (input.dodgePressed) beginDodge(state, userControlled, len2(move) > 0.01 ? move : userControlled.facing);
      if (input.karatePressed) attemptKarateMove(state, userControlled, 'ai');
    }

    for (const entity of state.entities) {
      if (entity.team !== 'user') continue;
      const profile = entitySkillBlend(state, entity);
      const staminaBoost = fatigueMultiplier(getPlayerStamina(state, entity.id));
      const burst = entity.dodgeMs > 0 ? 1.55 : 1;

      if (entity.koMs > 0) {
        entity.vel = scale(entity.vel, 0.86);
        continue;
      }

      if (userControlled && entity.id === userControlled.id) {
        if (entity.stunMs > 0) {
          entity.vel = scale(entity.vel, 0.82);
          continue;
        }
        if (len2(move) > 0.01 || entity.dodgeMs > 0) {
          const dir = len2(move) > 0.01 ? move : entity.dashDir;
          if (len2(dir) > 0.01) entity.facing = dir;
          const baseSpeed = 235;
          const speed = baseSpeed * (0.46 + (profile.speed / 10) * 0.42 + (profile.athleticism / 10) * 0.12) * staminaBoost * burst;
          entity.vel = scale(dir, speed);
        } else {
          entity.vel = scale(entity.vel, 0.7);
        }
        continue;
      }

      if (state.ball.kind === 'loose') {
        const reboundTarget = {
          x: clamp(liveBallPos.x + 14, state.court.width * 0.42, state.court.width - 84),
          y: clamp(liveBallPos.y + (entity.slotIndex === 0 ? -26 : 26), 72, state.court.height - 72),
        };
        const dir = normalize(sub(reboundTarget, entity.pos));
        if (len2(dir) > 0.01) entity.facing = dir;
        entity.vel = scale(entity.dodgeMs > 0 ? entity.dashDir : dir, 168 * (0.46 + (profile.speed / 10) * 0.3 + (profile.rebounding / 10) * 0.24) * staminaBoost * burst);
        if (dist(entity.pos, liveBallPos) < 46 && Math.random() < 0.06) {
          beginJump(state, entity);
        }
        continue;
      }

      const homeY = state.court.height * 0.5 + (entity.slotIndex === 0 ? -88 : 88);
      const supportTarget = userHasBall
        ? { x: clamp(liveBallPos.x - 110, state.court.width * 0.56, state.court.width - 100), y: homeY }
        : { x: clamp(liveBallPos.x + 36, state.court.width * 0.5, state.court.width - 100), y: liveBallPos.y + (entity.slotIndex === 0 ? -52 : 52) };
      const dir = normalize(sub(supportTarget, entity.pos));
      if (len2(dir) > 0.01) entity.facing = dir;
      entity.vel = scale(entity.dodgeMs > 0 ? entity.dashDir : dir, 132 * (0.48 + (profile.speed / 10) * 0.32 + (profile.playmaking / 10) * 0.2) * staminaBoost * burst);
    }

    const aiAvg = teamAverages(state.ai, state);
    const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
    const aiLowDefense = clamp01((7 - aiAvg.defense) / 7);
    const aiLowShooting = clamp01((7 - aiAvg.shooting) / 7);
    const difficulty = getDifficultyTuning();
    const aiAggression = Math.max(0.78, getAiAggressionMultiplier() + difficulty.aiAggressionBoost);
    const arcadeBias = getArcadeBalanceBias();
    const basketTargetMap = basketTargets(state);
    const aiBasket = basketTargetMap.ai;
    const userBasket = basketTargetMap.user;
    const availableAI = state.entities.filter((entity) => entity.team === 'ai' && isEntityAvailable(entity));
    const availableUser = state.entities.filter((entity) => entity.team === 'user' && isEntityAvailable(entity));
    const aiLooseBallHunterId =
      state.ball.kind === 'possession'
        ? null
        : [...availableAI].sort((a, b) => dist(a.pos, liveBallPos) - dist(b.pos, liveBallPos))[0]?.id ?? null;
    const aiPrimaryDefenderId =
      userHasBall && ballPossessor
        ? [...availableAI].sort((a, b) => dist(a.pos, ballPossessor.pos) - dist(b.pos, ballPossessor.pos))[0]?.id ?? null
        : null;
    const userBallHandler = userHasBall && state.ball.kind === 'possession' ? ballPossessor : null;
    const userOffBall = userBallHandler ? availableUser.find((entity) => entity.id !== userBallHandler.id) ?? null : null;

    for (const entity of state.entities) {
      if (entity.team !== 'ai') continue;
      const profile = entitySkillBlend(state, entity);
      const staminaBoost = fatigueMultiplier(getPlayerStamina(state, entity.id));
      const burst = entity.dodgeMs > 0 ? 1.52 : 1;
      if (entity.koMs > 0) {
        entity.vel = scale(entity.vel, 0.84);
        continue;
      }
      if (entity.stunMs > 0) {
        entity.vel = scale(entity.vel, 0.8);
        continue;
      }

      if (state.ball.kind !== 'possession') {
        if (entity.id === aiLooseBallHunterId) {
          const chaseDir = normalize(sub(liveBallPos, entity.pos));
          if (len2(chaseDir) > 0.01) entity.facing = chaseDir;
          const speed = 188 * (0.46 + (profile.speed / 10) * 0.3 + (profile.rebounding / 10) * 0.24) * staminaBoost * burst;
          entity.vel = scale(entity.dodgeMs > 0 ? entity.dashDir : chaseDir, speed);
          if (dist(entity.pos, liveBallPos) < 52 && Math.random() < 0.012) {
            beginDodge(state, entity, len2(chaseDir) > 0.01 ? chaseDir : { x: -1, y: 0 });
          }
          if (dist(entity.pos, liveBallPos) < 44 && Math.random() < 0.07) {
            beginJump(state, entity);
          }
        } else {
          const zoneTarget = userOffBall ?? availableUser[entity.slotIndex] ?? availableUser[0];
          const shadeTarget = zoneTarget
            ? add(zoneTarget.pos, scale(normalize(sub(userBasket, zoneTarget.pos)), zoneTarget.id === userBallHandler?.id ? 22 : 34))
            : { x: state.court.width * 0.62, y: state.court.height * 0.5 + (entity.slotIndex === 0 ? -68 : 68) };
          const dir = normalize(sub(shadeTarget, entity.pos));
          if (len2(dir) > 0.01) entity.facing = dir;
          entity.vel = scale(entity.dodgeMs > 0 ? entity.dashDir : dir, 154 * (0.42 + (profile.speed / 10) * 0.26 + (profile.defense / 10) * 0.22 + (profile.athleticism / 10) * 0.1) * staminaBoost * burst);
        }
        continue;
      }

      if (aiHasBall && entity.id === ballOwnerId) {
        const toBasket = sub(aiBasket, entity.pos);
        const d = len2(toBasket);
        const teammate = state.entities.find((candidate) => candidate.team === 'ai' && candidate.id !== entity.id && isEntityAvailable(candidate));
        const nearUser = closestOpponent(state, entity.id, 'user');
        const pressure = clamp(1 - (nearUser?.d ?? 120) / 96, 0, 1);
        const selfShotQuality = shotQualityScore(state, entity, aiBasket, 'user');
        const teammateShotQuality = teammate ? shotQualityScore(state, teammate, aiBasket, 'user') : 0;
        const passWindow = teammate ? passWindowScore(state, entity, teammate, 'user') : 0;
        const dunkWindow = dunkWindowProfile(state, entity, aiBasket, 'user');
        const driveTarget = {
          x: aiBasket.x + 28,
          y: clamp(
            entity.pos.y +
              (pressure > 0.24
                ? nearUser && nearUser.entity.pos.y > entity.pos.y
                  ? -34
                  : 34
                : entity.slotIndex === 0
                  ? -14
                  : 14),
            80,
            state.court.height - 80,
          ),
        };
        const driveTraffic = laneTrafficScore(state, entity.pos, driveTarget, 'user', entity.id);
        const dunkIntent =
          dunkWindow.canDunk &&
          (dunkWindow.distance < 108 || (dunkWindow.windowScore > 0.84 && pressure < 0.6)) &&
          Math.random() < (0.016 + dunkWindow.windowScore * 0.02) * (0.94 + aiAggression * 0.12 + arcadeBias * 0.08);
        const shootIntent =
          d < 320 &&
          (selfShotQuality > 0.56 || (d < 138 && pressure < 0.78)) &&
          Math.random() <
            (0.004 + selfShotQuality * 0.018 + (d < 138 ? 0.018 : 0)) * (1 + aiLowShooting * 0.08 + (aiAggression - 1) * 0.22) * (0.88 + staminaBoost * 0.16);
        const passIntent =
          teammate &&
          passWindow > 0.32 &&
          (teammateShotQuality > selfShotQuality + 0.1 || (pressure > 0.48 && driveTraffic > 0.72) || (aiLowShooting > 0.25 && teammateShotQuality >= selfShotQuality)) &&
          Math.random() < 0.004 + passWindow * 0.016 + pressure * 0.008 + Math.max(0, aiAggression - 1) * 0.004;

        if (pressure > 0.52 && driveTraffic > 0.66 && Math.random() < 0.03 + Math.max(0, aiAggression - 1) * 0.015) {
          beginDodge(state, entity, { x: -1, y: nearUser && nearUser.entity.pos.y > entity.pos.y ? -0.85 : 0.85 });
        }

        if ((dunkIntent || shootIntent) && state.resetTimerMs === 0) {
          const defender = closestOpponent(state, entity.id, 'user');
          const attackerProfile = entitySkillBlend(state, entity);
          const defenderProfile = defender?.entity ? entitySkillBlend(state, defender.entity) : null;
          const defenderSkill = (defenderProfile?.defense ?? 5) * fatigueMultiplier(getPlayerStamina(state, defender?.entity.id ?? ''));
          const shooterSkill = attackerProfile.shooting * staminaBoost;
          const distFactor = clamp(d / 520, 0, 1);
          const isDunk = dunkIntent || (entity.jumpMs > 0 && d < 118);
          const points = isDunk ? 2 : isThreePointShot(state, entity.pos, aiBasket) ? 3 : 2;
          const baseHitChance = clamp(
            0.08 + (shooterSkill / 10) * 0.68 * attackMulAI + (attackerProfile.overall / 10) * 0.08 - (defenderSkill / 10) * 0.3 * defenseMulUser - distFactor * 0.22 + difficulty.aiShotBoost + arcadeBias * 0.018,
            0.04,
            0.9,
          );
          const hitChance = isDunk ? clamp(baseHitChance + 0.28, 0.58, 0.98) : baseHitChance;
          const blockChance = clamp(
            0.05 +
              ((defenderSkill - shooterSkill) / 10) * 0.28 * defenseMulUser +
              ((defenderProfile?.size ?? 5) / 10) * 0.08 +
              (defender?.entity.jumpMs ? 0.08 : 0) +
              (isDunk ? 0.08 : 0),
            0.02,
            0.62,
          );
          if (isDunk) beginDunk(state, entity, aiBasket);
          else if (!entity.jumpMs) beginJump(state, entity);
          state.ball = {
            kind: 'shot',
            shooterId: entity.id,
            start: { ...entity.pos },
            target: aiBasket,
            t: 0,
            duration: isDunk ? 380 : 720,
            arcHeight: isDunk ? 28 : 70 + (entity.categories.shooting / 10) * 30,
            defenseContestId: defender?.entity.id,
            willBlock: defender?.entity ? Math.random() < blockChance : false,
            hitChance,
            points,
            isDunk,
          };
          addEvent(state, { tone: 'gold', text: isDunk ? 'DUNK' : points === 3 ? 'DEEP SHOT' : 'SHOT', x: entity.pos.x, y: entity.pos.y });
          entity.vel = { x: 0, y: 0 };
          continue;
        }

        if (teammate && passIntent && state.resetTimerMs === 0) {
          const passPlan = passOutcomeProfile(state, entity, teammate, teammate.pos, 'user');
          if (passPlan.interceptor && Math.random() < passPlan.interceptChance) {
            const defenderStats = state.playerStatsByEntityId[passPlan.interceptor.entity.id];
            if (defenderStats) defenderStats.steals += 1;
            state.ball = { kind: 'possession', ownerId: passPlan.interceptor.entity.id };
            addEvent(state, { tone: 'red', text: 'JUMPED LANE!', x: passPlan.interceptor.entity.pos.x, y: passPlan.interceptor.entity.pos.y });
            entity.vel = { x: 0, y: 0 };
            continue;
          }
          const lead = add(teammate.pos, scale(teammate.vel, (passPlan.duration / 1000) * 0.62));
          const offset = { x: (Math.random() - 0.5) * passPlan.spread, y: (Math.random() - 0.5) * passPlan.spread };
          state.ball = {
            kind: 'pass',
            passerId: entity.id,
            receiverId: teammate.id,
            start: { ...entity.pos },
            end: add(lead, offset),
            t: 0,
            duration: passPlan.duration,
            passAccuracy: passPlan.passAccuracy,
            offset,
          };
          addEvent(state, { tone: 'blue', text: 'PASS', x: teammate.pos.x, y: teammate.pos.y });
          entity.vel = { x: 0, y: 0 };
          continue;
        }

        const driveDir = normalize(sub(driveTarget, entity.pos));
        if (len2(driveDir) > 0.01) entity.facing = driveDir;
        const settleFactor = d < 148 && selfShotQuality > 0.48 && pressure < 0.3 ? 0.78 : 1;
        entity.vel = scale(
          entity.dodgeMs > 0 ? entity.dashDir : driveDir,
          184 * (0.42 + (profile.playmaking / 10) * 0.26 + (profile.speed / 10) * 0.18 + (profile.athleticism / 10) * 0.14) * staminaBoost * burst * settleFactor,
        );
        continue;
      }

      if (aiHasBall && state.ball.kind === 'possession') {
        const carrier = ballPossessor;
        if (carrier) {
          const supportTarget = {
            x: clamp(carrier.pos.x + 92, aiBasket.x + 104, state.court.width - 96),
            y: clamp(carrier.pos.y + (entity.slotIndex === 0 ? -78 : 78), 76, state.court.height - 76),
          };
          const dir = normalize(sub(supportTarget, entity.pos));
          if (len2(dir) > 0.01) entity.facing = dir;
          const speed = 144 * (0.44 + (profile.speed / 10) * 0.32 + (profile.playmaking / 10) * 0.12 + (profile.athleticism / 10) * 0.12) * staminaBoost * burst;
          entity.vel = scale(entity.dodgeMs > 0 ? entity.dashDir : dir, dist(entity.pos, supportTarget) < 26 ? speed * 0.72 : speed);
        }
        continue;
      }

      const offensive = availableUser;
      let target: Entity | undefined = offensive[0];
      let bestScore = -Infinity;
      for (const off of offensive) {
        const offProfile = entitySkillBlend(state, off);
        const dd = dist(off.pos, entity.pos);
        const proximity = 1 - clamp(dd / 520, 0, 1);
        const threat = (offProfile.shooting * 0.34 + offProfile.playmaking * 0.24 + offProfile.speed * 0.18 + offProfile.overall * 0.12 + offProfile.athleticism * 0.12) * (0.6 + aiLowDefense * 0.6);
        const score = threat * 0.7 + proximity * 0.3;
        if (score > bestScore) {
          bestScore = score;
          target = off;
        }
      }

      if (userBallHandler) {
        target = entity.id === aiPrimaryDefenderId ? userBallHandler : userOffBall ?? userBallHandler;
      }

      if (target) {
        const basketShade = add(target.pos, scale(normalize(sub(userBasket, target.pos)), target.id === userBallHandler?.id ? 24 : 34));
        const containTarget =
          userBallHandler && target.id !== userBallHandler.id
            ? {
                x: lerp(basketShade.x, userBallHandler.pos.x, 0.24),
                y: lerp(basketShade.y, userBallHandler.pos.y, 0.22),
              }
            : basketShade;
        const dir = normalize(sub(containTarget, entity.pos));
        if (len2(dir) > 0.01) entity.facing = dir;
        const speed = 168 * (0.42 + (profile.speed / 10) * 0.24 + (profile.defense / 10) * 0.24 + (profile.athleticism / 10) * 0.1) * (0.9 + aiLowDefense * 0.25) * staminaBoost * burst;
        entity.vel = scale(entity.dodgeMs > 0 ? entity.dashDir : dir, speed);
        if (userHasBall && state.ball.kind === 'possession' && target.id === state.ball.ownerId && dist(target.pos, entity.pos) < 52 && Math.random() < 0.022) {
          attemptKarateMove(state, entity, 'user');
        }
      }
    }

    for (const entity of state.entities) {
      entity.pos = courtClampPosition(state, add(entity.pos, scale(entity.vel, dtMs / 1000)));
    }
    resolveEntityCollisions(state);

  const targets = basketTargets(state);
  if (state.ball.kind === 'possession') {
    const owner = state.entities.find((entity) => entity.id === state.ball.ownerId);
    if (owner && isEntityAvailable(owner)) state.ball = { kind: 'possession', ownerId: owner.id };
    else if (owner) state.ball = createLooseBall(owner.pos, { x: (Math.random() - 0.5) * 150, y: (Math.random() - 0.5) * 150 }, { pickupDelayMs: 360, lastTouchTeam: owner.team, source: 'turnover' });
  }

  if (input.passPressed && userHasBall && state.ball.kind === 'possession' && userControlled && ballPossessor?.id === userControlled.id) {
    const passer = ballPossessor!;
    const receiver = state.entities.find((entity) => entity.team === 'user' && entity.id !== passer.id);
    if (receiver) {
      const receiverTarget = input.passTarget ? input.passTarget : receiver.pos;
      const passPlan = passOutcomeProfile(state, passer, receiver, receiverTarget, 'ai');
      if (passPlan.interceptor && Math.random() < passPlan.interceptChance) {
        const defenderStats = state.playerStatsByEntityId[passPlan.interceptor.entity.id];
        if (defenderStats) defenderStats.steals += 1;
        state.ball = { kind: 'possession', ownerId: passPlan.interceptor.entity.id };
        addEvent(state, { tone: 'red', text: 'JUMPED LANE!', x: passPlan.interceptor.entity.pos.x, y: passPlan.interceptor.entity.pos.y });
      } else {
        const leadFactor = input.passTarget ? 0.28 : 0.64;
        const lead = add(receiverTarget, scale(receiver.vel, (passPlan.duration / 1000) * leadFactor));
        const offset = { x: (Math.random() - 0.5) * passPlan.spread, y: (Math.random() - 0.5) * passPlan.spread };
        state.ball = {
          kind: 'pass',
          passerId: passer.id,
          receiverId: receiver.id,
          start: { ...passer.pos },
          end: add(lead, offset),
          t: 0,
          duration: passPlan.duration,
          passAccuracy: passPlan.passAccuracy,
          offset,
        };
        addEvent(state, { tone: 'blue', text: 'PASS', x: receiver.pos.x, y: receiver.pos.y });
      }
    }
  }

  if (input.shootPressed && userHasBall && state.ball.kind === 'possession' && userControlled && ballPossessor?.id === userControlled.id) {
    const shooter = ballPossessor!;
    const defender = closestOpponent(state, shooter.id, 'ai')?.entity;
    const shooterFatigue = fatigueMultiplier(getPlayerStamina(state, shooter.id));
    const defenderFatigue = fatigueMultiplier(getPlayerStamina(state, defender?.id ?? ''));
    const difficulty = getDifficultyTuning();
    const arcadeBias = getArcadeBalanceBias();
    const shooterProfile = entitySkillBlend(state, shooter);
    const defenderProfile = defender ? entitySkillBlend(state, defender) : null;
    const target = targets.user;
    const d = dist(shooter.pos, target);
    const distFactor = clamp(d / 520, 0, 1);
    const shooterSkill = shooterProfile.shooting * shooterFatigue;
    const defenderSkill = (defenderProfile?.defense ?? 5) * defenderFatigue;
    const dunkWindow = dunkWindowProfile(state, shooter, target, 'ai');
    const isDunk = dunkWindow.canDunk && (dunkWindow.distance < 112 || dunkWindow.windowScore > 0.82);
    const points = isDunk ? 2 : isThreePointShot(state, shooter.pos, target) ? 3 : 2;

    const baseHitChance = clamp(
      0.08 + (shooterSkill / 10) * 0.68 * attackMulUser + (shooterProfile.overall / 10) * 0.08 - (defenderSkill / 10) * 0.3 * defenseMulAI - distFactor * 0.22 + difficulty.userShotBoost + arcadeBias * 0.018,
      0.04,
      0.9,
    );
    const hitChance = isDunk ? clamp(baseHitChance + 0.28, 0.58, 0.98) : baseHitChance;
    const blockChance = clamp(
      0.05 +
        ((defenderSkill - shooterSkill) / 10) * 0.28 * defenseMulAI +
        ((defenderProfile?.size ?? 5) / 10) * 0.08 +
        (defender?.jumpMs ? 0.08 : 0) +
        (isDunk ? 0.08 : 0),
      0.02,
      0.62,
    );
    if (isDunk) beginDunk(state, shooter, target);
    else if (!shooter.jumpMs) beginJump(state, shooter);

    state.ball = {
      kind: 'shot',
      shooterId: shooter.id,
      start: { ...shooter.pos },
      target,
      t: 0,
      duration: isDunk ? 380 : 740,
      arcHeight: isDunk ? 28 : 85 + (shooter.categories.shooting / 10) * 35,
      defenseContestId: defender?.id,
      willBlock: defender ? Math.random() < blockChance : false,
      hitChance,
      points,
      isDunk,
    };
    addEvent(state, { tone: 'gold', text: isDunk ? 'DUNK' : points === 3 ? 'DEEP SHOT' : 'SHOT', x: shooter.pos.x, y: shooter.pos.y });
  }

  if (state.ball.kind === 'pass') {
    const receiver = getEntitySafe(state, state.ball.receiverId);
    if (receiver) {
      const remainingSeconds = Math.max(0.08, (state.ball.duration - state.ball.t) / 1000);
      const desiredEnd = add(add(receiver.pos, scale(receiver.vel, remainingSeconds * 0.65)), state.ball.offset);
      const correction = clamp((dtMs / 1000) * 8, 0.06, 0.32);
      state.ball.end = {
        x: lerp(state.ball.end.x, desiredEnd.x, correction),
        y: lerp(state.ball.end.y, desiredEnd.y, correction),
      };
    }
    state.ball.t += dtMs;
    const t = clamp(state.ball.t / state.ball.duration, 0, 1);
    if (t >= 1) {
      const receiverId = state.ball.receiverId;
      const endPos = { ...state.ball.end };
      const passerId = state.ball.passerId;
      const complete = Math.random() < state.ball.passAccuracy;

      if (!complete) {
        const passer = getEntitySafe(state, passerId);
        addEvent(state, { tone: 'red', text: 'BAD PASS', x: endPos.x, y: endPos.y });
        state.ball = createLooseBall(
          {
            x: endPos.x + (Math.random() - 0.5) * 24,
            y: endPos.y + (Math.random() - 0.5) * 24,
          },
          {
            x: (Math.random() - 0.5) * 130,
            y: (Math.random() - 0.5) * 130,
          },
          { pickupDelayMs: 220, bounceMs: 240, lastTouchTeam: passer?.team ?? null, source: 'pass' },
        );
      } else {
        const passerStats = state.playerStatsByEntityId[passerId];
        if (passerStats) passerStats.assists += 1;
        state.ball = { kind: 'possession', ownerId: receiverId };
        addEvent(state, { tone: 'green', text: 'Great Pass!', x: endPos.x, y: endPos.y });
      }
    }
  }

  if (state.ball.kind === 'shot') {
    state.ball.t += dtMs;
    const t = clamp(state.ball.t / state.ball.duration, 0, 1);
    if (t >= 1) {
      const willBlock = state.ball.willBlock;
      const hitChance = state.ball.hitChance;
      const shotPoints = Math.max(2, Math.min(3, state.ball.points));
      const shooterId = state.ball.shooterId;
      const shooter = state.entities.find((entity) => entity.id === shooterId);
      const defense = closestOpponent(state, shooterId, shooter?.team === 'user' ? 'ai' : 'user')?.entity;

      if (willBlock) {
        const blockId = state.ball.defenseContestId;
        const blocker = getEntitySafe(state, blockId) ?? defense ?? null;
        const blockerStats = blocker ? state.playerStatsByEntityId[blocker.id] : undefined;
        if (blockerStats) blockerStats.blocks += 1;
        if (blocker) {
          beginBlock(state, blocker, state.ball.target, shooter);
          blocker.vel = add(blocker.vel, scale(blocker.facing, 34));
        }
        if (shooter) {
          shooter.impactMs = Math.max(shooter.impactMs, 220);
          shooter.stunMs = Math.max(shooter.stunMs, 140);
          shooter.vel = add(shooter.vel, { x: blocker?.team === 'user' ? -24 : 24, y: (Math.random() - 0.5) * 28 });
        }
        addEvent(state, { tone: 'red', text: 'SWAT BLOCK!', x: blocker?.pos.x ?? defense?.pos.x ?? state.ball.target.x, y: blocker?.pos.y ?? defense?.pos.y ?? state.ball.target.y });
        state.ball = createLooseBall(
          {
            x: blocker ? blocker.pos.x + blocker.facing.x * 10 : state.ball.target.x + (Math.random() - 0.5) * 28,
            y: blocker ? blocker.pos.y - 8 : state.ball.target.y + (Math.random() - 0.5) * 28,
          },
          blocker ? blockRejectionVelocity(state, blocker, shooter ?? null) : { x: (Math.random() - 0.5) * 240, y: (Math.random() - 0.5) * 180 },
          { pickupDelayMs: 460, lastTouchTeam: shooter?.team ?? null, bounceMs: 620, source: 'shot' },
        );
      } else if (Math.random() < hitChance) {
        const isUserShot = shooter?.team === 'user';
        if (isUserShot) state.score.user += shotPoints;
        else state.score.ai += shotPoints;

        const shooterStats = shooter ? state.playerStatsByEntityId[shooter.id] : undefined;
        if (shooterStats) shooterStats.points += shotPoints;
        state.lastScoringTeam = isUserShot ? 'user' : 'ai';

        addEvent(
          state,
          {
            tone: 'green',
            text: state.ball.isDunk ? (isUserShot ? `DUNK! +${shotPoints}` : `Rival DUNK! +${shotPoints}`) : isUserShot ? `Great Shot! +${shotPoints}` : `Rival Great Shot! +${shotPoints}`,
            x: state.ball.target.x,
            y: state.ball.target.y,
          },
        );
        state.resetTimerMs = 900;
      } else {
        addEvent(state, { tone: 'red', text: state.ball.isDunk ? 'DUNK MISS' : 'MISS', x: state.ball.target.x, y: state.ball.target.y });
        const shooterTeam = shooter?.team ?? null;
        const shotPoints = state.ball.points;
        state.ball = createLooseBall(
          {
            x: state.ball.target.x + (Math.random() - 0.5) * 54,
            y: state.ball.target.y + (Math.random() - 0.5) * 54,
          },
          missCaromVelocity(state.ball.target, shooter ?? null, shotPoints),
          { pickupDelayMs: 440, lastTouchTeam: shooterTeam, bounceMs: 460, source: 'shot' },
        );
      }
    }
  }

  if (state.ball.kind === 'loose') {
    const pad = 30;
    const decay = Math.pow(state.ball.source === 'shot' ? 0.991 : 0.988, dtMs / 16.667);
    let nextPos = add(state.ball.pos, scale(state.ball.vel, dtMs / 1000));
    let nextVel = scale(state.ball.vel, decay);

    if (nextPos.x < pad || nextPos.x > state.court.width - pad) {
      nextPos.x = clamp(nextPos.x, pad, state.court.width - pad);
      nextVel.x *= state.ball.source === 'shot' ? -0.78 : -0.72;
    }
    if (nextPos.y < pad || nextPos.y > state.court.height - pad) {
      nextPos.y = clamp(nextPos.y, pad, state.court.height - pad);
      nextVel.y *= state.ball.source === 'shot' ? -0.78 : -0.72;
    }

    if (Math.abs(nextVel.x) < 8) nextVel.x = 0;
    if (Math.abs(nextVel.y) < 8) nextVel.y = 0;

    state.ball.pos = nextPos;
    state.ball.vel = nextVel;
    state.ball.pickupDelayMs = Math.max(0, state.ball.pickupDelayMs - dtMs);
    state.ball.bounceMs = Math.max(0, state.ball.bounceMs - dtMs);

    if (state.ball.pickupDelayMs <= 0) {
      const candidates = state.entities
        .filter((entity) => isEntityAvailable(entity))
        .slice()
        .sort(
          (a, b) =>
            reboundContestScore(state, b, nextPos, nextVel, state.ball.lastTouchTeam, state.ball.source) -
            reboundContestScore(state, a, nextPos, nextVel, state.ball.lastTouchTeam, state.ball.source),
        );
      const best = candidates[0];
      const second = candidates[1];
      const pickupRadius = len2(nextVel) > 110 ? 18 : state.ball.source === 'shot' ? 26 : 30;
      const bestDistance = best ? dist(best.pos, nextPos) : Infinity;
      const secondDistance = second ? dist(second.pos, nextPos) : Infinity;
      const bestScore = best ? reboundContestScore(state, best, nextPos, nextVel, state.ball.lastTouchTeam, state.ball.source) : -Infinity;
      const secondScore = second ? reboundContestScore(state, second, nextPos, nextVel, state.ball.lastTouchTeam, state.ball.source) : -Infinity;
      const offensivePenalty = state.ball.source === 'shot' && best?.team === state.ball.lastTouchTeam ? 4 : 0;
      if (
        best &&
        bestDistance <= pickupRadius + (best.jumpMs > 0 ? 10 : 0) - offensivePenalty &&
        bestScore > secondScore - (state.ball.source === 'shot' && best.team === state.ball.lastTouchTeam ? -0.06 : 0.08) &&
        bestDistance <= secondDistance + (state.ball.source === 'shot' ? 12 : 18)
      ) {
        const changedHands = state.ball.lastTouchTeam != null && best.team !== state.ball.lastTouchTeam;
        const stats = state.playerStatsByEntityId[best.id];
        if (stats) stats.rebounds += 1;
        state.ball = { kind: 'possession', ownerId: best.id };
        addEvent(state, { tone: changedHands ? 'green' : 'blue', text: changedHands ? 'REBOUND WIN' : 'SECURED', x: best.pos.x, y: best.pos.y });
      }
    }
  }

  return state;
}
