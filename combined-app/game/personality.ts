import { overallToTenScale } from './ratings';
import type {
  DraftStandingRow,
  FranchiseState,
  FreeAgencyRole,
  LeagueNewsPost,
  LockerRoomStatus,
  PlayerMoodStatus,
  PlayerPersonality,
  Rating10,
  TeamPlayer,
  TeamState,
} from './types';

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

function seededRange(seed: string, min: number, max: number) {
  const span = max - min + 1;
  return min + (hashSeed(seed) % Math.max(1, span));
}

function standingsRowForTeam(franchise: FranchiseState | null | undefined, teamId: string) {
  if (!franchise?.seasonStandings?.length) return undefined;
  return franchise.seasonStandings.find((row) => row.teamId === teamId);
}

function gamesPlayed(player: TeamPlayer) {
  return player.seasonStats.matchesPlayed + player.playoffStats.matchesPlayed;
}

function teamWinRate(row?: DraftStandingRow) {
  if (!row) return 0.5;
  const total = row.wins + row.losses;
  return total > 0 ? row.wins / total : 0.5;
}

function streakBonus(row?: DraftStandingRow) {
  if (!row || row.streak === '—' || row.streak === 'â€”') return 0;
  return row.streak === 'W' ? row.streakCount * 2.8 : row.streakCount * -3.2;
}

function roleRank(team: TeamState, playerId: string) {
  const sorted = team.roster.slice().sort((a, b) => b.prospect.overall - a.prospect.overall);
  return Math.max(0, sorted.findIndex((player) => player.id === playerId));
}

export function createPlayerPersonality(player: Pick<TeamPlayer, 'prospect'> | { prospect: { id: string; overall: number; potential: number; age: number } }): PlayerPersonality {
  const { prospect } = player;
  const starBias = prospect.overall >= 88 ? 1 : prospect.overall <= 70 ? -1 : 0;
  const veteranBias = prospect.age >= 27 ? 1 : 0;
  const prospectBias = prospect.potential >= 8 ? 1 : 0;

  return {
    ego: clamp(seededRange(`${prospect.id}:ego`, 2, 9) + starBias, 1, 10),
    loyalty: clamp(seededRange(`${prospect.id}:loyalty-personality`, 3, 9) + veteranBias, 1, 10),
    workEthic: clamp(seededRange(`${prospect.id}:work`, 3, 10) + prospectBias, 1, 10),
    clutchFactor: clamp(seededRange(`${prospect.id}:clutch`, 2, 9) + (prospect.overall >= 84 ? 1 : 0), 1, 10),
    temperament: clamp(seededRange(`${prospect.id}:temperament`, 2, 9) + (prospect.age <= 21 ? 1 : 0), 1, 10),
  };
}

export function normalizePlayerDynamics(player: TeamPlayer): TeamPlayer {
  const personality = player.personality ?? createPlayerPersonality(player);
  const morale = typeof player.morale === 'number' ? clamp(player.morale, 0, 100) : clamp(46 + player.happiness * 5 - player.desireToLeave * 2, 20, 90);
  return {
    ...player,
    personality,
    morale,
    status: player.status ?? getPlayerStatusLabel(morale),
    recentTradeAdjustment: typeof player.recentTradeAdjustment === 'number' ? clamp(player.recentTradeAdjustment, -20, 20) : 0,
  };
}

export function getPlayerStatusLabel(morale: number): PlayerMoodStatus {
  if (morale >= 67) return 'happy';
  if (morale <= 38) return 'unhappy';
  return 'neutral';
}

export function getLockerRoomStatus(chemistry: number): LockerRoomStatus {
  if (chemistry >= 76) return 'elite';
  if (chemistry >= 58) return 'steady';
  if (chemistry >= 40) return 'tense';
  return 'volatile';
}

export function describeLockerRoom(status: LockerRoomStatus) {
  if (status === 'elite') return 'Connected';
  if (status === 'steady') return 'Stable';
  if (status === 'tense') return 'Shaky';
  return 'Combustible';
}

export function getActualRole(team: TeamState, playerId: string): FreeAgencyRole {
  if (team.activePlayerIds.includes(playerId)) return 'starter';
  const rank = roleRank(team, playerId);
  return rank <= 5 ? 'rotation' : 'bench';
}

export function getExpectedRole(player: TeamPlayer): FreeAgencyRole {
  if (player.personality.ego >= 7 || player.prospect.overall >= 86) return 'starter';
  if (player.personality.workEthic <= 4 && player.personality.ego <= 5) return 'bench';
  if (player.prospect.overall >= 78 || player.personality.workEthic >= 7) return 'rotation';
  return 'bench';
}

export function getPlayerDemandList(player: TeamPlayer, team?: TeamState, franchise?: FranchiseState) {
  const demands = new Set<string>();
  const expectedRole = getExpectedRole(player);
  const winRate = team && franchise ? teamWinRate(standingsRowForTeam(franchise, team.id)) : 0.5;
  const competitiveness = (player.personality.workEthic + player.personality.clutchFactor + Math.max(0, player.personality.ego - 4)) / 3;

  if (expectedRole === 'starter') demands.add('Wants to be a starter');
  if (player.personality.ego >= 8 || player.prospect.overall >= 88) demands.add('Wants max contract');
  if (competitiveness >= 5.6 || winRate < 0.45) demands.add('Wants a winning team');
  if (player.personality.loyalty >= 8 && player.yearsWithTeam >= 2) demands.add('Values continuity');
  if (player.personality.workEthic <= 4) demands.add('Comfortable with lighter role');

  return [...demands];
}

function continuityScore(team: TeamState) {
  if (!team.roster.length) return 0;
  const total = team.roster.reduce((sum, player) => {
    const roleBonus = team.activePlayerIds.includes(player.id) ? 10 : 4;
    return sum + clamp(player.yearsWithTeam * 8 + gamesPlayed(player) * 1.4 + roleBonus, 0, 100);
  }, 0);
  return total / team.roster.length;
}

function personalityBlendScore(team: TeamState) {
  if (team.roster.length <= 1) return 68;
  let pairScore = 0;
  let pairCount = 0;
  const players = team.roster.map(normalizePlayerDynamics);

  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i];
      const b = players[j];
      const workHarmony = 1 - Math.abs(a.personality.workEthic - b.personality.workEthic) / 10;
      const temperamentHarmony = 1 - Math.abs(a.personality.temperament - b.personality.temperament) / 10;
      const loyaltyHarmony = 1 - Math.abs(a.personality.loyalty - b.personality.loyalty) / 12;
      const egoPenalty = Math.max(0, a.personality.ego + b.personality.ego - 15) * 3.6;
      pairScore += 46 + workHarmony * 18 + temperamentHarmony * 12 + loyaltyHarmony * 8 - egoPenalty;
      pairCount += 1;
    }
  }

  const highEgoCount = players.filter((player) => player.personality.ego >= 8).length;
  const volatileCount = players.filter((player) => player.personality.temperament >= 8).length;
  const balancePenalty = Math.max(0, highEgoCount - 2) * 7 + Math.max(0, volatileCount - 2) * 5;
  return clamp(pairScore / Math.max(1, pairCount) - balancePenalty, 20, 92);
}

function playerContractMood(player: TeamPlayer) {
  const base = overallToTenScale(player.prospect.overall) * 8;
  const contractSecurity = player.contract.seasonsLeft * 5;
  const salaryComfort = clamp((player.contract.salary / Math.max(18_000, 12_000 + player.prospect.overall * 600)) * 18, 0, 18);
  return clamp(base + contractSecurity + salaryComfort, 18, 96);
}

function expectedRoleMood(player: TeamPlayer, actualRole: FreeAgencyRole) {
  const expectedRole = getExpectedRole(player);
  if (expectedRole === actualRole) return 10;
  if (expectedRole === 'starter' && actualRole === 'bench') return -18 - player.personality.ego * 1.4;
  if (expectedRole === 'starter' && actualRole === 'rotation') return -8 - player.personality.ego * 0.8;
  if (expectedRole === 'rotation' && actualRole === 'bench') return -10 + (5 - player.personality.workEthic) * 1.2;
  if (expectedRole === 'bench' && actualRole !== 'bench') return 6;
  return -3;
}

export function calculatePlayerMorale(player: TeamPlayer, team: TeamState, row?: DraftStandingRow, chemistry?: number) {
  const nextPlayer = normalizePlayerDynamics(player);
  const actualRole = getActualRole(team, player.id);
  const chemistryValue = chemistry ?? team.chemistry ?? 55;
  const winRate = teamWinRate(row);
  const contractMood = playerContractMood(nextPlayer);
  const roleMood = expectedRoleMood(nextPlayer, actualRole);
  const competitiveness = (nextPlayer.personality.workEthic + nextPlayer.personality.clutchFactor + nextPlayer.personality.ego) / 3;
  const winningBias = competitiveness >= 6 ? (winRate - 0.5) * 34 : (winRate - 0.5) * 18;

  const morale =
    42 +
    nextPlayer.happiness * 3.6 -
    nextPlayer.desireToLeave * 3.1 +
    (nextPlayer.personality.loyalty - 5) * 2.2 +
    (nextPlayer.personality.workEthic - 5) * 1.8 +
    contractMood * 0.1 +
    roleMood +
    winningBias +
    streakBonus(row) +
    (chemistryValue - 50) * 0.36 +
    nextPlayer.recentTradeAdjustment;

  return clamp(Math.round(morale), 8, 98);
}

export function computeTeamChemistry(team: TeamState, row?: DraftStandingRow, moraleSource?: number) {
  const personality = personalityBlendScore(team);
  const continuity = continuityScore(team);
  const winBoost = teamWinRate(row) * 20;
  const streak = streakBonus(row);
  const morale = moraleSource ?? (team.roster.length ? team.roster.reduce((sum, player) => sum + normalizePlayerDynamics(player).morale, 0) / team.roster.length : 55);
  return clamp(Math.round(18 + personality * 0.42 + continuity * 0.18 + morale * 0.18 + winBoost + streak), 8, 98);
}

export function computePersonalityFit(team: TeamState, player: TeamPlayer) {
  const normalizedTeam = team.roster.map(normalizePlayerDynamics);
  const highEgoCount = normalizedTeam.filter((entry) => entry.personality.ego >= 8).length;
  const workEthicAverage =
    normalizedTeam.length
      ? normalizedTeam.reduce((sum, entry) => sum + entry.personality.workEthic, 0) / normalizedTeam.length
      : 6;
  const temperamentAverage =
    normalizedTeam.length
      ? normalizedTeam.reduce((sum, entry) => sum + entry.personality.temperament, 0) / normalizedTeam.length
      : 5;
  return clamp(
    56 +
      player.personality.workEthic * 3.4 +
      player.personality.loyalty * 1.9 +
      (team.chemistry - 50) * 0.32 -
      Math.max(0, highEgoCount - 1) * player.personality.ego * 1.3 -
      Math.abs(workEthicAverage - player.personality.workEthic) * 2.1 -
      Math.abs(temperamentAverage - player.personality.temperament) * 1.5,
    4,
    100,
  );
}

export function getPlayerGameplayModifiers(
  player: TeamPlayer,
  team: TeamState,
  context?: { isLateGame?: boolean; scoreMargin?: number },
) {
  const nextPlayer = normalizePlayerDynamics(player);
  const chemistryFactor = (team.chemistry - 50) / 50;
  const moraleFactor = (nextPlayer.morale - 50) / 50;
  const lateGame = Boolean(context?.isLateGame);
  const closeGame = (context?.scoreMargin ?? 12) <= 6;
  const clutchContext = lateGame && closeGame ? 1 : lateGame ? 0.55 : 0;

  return {
    usageBias: clamp((nextPlayer.personality.ego - 5) * 0.055 + moraleFactor * 0.08 + clutchContext * (nextPlayer.personality.clutchFactor - 5) * 0.024, -0.18, 0.34),
    passBias: clamp((5 - nextPlayer.personality.ego) * 0.045 + chemistryFactor * 0.16 + moraleFactor * 0.08, -0.22, 0.24),
    staminaUseMultiplier: clamp(1 - (nextPlayer.personality.workEthic - 5) * 0.038 - moraleFactor * 0.05, 0.72, 1.12),
    shotBoost: clamp(chemistryFactor * 0.08 + moraleFactor * 0.1 + clutchContext * (nextPlayer.personality.clutchFactor - 5) * 0.035, -0.12, 0.2),
    reactionBoost: clamp(chemistryFactor * 0.1 + moraleFactor * 0.08 + (nextPlayer.personality.workEthic - 5) * 0.025, -0.1, 0.18),
    stealBoost: clamp((nextPlayer.personality.temperament - 5) * 0.028 + chemistryFactor * 0.05 + moraleFactor * 0.03, -0.05, 0.18),
    gamblePenalty: clamp((nextPlayer.personality.temperament - 5) * 0.03 + (nextPlayer.personality.ego - 5) * 0.015 - chemistryFactor * 0.03, -0.04, 0.16),
  };
}

export function getTeamGameplayModifiers(team: TeamState) {
  const moraleAverage = team.roster.length ? team.roster.reduce((sum, player) => sum + normalizePlayerDynamics(player).morale, 0) / team.roster.length : 55;
  const chemistryFactor = (team.chemistry - 50) / 50;
  const moraleFactor = (moraleAverage - 50) / 50;
  return {
    passingBoost: clamp(chemistryFactor * 0.12 + moraleFactor * 0.04, -0.12, 0.18),
    shootingBoost: clamp(chemistryFactor * 0.08 + moraleFactor * 0.06, -0.1, 0.14),
    reactionBoost: clamp(chemistryFactor * 0.1 + moraleFactor * 0.05, -0.08, 0.14),
  };
}

export function applyTradePlayerMood(player: TeamPlayer, destinationTeam: TeamState, franchise: FranchiseState) {
  const nextPlayer = normalizePlayerDynamics(player);
  const destinationRow = standingsRowForTeam(franchise, destinationTeam.id);
  const destinationWinRate = teamWinRate(destinationRow);
  const role = getActualRole(destinationTeam, nextPlayer.id);
  const fit = computePersonalityFit(destinationTeam, nextPlayer);
  let delta = 0;

  if (destinationWinRate >= 0.58) delta += 7;
  else if (destinationWinRate <= 0.4) delta -= 8;

  if (getExpectedRole(nextPlayer) === 'starter' && role !== 'starter') delta -= 8 + nextPlayer.personality.ego;
  if (fit >= 72) delta += 5;
  if (fit <= 38) delta -= 6;

  return {
    ...nextPlayer,
    morale: clamp(nextPlayer.morale + delta, 8, 98),
    status: getPlayerStatusLabel(nextPlayer.morale + delta),
    recentTradeAdjustment: clamp(delta, -20, 20),
    recentTradeReaction:
      delta >= 6
        ? `Feels energized by the move to ${destinationTeam.name}.`
        : delta <= -6
          ? `Is uneasy about the move to ${destinationTeam.name}.`
          : `Is still adjusting to the move to ${destinationTeam.name}.`,
  };
}

function refreshTeamDynamics(team: TeamState, row?: DraftStandingRow) {
  const roster = team.roster.map(normalizePlayerDynamics);
  const baseChemistry = computeTeamChemistry({ ...team, roster, chemistry: team.chemistry, lockerRoomStatus: team.lockerRoomStatus }, row, 55);
  const rosterWithMorale = roster.map((player) => {
    const morale = calculatePlayerMorale(player, { ...team, roster, chemistry: baseChemistry }, row, baseChemistry);
    return {
      ...player,
      morale,
      status: getPlayerStatusLabel(morale),
      recentTradeAdjustment: clamp(player.recentTradeAdjustment * 0.9, -20, 20),
    };
  });
  const averageMorale = rosterWithMorale.length ? rosterWithMorale.reduce((sum, player) => sum + player.morale, 0) / rosterWithMorale.length : 55;
  const chemistry = computeTeamChemistry({ ...team, roster: rosterWithMorale, chemistry: baseChemistry, lockerRoomStatus: team.lockerRoomStatus }, row, averageMorale);
  return {
    ...team,
    roster: rosterWithMorale,
    chemistry,
    lockerRoomStatus: getLockerRoomStatus(chemistry),
  };
}

export function refreshFranchiseDynamics(franchise: FranchiseState): FranchiseState {
  const userRow = standingsRowForTeam(franchise, franchise.user.id);
  const aiRow = standingsRowForTeam(franchise, franchise.ai.id);
  const user = refreshTeamDynamics(franchise.user, userRow);
  const ai = refreshTeamDynamics(franchise.ai, aiRow);
  const otherTeams = franchise.otherTeams.map((team) => refreshTeamDynamics(team, standingsRowForTeam(franchise, team.id)));
  const freeAgents = franchise.freeAgents.map((player) => {
    const nextPlayer = normalizePlayerDynamics(player);
    const marketHeat = (nextPlayer.marketOffers?.length ?? 0) * 5;
    const morale = clamp(34 + nextPlayer.happiness * 3.6 - nextPlayer.desireToLeave * 2.4 + nextPlayer.personality.loyalty * 1.4 + marketHeat, 12, 88);
    return {
      ...nextPlayer,
      morale,
      status: getPlayerStatusLabel(morale),
    };
  });

  return {
    ...franchise,
    user,
    ai,
    otherTeams,
    freeAgents,
  };
}

function storylinePost(
  id: string,
  text: string,
  badge: string,
  badgeTone: LeagueNewsPost['badgeTone'],
  icon: string,
  createdAtMs: number,
): LeagueNewsPost {
  return {
    id,
    createdAtMs,
    type: 'storyline',
    text,
    badge,
    badgeTone,
    icon,
  };
}

export function buildDynamicStorylinePosts(franchise: FranchiseState, opts?: { limit?: number; createdAtMs?: number }) {
  const limit = opts?.limit ?? 3;
  const createdAtMs = opts?.createdAtMs ?? Date.now();
  const posts: LeagueNewsPost[] = [];
  const allTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const allPlayers = allTeams.flatMap((team) => team.roster.map((player) => ({ team, player: normalizePlayerDynamics(player) })));

  const unhappyStar = allPlayers
    .filter((entry) => entry.player.prospect.overall >= 84 && entry.player.morale <= 40)
    .sort((a, b) => a.player.morale - b.player.morale || b.player.personality.ego - a.player.personality.ego)[0];
  if (unhappyStar) {
    posts.push(
      storylinePost(
        `story-role-${unhappyStar.player.id}-${createdAtMs}`,
        `${unhappyStar.player.prospect.name} is showing signs of frustration in ${unhappyStar.team.name}'s rotation.`,
        'ROLE WATCH',
        'bad',
        'ROLE',
        createdAtMs,
      ),
    );
  }

  const shakyRoom = allTeams
    .slice()
    .sort((a, b) => a.chemistry - b.chemistry)[0];
  if (shakyRoom && shakyRoom.chemistry <= 48) {
    posts.push(
      storylinePost(
        `story-chemistry-${shakyRoom.id}-${createdAtMs}`,
        `${shakyRoom.name} are fighting through chemistry issues as the locker room grows more fragile.`,
        'CHEMISTRY',
        'bad',
        'LOCKER',
        createdAtMs + 1,
      ),
    );
  }

  const breakout = allPlayers
    .filter((entry) => entry.player.seasonStats.matchesPlayed >= 2)
    .map((entry) => {
      const pg = entry.player.seasonStats.points / Math.max(1, entry.player.seasonStats.matchesPlayed);
      const expected = overallToTenScale(entry.player.prospect.overall) * 1.1;
      return { ...entry, score: pg - expected + entry.player.morale / 30 + entry.player.personality.workEthic / 4 };
    })
    .sort((a, b) => b.score - a.score)[0];
  if (breakout && breakout.score >= 1.8) {
    posts.push(
      storylinePost(
        `story-breakout-${breakout.player.id}-${createdAtMs}`,
        `${breakout.player.prospect.name} is turning heads with a breakout run for ${breakout.team.name}.`,
        'BREAKOUT',
        'good',
        'RISE',
        createdAtMs + 2,
      ),
    );
  }

  const hotRoom = allTeams
    .filter((team) => team.chemistry >= 72)
    .sort((a, b) => b.chemistry - a.chemistry)[0];
  if (hotRoom) {
    posts.push(
      storylinePost(
        `story-hotroom-${hotRoom.id}-${createdAtMs}`,
        `${hotRoom.name} look fully connected right now, and that chemistry is showing up in big moments.`,
        'LOCKER ROOM',
        'good',
        'SYNC',
        createdAtMs + 3,
      ),
    );
  }

  const recentTradeMood = allPlayers
    .filter((entry) => Math.abs(entry.player.recentTradeAdjustment) >= 6 && entry.player.recentTradeReaction)
    .sort((a, b) => Math.abs(b.player.recentTradeAdjustment) - Math.abs(a.player.recentTradeAdjustment))[0];
  if (recentTradeMood) {
    posts.push(
      storylinePost(
        `story-trade-mood-${recentTradeMood.player.id}-${createdAtMs}`,
        `${recentTradeMood.player.prospect.name} ${recentTradeMood.player.recentTradeReaction}`,
        'TRADE MOOD',
        recentTradeMood.player.recentTradeAdjustment > 0 ? 'good' : 'bad',
        'MOOD',
        createdAtMs + 4,
      ),
    );
  }

  const seenTexts = new Set<string>();
  return posts.filter((post) => {
    if (seenTexts.has(post.text)) return false;
    seenTexts.add(post.text);
    return true;
  }).slice(0, limit);
}
