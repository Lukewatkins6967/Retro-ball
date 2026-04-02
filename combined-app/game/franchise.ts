import { loadDraftProspects } from './prospectLoader';
import { buildRoundRobinWeeks } from './schedule';
import { createPlayoffsState } from './playoffs';
import { deriveOverall100, isImpactOverall, isStarOverall, overallToTenScale } from './ratings';
import {
  applyTradePlayerMood,
  computePersonalityFit,
  createPlayerPersonality,
  getExpectedRole,
  getPlayerStatusLabel,
  refreshFranchiseDynamics,
} from './personality';
import { getAiAggressionMultiplier, getCapAllowance, getDifficultyTuning } from './settings';
import { depthAwareTeamRating, getDepthScore, getRotationMetrics, recoverBetweenGames } from './stamina';
import type {
  DraftState,
  DraftStandingRow,
  DraftPickAsset,
  FreeAgencyDaySummary,
  FreeAgencyRole,
  FranchiseState,
  PlayerInGameStats,
  Prospect,
  PowerRankingRow,
  SeasonState,
  TeamPlayer,
  TeamState,
  TradeLogEntry,
} from './types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const FREE_AGENCY_TOTAL_DAYS = 7;
const MIN_TEAM_ROSTER_SIZE = 8;
const TARGET_TEAM_ROSTER_SIZE = 10;

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

function computeSalary(overall: number) {
  if (overall >= 94) return 118_000;
  if (overall >= 89) return 96_000;
  if (overall >= 84) return 78_000;
  if (overall >= 79) return 62_000;
  if (overall >= 73) return 48_000;
  if (overall >= 67) return 36_000;
  if (overall >= 60) return 28_000;
  return 22_000;
}

function computeContractLength(rank: number) {
  if (rank <= 5) return 4;
  if (rank <= 15) return 3;
  if (rank <= 30) return 2;
  return 1;
}

function createTeam(teamId: string, name: string, managerName: string, logoText: string, logoColor: string): TeamState {
  return {
    id: teamId,
    name,
    managerName,
    logoText,
    logoColor,
    roster: [],
    draftPicks: [],
    salaryCap: 350_000,
    cash: 250_000,
    activePlayerIds: ['', ''],
    rotationMode: 'balanced',
    contractSeason: 0,
    teamRating: 5,
    chemistry: 58,
    lockerRoomStatus: 'steady',
  };
}

function teamSalaryTotal(team: TeamState) {
  return team.roster.reduce((sum, p) => sum + p.contract.salary, 0);
}

function pickOverallCompare(a: Prospect, b: Prospect) {
  // For AI selection we want higher overall first.
  return b.overall - a.overall || a.rank - b.rank;
}

function createTeamPlayer(teamId: string, prospect: Prospect, acquiredRound: number): TeamPlayer {
  const salary = computeSalary(prospect.overall);
  const personality = createPlayerPersonality({ prospect });
  const blankStats = {
    matchesPlayed: 0,
    points: 0,
    assists: 0,
    rebounds: 0,
    steals: 0,
    blocks: 0,
  };
  return {
    id: `${teamId}:${prospect.id}:${acquiredRound}`,
    prospect,
    contract: {
      seasonsLeft: computeContractLength(prospect.rank),
      salary,
    },
    acquiredRound,
    yearsWithTeam: 0,
    personality,
    loyalty: clamp(seededRange(`${prospect.id}:loyalty`, 4, 9) + (prospect.rank <= 12 ? 1 : 0), 1, 10),
    happiness: clamp(seededRange(`${prospect.id}:happiness`, 5, 8), 1, 10),
    desireToLeave: clamp(seededRange(`${prospect.id}:leave`, 2, 7) - (prospect.rank <= 8 ? 1 : 0), 1, 10),
    morale: clamp(48 + personality.workEthic * 3 + personality.loyalty * 2 - personality.ego, 20, 90),
    status: 'neutral',
    recentTradeAdjustment: 0,
    stamina: 100,
    seasonStats: blankStats,
    playoffStats: { ...blankStats },
  };
}

function withFreshContract(player: TeamPlayer, salary: number, seasonsLeft: number): TeamPlayer {
  return {
    ...player,
    contract: {
      salary,
      seasonsLeft,
    },
  };
}

function playerPerGameScore(player: TeamPlayer) {
  const combinedGames = player.seasonStats.matchesPlayed + player.playoffStats.matchesPlayed;
  if (combinedGames <= 0) return 0;
  const points = (player.seasonStats.points + player.playoffStats.points) / combinedGames;
  const rebounds = (player.seasonStats.rebounds + player.playoffStats.rebounds) / combinedGames;
  const assists = (player.seasonStats.assists + player.playoffStats.assists) / combinedGames;
  const steals = (player.seasonStats.steals + player.playoffStats.steals) / combinedGames;
  const blocks = (player.seasonStats.blocks + player.playoffStats.blocks) / combinedGames;
  return points * 1.2 + rebounds * 0.9 + assists * 1.05 + steals * 1.5 + blocks * 1.35;
}

export function calculateMarketSalary(player: TeamPlayer) {
  const ageCurve = Math.max(-6_000, (25 - player.prospect.age) * 1_350);
  const starBoost = isStarOverall(player.prospect.overall) ? 24_000 : isImpactOverall(player.prospect.overall) ? 12_000 : 0;
  const potentialBoost = player.prospect.potential * 2_900;
  const overallBoost = player.prospect.overall * 560;
  const performanceBoost = Math.round(playerPerGameScore(player) * 1_100);
  const loyaltyDiscount = Math.round(player.yearsWithTeam * player.loyalty * 250);
  const walkRiskPremium = Math.round(player.desireToLeave * 1_100);
  const rookieDiscount = player.yearsWithTeam === 0 && player.acquiredRound <= 2 ? 6_000 : 0;
  const target = 16_000 + overallBoost + potentialBoost + ageCurve + starBoost + performanceBoost + walkRiskPremium - loyaltyDiscount - rookieDiscount;
  return clamp(Math.round(target), 18_000, 150_000);
}

function sortMarketOffers(player: TeamPlayer) {
  return (player.marketOffers ?? [])
    .slice()
    .sort((a, b) => b.happiness - a.happiness || b.salary - a.salary || b.years - a.years);
}

function bestCompetingOffer(player: TeamPlayer, teamId: string) {
  return sortMarketOffers(player).find((offer) => offer.teamId !== teamId);
}

function calculateSalaryBand(player: TeamPlayer) {
  const targetSalary = calculateMarketSalary(player);
  const loyaltyDiscount =
    (player.loyalty - 5) * 0.016 +
    (player.personality.loyalty - 5) * 0.015 +
    player.yearsWithTeam * 0.014;
  const pressurePremium =
    Math.max(0, player.desireToLeave - 5) * 0.024 +
    Math.max(0, player.personality.ego - 6) * 0.022 +
    Math.max(0, player.personality.clutchFactor - 6) * 0.012;
  const workEthicPremium = Math.max(0, player.personality.workEthic - 7) * 0.01;
  const minSalary = clamp(
    Math.round(targetSalary * (0.76 - loyaltyDiscount + pressurePremium + workEthicPremium)),
    14_000,
    targetSalary,
  );
  const maxSalary = clamp(
    Math.round(targetSalary * (1.2 + pressurePremium + workEthicPremium * 0.8)),
    targetSalary,
    165_000,
  );
  return { minSalary, targetSalary, maxSalary };
}

function teamSuccessScore(franchise: FranchiseState, teamId: string) {
  const standings = franchise.seasonStandings;
  if (!standings.length) return 0.5;
  const index = standings.findIndex((row) => row.teamId === teamId);
  if (index < 0) return 0.5;
  return 1 - index / Math.max(1, standings.length - 1);
}

function getAllTeams(franchise: FranchiseState) {
  return [franchise.user, franchise.ai, ...franchise.otherTeams];
}

function desiredRosterSize(team: TeamState) {
  return team.teamRating >= 8 ? 9 : TARGET_TEAM_ROSTER_SIZE;
}

function positionBucket(position: string) {
  const lower = position.toLowerCase();
  if (lower.includes('point') || lower.includes('shooting') || lower.includes('guard')) return 'guard';
  if (lower.includes('center')) return 'big';
  if (lower.includes('power')) return 'big';
  return 'wing';
}

function determineOfferRole(team: TeamState, player: TeamPlayer): FreeAgencyRole {
  const sorted = team.roster.slice().sort((a, b) => b.prospect.overall - a.prospect.overall);
  const starterFloor = sorted[1]?.prospect.overall ?? 0;
  const rotationFloor = sorted[Math.min(5, Math.max(0, sorted.length - 1))]?.prospect.overall ?? starterFloor;
  if (team.roster.length < MIN_TEAM_ROSTER_SIZE) return player.prospect.overall >= starterFloor - 4 ? 'starter' : 'rotation';
  if (player.prospect.overall >= starterFloor - 2) return 'starter';
  if (player.prospect.overall >= rotationFloor - 3 || team.roster.length < desiredRosterSize(team)) return 'rotation';
  return 'bench';
}

export function evaluateContractOffer(
  franchise: FranchiseState,
  teamId: string,
  player: TeamPlayer,
  offer: { salary: number; years: number },
  opts?: { isReSign?: boolean; role?: FreeAgencyRole },
) {
  const { minSalary, targetSalary, maxSalary } = calculateSalaryBand(player);
  const isOriginalTeam = player.formerTeamId === teamId;
  const competingOffer = bestCompetingOffer(player, teamId);
  const team = getAllTeams(franchise).find((entry) => entry.id === teamId);
  const offeredRole = opts?.role ?? (team ? determineOfferRole(team, player) : 'rotation');
  const expectedRole = getExpectedRole(player);
  const personalityFit = team ? computePersonalityFit(team, player) : 55;
  const teamSuccess = teamSuccessScore(franchise, teamId);
  const competitiveness =
    (player.personality.workEthic + player.personality.clutchFactor + Math.max(0, player.personality.ego - 4)) / 3;
  const wantsWinningTeam = competitiveness >= 5.6;
  const wantsMaxDeal = player.personality.ego >= 8 || player.prospect.overall >= 88;
  const comfortWithBench = player.personality.workEthic <= 4 && player.personality.ego <= 5;
  const salaryScore = clamp((offer.salary - minSalary) / Math.max(1, targetSalary - minSalary), -0.45, 1.25);
  const yearsScore = offer.years === 1 ? -0.08 : offer.years === 2 ? 0.02 : offer.years === 3 ? 0.09 : offer.years === 4 ? 0.12 : 0.1;
  const loyaltyBonus =
    (opts?.isReSign ? 0.18 : 0.03) +
    player.yearsWithTeam * 0.022 +
    player.loyalty * 0.014 +
    player.personality.loyalty * 0.016;
  const originalTeamBonus = isOriginalTeam
    ? 0.1 +
      player.loyalty * 0.014 +
      player.personality.loyalty * 0.018 +
      player.happiness * 0.018 +
      player.yearsWithTeam * 0.022
    : 0;
  const successBonus =
    (teamSuccess - 0.5) * (wantsWinningTeam ? 0.42 : 0.2) + (team ? (team.chemistry - 50) * 0.0026 : 0);
  const roleBonus =
    expectedRole === offeredRole
      ? 0.12
      : expectedRole === 'starter' && offeredRole === 'rotation'
        ? -0.1 - player.personality.ego * 0.01
        : expectedRole === 'starter' && offeredRole === 'bench'
          ? -0.2 - player.personality.ego * 0.013
          : expectedRole === 'rotation' && offeredRole === 'bench'
            ? comfortWithBench
              ? 0.01
              : -0.08
            : comfortWithBench && offeredRole === 'bench'
              ? 0.06
              : offeredRole === 'starter'
                ? 0.08
                : 0.02;
  const fitBonus = team
    ? clamp(teamNeedScore(team, player) / 120 + (personalityFit - 50) / 220 + (team.chemistry - 50) / 240, -0.08, 0.24)
    : 0;
  const happinessBonus = (player.happiness - 5) * 0.03;
  const leavePenalty = (player.desireToLeave - 4) * 0.05;
  const agePenalty = player.prospect.age >= 30 && offer.years >= 4 ? 0.08 : 0;
  const performanceBonus = Math.min(0.18, playerPerGameScore(player) / 140);
  const maxContractPenalty =
    wantsMaxDeal && offer.salary < targetSalary
      ? 0.08 + (targetSalary - offer.salary) / Math.max(60_000, targetSalary * 2.2)
      : 0;
  const contenderPenalty = wantsWinningTeam && teamSuccess < 0.52 ? (0.52 - teamSuccess) * 0.34 : 0;
  const marketPressure = competingOffer
    ? clamp((competingOffer.salary - offer.salary) / Math.max(18_000, targetSalary), -0.08, 0.2) +
      (competingOffer.years > offer.years ? 0.03 : 0)
    : 0;
  const negotiationBias = teamId === franchise.user.id ? getDifficultyTuning().negotiationBias : 0;

  const rawChance =
    0.26 +
    salaryScore * 0.38 +
    yearsScore +
    loyaltyBonus +
    originalTeamBonus +
    successBonus +
    roleBonus +
    fitBonus +
    happinessBonus +
    performanceBonus -
    leavePenalty -
    agePenalty -
    maxContractPenalty -
    contenderPenalty -
    marketPressure +
    negotiationBias;
  const acceptanceOdds = clamp(Math.round(rawChance * 100), 3, 98);
  const loyaltyMeter = clamp(
    Math.round(
      (player.loyalty * 6 +
        player.personality.loyalty * 7 +
        player.yearsWithTeam * 5 -
        player.desireToLeave * 3 +
        (isOriginalTeam ? 18 : 0)) *
        1.05,
    ),
    0,
    100,
  );
  const teamAppeal = clamp(
    Math.round(
      teamSuccess * 42 +
      personalityFit * 0.32 +
      (team ? team.chemistry * 0.18 : 10) +
      player.happiness * 3 +
      (opts?.isReSign ? player.yearsWithTeam * 5 : 0) +
      (isOriginalTeam ? player.yearsWithTeam * 6 + player.happiness * 3 : 0),
    ),
    0,
    100,
  );
  const happinessMeter = clamp(
    Math.round(
      acceptanceOdds * 0.56 +
      loyaltyMeter * 0.18 +
      teamAppeal * 0.18 +
      ((offer.salary - targetSalary) / Math.max(1, targetSalary)) * 24,
    ),
    0,
    100,
  );

  const reasons: string[] = [];
  if (wantsMaxDeal && offer.salary < targetSalary) reasons.push('This player is chasing a premium contract tier.');
  if (offer.salary < minSalary) reasons.push('Offer is below the player’s comfort range.');
  else if (offer.salary >= targetSalary) reasons.push('Offer hits or beats the player’s market expectation.');
  if (player.yearsWithTeam >= 3) reasons.push('Long team history is helping the negotiation.');
  if (player.desireToLeave >= 7) reasons.push('Player is actively considering a fresh start.');
  if (teamAppeal >= 70) reasons.push('Team success and fit are pulling the player toward a deal.');
  if (isOriginalTeam) reasons.push('Returning to the original team carries a major loyalty boost.');
  if (expectedRole === 'starter' && offeredRole !== 'starter') reasons.push('Role expectations are hurting the player interest.');
  if (offeredRole === 'starter') reasons.push('Starter minutes are raising the player’s interest.');
  else if (offeredRole === 'rotation') reasons.push('A real rotation role keeps the offer competitive.');
  else reasons.push('Bench-only minutes are limiting the upside of this offer.');
  if (wantsWinningTeam && teamSuccess < 0.52) reasons.push('The player wants stronger winning signals from the team.');
  if (personalityFit >= 72) reasons.push('The locker room fit looks strong for this player.');
  else if (personalityFit <= 40) reasons.push('Personality fit with the current roster looks shaky.');
  if (competingOffer) reasons.push(`${competingOffer.teamName} already has a strong offer on the table.`);

  return {
    minSalary,
    targetSalary,
    maxSalary,
    acceptanceOdds,
    happinessMeter,
    loyaltyMeter,
    teamAppeal,
    offeredRole,
    likelyToRefuse: acceptanceOdds < 45,
    reasons,
  };
}

export function calculateResignSalary(player: TeamPlayer) {
  return calculateMarketSalary(player);
}

function setDefaultActivePlayers(team: TeamState): TeamState {
  const roster = [...team.roster];

  // “Ball handler” values shooting + playmaking + potential.
  const ballHandler = roster
    .slice()
    .sort((a, b) => {
      const aScore =
        a.prospect.categories.playmaking * 0.45 +
        a.prospect.categories.shooting * 0.35 +
        a.prospect.potential * 0.2;
      const bScore =
        b.prospect.categories.playmaking * 0.45 +
        b.prospect.categories.shooting * 0.35 +
        b.prospect.potential * 0.2;
      return bScore - aScore || a.prospect.rank - b.prospect.rank;
    })[0]?.id;

  // “Off-ball defender” values defense + (steal/block/rebound) contributions + potential.
  const defender = roster
    .filter((p) => p.id !== ballHandler)
    .slice()
    .sort((a, b) => {
      const aPerf = a.seasonStats.steals + a.seasonStats.blocks + a.seasonStats.rebounds * 0.35;
      const bPerf = b.seasonStats.steals + b.seasonStats.blocks + b.seasonStats.rebounds * 0.35;
      const aScore = a.prospect.categories.defense * 0.55 + aPerf * 0.02 + a.prospect.potential * 0.2;
      const bScore = b.prospect.categories.defense * 0.55 + bPerf * 0.02 + b.prospect.potential * 0.2;
      return bScore - aScore || a.prospect.rank - b.prospect.rank;
    })[0]?.id;

  return { ...team, activePlayerIds: [ballHandler ?? '', defender ?? ''] };
}

function aiChooseProspect(available: Prospect[], aiTeam: TeamState): Prospect {
  const roster = aiTeam.roster;
  const avg = (fn: (p: Prospect) => number, fallback = 5) =>
    roster.length ? roster.reduce((s, p) => s + fn(p.prospect), 0) / roster.length : fallback;

  const avgShooting = avg((p) => p.categories.shooting);
  const avgDefense = avg((p) => p.categories.defense);
  const avgPlaymaking = avg((p) => p.categories.playmaking);
  const avgSpeed = avg((p) => p.categories.speed);

  // Needs are “how far below a baseline” the roster is.
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const baseline = 7;
  const needs = {
    shooting: clamp01((baseline - avgShooting) / baseline),
    defense: clamp01((baseline - avgDefense) / baseline),
    playmaking: clamp01((baseline - avgPlaymaking) / baseline),
    speed: clamp01((baseline - avgSpeed) / baseline),
  };

  const scoreProspect = (p: Prospect) => {
    // Drafting prioritizes potential, then fills current weaknesses.
    const fit =
      p.categories.shooting * needs.shooting * 0.35 +
      p.categories.defense * needs.defense * 0.35 +
      p.categories.playmaking * needs.playmaking * 0.2 +
      p.categories.speed * needs.speed * 0.1;

    const base = overallToTenScale(p.overall) * 0.28 + p.potential * 0.42 + fit;
    const rankPenalty = Math.min(10, p.rank / 10) * 0.35;
    return base - rankPenalty;
  };

  const top = available.slice().sort((a, b) => scoreProspect(b) - scoreProspect(a))[0];
  if (!top) throw new Error('No available prospects to draft');
  return top;
}

function ensureProspectPoolDepth(prospects: Prospect[], teamsCount: number, seasonSeed: number) {
  const minimumProspects = teamsCount * 8;
  if (prospects.length >= minimumProspects) return prospects;
  const supplemental = loadDraftProspects(seasonSeed + 70)
    .slice(0, minimumProspects - prospects.length)
    .map((prospect, index) => ({
      ...prospect,
      id: `supp-${seasonSeed}-${index}-${prospect.id}`,
      rank: prospects.length + index + 1,
    }));
  return [...prospects, ...supplemental];
}

export function createFranchiseState(params?: {
  userName?: string;
  aiName?: string;
  maxRounds?: number;
  initialDraftProspects?: Prospect[];
}): FranchiseState {
  // Draft teams (user + rival + extra teams for standings/power rankings + draft feed).
  const user = createTeam(
    'user',
    params?.userName ?? 'Your Squad',
    'GM You',
    'H',
    '#2563eb',
  );
  const ai = createTeam('ai', params?.aiName ?? 'Rival City', 'AI GM Rival', 'R', '#ef4444');
  const otherTeams = [
    createTeam('t1', 'Aurora Raptors', 'AI GM Kim', 'A', '#22c55e'),
    createTeam('t2', 'Neon Kings', 'AI GM Patel', 'N', '#a855f7'),
    createTeam('t3', 'Harbor Hawks', 'AI GM Chen', 'H', '#06b6d4'),
    createTeam('t4', 'Cinder Cyclones', 'AI GM Rivera', 'C', '#f59e0b'),
    createTeam('t5', 'Atlas Aces', 'AI GM Novak', 'A', '#3b82f6'),
    createTeam('t6', 'Metro Meteors', 'AI GM Ito', 'M', '#10b981'),
    createTeam('t7', 'Solar Serpents', 'AI GM Lopez', 'S', '#f97316'),
    createTeam('t8', 'Glacier Giants', 'AI GM Brooks', 'G', '#38bdf8'),
    createTeam('t9', 'Voltage Vipers', 'AI GM Singh', 'V', '#84cc16'),
    createTeam('t10', 'Summit Storm', 'AI GM Alvarez', 'S', '#e11d48'),
  ];

  const leagueTeams = [user, ai, ...otherTeams];

  const prospects = ensureProspectPoolDepth(params?.initialDraftProspects ?? loadDraftProspects(1), leagueTeams.length, 1);
  const availableProspects = [...prospects].sort((a, b) => a.rank - b.rank);

  // Auto-calc draft rounds so the draft runs until every prospect is drafted.
  // (We still keep user selection in the UI, but gameplay always drafts the full pool.)
  const teamsCount = leagueTeams.length;
  const requiredPicks = availableProspects.length;
  const requiredRounds = Math.max(1, Math.ceil(requiredPicks / teamsCount));

  const weightedPickOrderForRound = (teams: TeamState[]) => {
    const remaining = teams.slice();
    const pickIds: string[] = [];

    const pickWeight = (t: TeamState) => {
      // Lower teamRating => higher odds to draft earlier.
      const base = 12 - t.teamRating;
      return Math.max(0.5, base);
    };

    while (remaining.length) {
      const total = remaining.reduce((s, t) => s + pickWeight(t), 0);
      let r = Math.random() * total;
      for (let i = 0; i < remaining.length; i++) {
        const w = pickWeight(remaining[i]);
        r -= w;
        if (r <= 0) {
          pickIds.push(remaining[i].id);
          remaining.splice(i, 1);
          break;
        }
      }
    }

    return pickIds;
  };

  const draftOrderTeamIds: string[] = [];
  for (let round = 0; round < requiredRounds; round++) {
    const order = weightedPickOrderForRound(leagueTeams);
    draftOrderTeamIds.push(...order);
  }

  // If the last round is partial, trim the schedule so it matches the prospect pool size exactly.
  const trimmedDraftOrderTeamIds = draftOrderTeamIds.slice(0, requiredPicks);

  const draft: DraftState = {
    round: 1,
    maxRounds: requiredRounds,
    availableProspects,
    draftOrderTeamIds: trimmedDraftOrderTeamIds,
    currentPickIndex: 0,
    draftFeed: [],
    draftedByTeamId: {},
  };

  const pickOwners: Record<string, DraftPickAsset[]> = {};
  for (const team of leagueTeams) {
    pickOwners[team.id] = [];
  }
  trimmedDraftOrderTeamIds.forEach((teamId, index) => {
    const round = Math.floor(index / teamsCount) + 1;
    const pickPosition = index + 1;
    const ownerTeam = leagueTeams.find((team) => team.id === teamId);
    const pick: DraftPickAsset = {
      id: `pick-${round}-${pickPosition}-${teamId}`,
      fromTeamId: teamId,
      ownerTeamId: teamId,
      round,
      pickPosition,
      value: computeDraftPickValue(
        { id: '', fromTeamId: teamId, ownerTeamId: teamId, round, pickPosition, value: 0 },
        ownerTeam ?? leagueTeams[0],
      ),
    };
    pickOwners[teamId].push(pick);
  });

  const attachPick = (team: TeamState): TeamState => ({
    ...team,
    draftPicks: pickOwners[team.id] ?? [],
  });

  return refreshFranchiseDynamics({
    user: attachPick(user),
    ai: attachPick(ai),
    otherTeams: otherTeams.map(attachPick),
    freeAgents: [],
    freeAgencyPending: false,
    freeAgencyState: null,
    draft,
    draftCompleted: false,
    seasonIndex: 1,
    seasonStandings: [],
    powerRankings: [],
    season: null,
    currentDate: { year: 2026, month: 9, day: 1 },
    tradeHistory: [],
  });
}

export function getUserDraftChoices(franchise: FranchiseState, limit = 6): Prospect[] {
  const currentTeamId = franchise.draft.draftOrderTeamIds[franchise.draft.currentPickIndex];
  if (currentTeamId !== franchise.user.id) return [];
  return franchise.draft.availableProspects.slice(0, limit);
}

export type UserPickMode = 'human' | 'ai';

function finalizeCompletedDraft(
  franchise: FranchiseState,
  nextDraft: DraftState,
  updatedUser: TeamState,
  updatedAi: TeamState,
  updatedOther: TeamState[],
) {
  const allTeams = [updatedUser, updatedAi, ...updatedOther];
  const teamToStanding = (t: TeamState): DraftStandingRow => ({
    teamId: t.id,
    teamName: t.name,
    managerName: t.managerName,
    logoText: t.logoText,
    logoColor: t.logoColor,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    streak: 'â€”',
    streakCount: 0,
  });

  const seasonStandings = allTeams.map(teamToStanding).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsAgainst - (a.pointsFor - a.pointsAgainst));

  const powerRankings = allTeams
    .map((t) => {
      const avgPotential = t.roster.length ? t.roster.reduce((s, p) => s + p.prospect.potential, 0) / t.roster.length : 5;
      const score = t.teamRating * 1.2 + avgPotential * 0.9;
      return {
        teamId: t.id,
        teamName: t.name,
        managerName: t.managerName,
        logoText: t.logoText,
        logoColor: t.logoColor,
        rank: 0,
        score,
      } satisfies PowerRankingRow;
    })
    .sort((a, b) => b.score - a.score)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  const season: SeasonState = {
    seasonId: `season-${franchise.seasonIndex + 1}-${Date.now()}`,
    phase: 'regular',
    weeksTotal: 5,
    weekIndex: 0,
    games: buildRoundRobinWeeks(allTeams.map((t) => t.id), 5),
  };

  return refreshFranchiseDynamics({
    ...franchise,
    user: updatedUser,
    ai: updatedAi,
    otherTeams: updatedOther,
    draft: nextDraft,
    draftCompleted: true,
    freeAgencyPending: false,
    freeAgencyState: null,
    seasonIndex: franchise.seasonIndex + 1,
    seasonStandings,
    powerRankings,
    season,
  });
}

// Advance draft picks automatically.
// - `human`: AI picks everything until it's the user's turn, then stops.
// - `ai`: AI picks everything until the draft completes (including user picks).
export function advanceDraftPicks(franchise: FranchiseState, opts: { userPickMode: UserPickMode }): FranchiseState {
  if (franchise.draftCompleted) return franchise;

  const { userPickMode } = opts;

  const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const currentPickTeamId = franchise.draft.draftOrderTeamIds[franchise.draft.currentPickIndex];

  // In human mode, stop right when the user should pick.
  if (userPickMode === 'human' && currentPickTeamId === franchise.user.id) return franchise;

  const pickProspects = [...franchise.draft.availableProspects];
  const draftedByTeamId = { ...franchise.draft.draftedByTeamId };
  const draftFeed = [...franchise.draft.draftFeed];

  const nextTeams = leagueTeams.slice();
  const getTeam = (teamId: string) => nextTeams.find((t) => t.id === teamId);

  const draftForTeam = (teamId: string, prospect: Prospect, isHuman: boolean, pickNumber: number) => {
    const team = getTeam(teamId);
    if (!team) return;

    const roundAtPick = Math.floor((pickNumber - 1) / nextTeams.length) + 1;
    const salary = computeSalary(prospect.overall);

    // Consume prospect from the shared pool first, so later picks can’t re-take it.
    const poolIdx = pickProspects.findIndex((p) => p.id === prospect.id);
    if (poolIdx >= 0) pickProspects.splice(poolIdx, 1);

    let updated: TeamState = { ...team };
    if (canAfford(team, salary)) {
      const tp = createTeamPlayer(team.id, prospect, roundAtPick);
      updated = {
        ...team,
        roster: [...team.roster, tp],
        cash: team.cash - Math.round(salary * 0.35),
      };
      updated = setDefaultActivePlayers(updated);
      updated.teamRating = computeTeamRatingFromRoster(updated);
    } else {
      updated.teamRating = computeTeamRatingFromRoster(updated);
    }

    const teamIdx = nextTeams.findIndex((t) => t.id === updated.id);
    if (teamIdx >= 0) nextTeams[teamIdx] = updated;

    draftedByTeamId[teamId] = [...(draftedByTeamId[teamId] ?? []), prospect.id];

    const surpriseLabel = prospect.potential >= 8 ? 'Trophy Potential' : 'Strategic Fit';
    const pressRelease = isHuman
      ? `${updated.name} (You) takes ${prospect.name}. Shooting ${prospect.categories.shooting}, Defense ${prospect.categories.defense}.`
      : `${updated.name} selects ${prospect.name}. Potential ${prospect.potential}/10.`;

    draftFeed.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pickNumber,
      teamId: updated.id,
      teamName: updated.name,
      managerName: updated.managerName,
      teamLogoText: updated.logoText,
      teamLogoColor: updated.logoColor,
      prospectId: prospect.id,
      prospectName: prospect.name,
      position: prospect.position,
      overall: prospect.overall,
      potential: prospect.potential,
      categories: prospect.categories,
      surpriseLabel,
      pressRelease,
      createdAtMs: Date.now(),
    });
  };

  let currentPickIndex = franchise.draft.currentPickIndex;
  const totalPicks = franchise.draft.draftOrderTeamIds.length;
  let draftedUserTurnOnce = false;

  while (currentPickIndex < totalPicks) {
    const nextTeamId = franchise.draft.draftOrderTeamIds[currentPickIndex];
    if (nextTeamId === franchise.user.id) {
      if (userPickMode === 'human') break;
      // AI mode: draft exactly one user pick, then stop when it becomes the user’s turn again.
      if (draftedUserTurnOnce) break;
      draftedUserTurnOnce = true;
    }

    const nextTeam = nextTeams.find((t) => t.id === nextTeamId);
    if (!nextTeam) break;

    const topPool = pickProspects.slice(0, 10);
    if (topPool.length === 0) break;

    const aiProspect = aiChooseProspect(topPool, nextTeam);
    // In this auto-advance function, AI is making every pick (including the user's team in `userPickMode: 'ai'`).
    draftForTeam(nextTeamId, aiProspect, false, currentPickIndex + 1);
    currentPickIndex += 1;
  }

  const draftCompleted = currentPickIndex >= totalPicks;
  const nextRound = Math.floor(currentPickIndex / nextTeams.length) + 1;

  const nextDraft: DraftState = {
    ...franchise.draft,
    round: nextRound,
    currentPickIndex,
    availableProspects: pickProspects,
    draftFeed,
    draftedByTeamId,
  };

  const updatedUser = nextTeams.find((t) => t.id === franchise.user.id) ?? franchise.user;
  const updatedAi = nextTeams.find((t) => t.id === franchise.ai.id) ?? franchise.ai;
  const updatedOther = nextTeams.filter((t) => t.id !== franchise.user.id && t.id !== franchise.ai.id);

  if (draftCompleted) {
    return finalizeCompletedDraft(franchise, nextDraft, updatedUser, updatedAi, updatedOther);
  }

  return refreshFranchiseDynamics({
    ...franchise,
    user: updatedUser,
    ai: updatedAi,
    otherTeams: updatedOther,
    draft: nextDraft,
    draftCompleted,
  });
}

export function advanceSingleDraftPick(franchise: FranchiseState, opts: { userPickMode: UserPickMode }): FranchiseState {
  if (franchise.draftCompleted) return franchise;

  const { userPickMode } = opts;
  const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const currentPickTeamId = franchise.draft.draftOrderTeamIds[franchise.draft.currentPickIndex];
  if (userPickMode === 'human' && currentPickTeamId === franchise.user.id) return franchise;

  const pickProspects = [...franchise.draft.availableProspects];
  const draftedByTeamId = { ...franchise.draft.draftedByTeamId };
  const draftFeed = [...franchise.draft.draftFeed];
  const nextTeams = leagueTeams.slice();
  const getTeam = (teamId: string) => nextTeams.find((t) => t.id === teamId);

  const draftForTeam = (teamId: string, prospect: Prospect, isHuman: boolean, pickNumber: number) => {
    const team = getTeam(teamId);
    if (!team) return;

    const roundAtPick = Math.floor((pickNumber - 1) / nextTeams.length) + 1;
    const salary = computeSalary(prospect.overall);
    const poolIdx = pickProspects.findIndex((p) => p.id === prospect.id);
    if (poolIdx >= 0) pickProspects.splice(poolIdx, 1);

    let updated: TeamState = { ...team };
    if (canAfford(team, salary)) {
      const tp = createTeamPlayer(team.id, prospect, roundAtPick);
      updated = {
        ...team,
        roster: [...team.roster, tp],
        cash: team.cash - Math.round(salary * 0.35),
      };
      updated = setDefaultActivePlayers(updated);
      updated.teamRating = computeTeamRatingFromRoster(updated);
    } else {
      updated.teamRating = computeTeamRatingFromRoster(updated);
    }

    const teamIdx = nextTeams.findIndex((t) => t.id === updated.id);
    if (teamIdx >= 0) nextTeams[teamIdx] = updated;

    draftedByTeamId[teamId] = [...(draftedByTeamId[teamId] ?? []), prospect.id];
    const surpriseLabel = prospect.potential >= 8 ? 'Trophy Potential' : 'Strategic Fit';
    const pressRelease = isHuman
      ? `${updated.name} (You) takes ${prospect.name}. Shooting ${prospect.categories.shooting}, Defense ${prospect.categories.defense}.`
      : `${updated.name} selects ${prospect.name}. Potential ${prospect.potential}/10.`;

    draftFeed.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pickNumber,
      teamId: updated.id,
      teamName: updated.name,
      managerName: updated.managerName,
      teamLogoText: updated.logoText,
      teamLogoColor: updated.logoColor,
      prospectId: prospect.id,
      prospectName: prospect.name,
      position: prospect.position,
      overall: prospect.overall,
      potential: prospect.potential,
      categories: prospect.categories,
      surpriseLabel,
      pressRelease,
      createdAtMs: Date.now(),
    });
  };

  const nextTeamId = franchise.draft.draftOrderTeamIds[franchise.draft.currentPickIndex];
  const nextTeam = nextTeams.find((t) => t.id === nextTeamId);
  if (!nextTeam) return franchise;
  const topPool = pickProspects.slice(0, 10);
  if (!topPool.length) return franchise;
  const aiProspect = aiChooseProspect(topPool, nextTeam);
  draftForTeam(nextTeamId, aiProspect, nextTeamId === franchise.user.id, franchise.draft.currentPickIndex + 1);

  const currentPickIndex = franchise.draft.currentPickIndex + 1;
  const draftCompleted = currentPickIndex >= franchise.draft.draftOrderTeamIds.length;
  const nextRound = Math.floor(currentPickIndex / nextTeams.length) + 1;
  const nextDraft: DraftState = {
    ...franchise.draft,
    round: nextRound,
    currentPickIndex,
    availableProspects: pickProspects,
    draftFeed,
    draftedByTeamId,
  };

  const updatedUser = nextTeams.find((t) => t.id === franchise.user.id) ?? franchise.user;
  const updatedAi = nextTeams.find((t) => t.id === franchise.ai.id) ?? franchise.ai;
  const updatedOther = nextTeams.filter((t) => t.id !== franchise.user.id && t.id !== franchise.ai.id);

  if (draftCompleted) {
    return finalizeCompletedDraft(franchise, nextDraft, updatedUser, updatedAi, updatedOther);
  }

  return refreshFranchiseDynamics({
    ...franchise,
    user: updatedUser,
    ai: updatedAi,
    otherTeams: updatedOther,
    draft: nextDraft,
    draftCompleted: false,
    freeAgencyPending: false,
    freeAgencyState: null,
  });
}

export function userDraftPick(franchise: FranchiseState, prospectId: string): FranchiseState {
  if (franchise.draftCompleted) return franchise;

  const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const currentPickTeamId = franchise.draft.draftOrderTeamIds[franchise.draft.currentPickIndex];
  if (currentPickTeamId !== franchise.user.id) return franchise;

  const pickProspects = [...franchise.draft.availableProspects];
  const pickIndex = pickProspects.findIndex((p) => p.id === prospectId);
  if (pickIndex < 0) return franchise;
  const pickedProspect = pickProspects[pickIndex];

  const draftedByTeamId = { ...franchise.draft.draftedByTeamId };
  const draftFeed = [...franchise.draft.draftFeed];
  const nextTeams = leagueTeams.slice();
  const getTeam = (teamId: string) => nextTeams.find((t) => t.id === teamId);

  const draftForTeam = (teamId: string, prospect: Prospect, isHuman: boolean, pickNumber: number) => {
    const team = getTeam(teamId);
    if (!team) return;

    const roundAtPick = Math.floor((pickNumber - 1) / nextTeams.length) + 1;
    const salary = computeSalary(prospect.overall);
    const poolIdx = pickProspects.findIndex((p) => p.id === prospect.id);
    if (poolIdx >= 0) pickProspects.splice(poolIdx, 1);

    let updated: TeamState = { ...team };
    if (canAfford(team, salary)) {
      const tp = createTeamPlayer(team.id, prospect, roundAtPick);
      updated = {
        ...team,
        roster: [...team.roster, tp],
        cash: team.cash - Math.round(salary * 0.35),
      };
      updated = setDefaultActivePlayers(updated);
      updated.teamRating = computeTeamRatingFromRoster(updated);
    } else {
      updated.teamRating = computeTeamRatingFromRoster(updated);
    }

    const teamIdx = nextTeams.findIndex((t) => t.id === updated.id);
    if (teamIdx >= 0) nextTeams[teamIdx] = updated;

    draftedByTeamId[teamId] = [...(draftedByTeamId[teamId] ?? []), prospect.id];

    const surpriseLabel = prospect.potential >= 8 ? 'Trophy Potential' : 'Strategic Fit';
    const pressRelease = isHuman
      ? `${updated.name} (You) takes ${prospect.name}. Shooting ${prospect.categories.shooting}, Defense ${prospect.categories.defense}.`
      : `${updated.name} selects ${prospect.name}. Potential ${prospect.potential}/10.`;

    draftFeed.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pickNumber,
      teamId: updated.id,
      teamName: updated.name,
      managerName: updated.managerName,
      teamLogoText: updated.logoText,
      teamLogoColor: updated.logoColor,
      prospectId: prospect.id,
      prospectName: prospect.name,
      position: prospect.position,
      overall: prospect.overall,
      potential: prospect.potential,
      categories: prospect.categories,
      surpriseLabel,
      pressRelease,
      createdAtMs: Date.now(),
    });
  };

  draftForTeam(franchise.user.id, pickedProspect, true, franchise.draft.currentPickIndex + 1);

  let currentPickIndex = franchise.draft.currentPickIndex + 1;
  const totalPicks = franchise.draft.draftOrderTeamIds.length;

  while (currentPickIndex < totalPicks) {
    const nextTeamId = franchise.draft.draftOrderTeamIds[currentPickIndex];
    if (nextTeamId === franchise.user.id) break;

    const nextTeam = nextTeams.find((t) => t.id === nextTeamId);
    if (!nextTeam) break;

    const topPool = pickProspects.slice(0, 10);
    const aiProspect = aiChooseProspect(topPool, nextTeam);
    draftForTeam(nextTeamId, aiProspect, false, currentPickIndex + 1);
    currentPickIndex += 1;
  }

  const draftCompleted = currentPickIndex >= totalPicks;
  const nextRound = Math.floor(currentPickIndex / nextTeams.length) + 1;

  const nextDraft: DraftState = {
    ...franchise.draft,
    round: nextRound,
    currentPickIndex,
    availableProspects: pickProspects,
    draftFeed,
    draftedByTeamId,
  };

  const updatedUser = nextTeams.find((t) => t.id === franchise.user.id) ?? franchise.user;
  const updatedAi = nextTeams.find((t) => t.id === franchise.ai.id) ?? franchise.ai;
  const updatedOther = nextTeams.filter((t) => t.id !== franchise.user.id && t.id !== franchise.ai.id);

  if (!draftCompleted) {
    return refreshFranchiseDynamics({
      ...franchise,
      user: updatedUser,
      ai: updatedAi,
      otherTeams: updatedOther,
      draft: nextDraft,
      draftCompleted: false,
      freeAgencyPending: false,
      freeAgencyState: null,
    });
  }

  const allTeams = [updatedUser, updatedAi, ...updatedOther];
  const teamToStanding = (t: TeamState): DraftStandingRow => ({
    teamId: t.id,
    teamName: t.name,
    managerName: t.managerName,
    logoText: t.logoText,
    logoColor: t.logoColor,
    wins: 0,
    losses: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    streak: '—',
    streakCount: 0,
  });

  const seasonStandings = allTeams.map(teamToStanding).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsAgainst - (a.pointsFor - a.pointsAgainst));

  const powerRankings = allTeams
    .map((t) => {
      const avgPotential = t.roster.length ? t.roster.reduce((s, p) => s + p.prospect.potential, 0) / t.roster.length : 5;
      const score = t.teamRating * 1.2 + avgPotential * 0.9;
      return {
        teamId: t.id,
        teamName: t.name,
        managerName: t.managerName,
        logoText: t.logoText,
        logoColor: t.logoColor,
        rank: 0,
        score,
      } satisfies PowerRankingRow;
    })
    .sort((a, b) => b.score - a.score)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  const season: SeasonState = {
    seasonId: `season-${franchise.seasonIndex + 1}-${Date.now()}`,
    phase: 'regular',
    weeksTotal: 5,
    weekIndex: 0,
    games: buildRoundRobinWeeks(allTeams.map((t) => t.id), 5),
  };

  return refreshFranchiseDynamics({
    ...franchise,
    user: updatedUser,
    ai: updatedAi,
    otherTeams: updatedOther,
    draft: nextDraft,
    draftCompleted: true,
    freeAgencyPending: false,
    freeAgencyState: null,
    seasonIndex: franchise.seasonIndex + 1,
    seasonStandings,
    powerRankings,
    season,
  });
}

function canAfford(team: TeamState, salary: number) {
  return teamSalaryTotal(team) + salary <= team.salaryCap + getCapAllowance() && team.cash >= salary * 0.35;
}

function blankPlayerStats(): TeamPlayer['seasonStats'] {
  return {
    matchesPlayed: 0,
    points: 0,
    assists: 0,
    rebounds: 0,
    steals: 0,
    blocks: 0,
  };
}

function resetTeamSeasonStats(team: TeamState): TeamState {
  return {
    ...team,
    roster: team.roster.map((player) => ({
      ...player,
      seasonStats: blankPlayerStats(),
      playoffStats: blankPlayerStats(),
    })),
  };
}

function resetFreeAgentSeasonStats(players: TeamPlayer[]): TeamPlayer[] {
  return players.map((player) => ({
    ...player,
    seasonStats: blankPlayerStats(),
    playoffStats: blankPlayerStats(),
  }));
}

function upsertTeam(franchise: FranchiseState, nextTeam: TeamState): FranchiseState {
  if (franchise.user.id === nextTeam.id) return { ...franchise, user: nextTeam };
  if (franchise.ai.id === nextTeam.id) return { ...franchise, ai: nextTeam };
  return {
    ...franchise,
    otherTeams: franchise.otherTeams.map((team) => (team.id === nextTeam.id ? nextTeam : team)),
  };
}

function freeAgentValue(player: TeamPlayer) {
  return player.prospect.overall * 175 + player.prospect.potential * 1100 - player.prospect.age * 180 - player.contract.salary * 0.08;
}

function contractCounter(player: TeamPlayer, offer: { salary: number; years: number }) {
  const { minSalary, targetSalary } = calculateSalaryBand(player);
  return {
    salary: clamp(Math.round(((Math.max(offer.salary, minSalary) + targetSalary) / 2) / 1000) * 1000, minSalary, targetSalary),
    years: clamp(Math.max(offer.years, player.prospect.age >= 29 ? 2 : 3), 1, 5),
  };
}

function teamNeedProfile(team: TeamState) {
  const roster = team.roster;
  const counts = { guard: 0, wing: 0, big: 0 };
  for (const entry of roster) {
    counts[positionBucket(entry.prospect.position)] += 1;
  }

  const guardNeed = Math.max(0, 3 - counts.guard) * 12;
  const wingNeed = Math.max(0, 3 - counts.wing) * 11;
  const bigNeed = Math.max(0, 2 - counts.big) * 13;
  const depthNeed = Math.max(0, 7.2 - getDepthScore(team)) * 5.5;
  const rotationMetrics = getRotationMetrics(team);
  const staminaNeed = Math.max(0, 78 - rotationMetrics.averageStamina) * 0.45 + Math.max(0, desiredRosterSize(team) - roster.length) * 8;

  return {
    counts,
    guardNeed,
    wingNeed,
    bigNeed,
    depthNeed,
    staminaNeed,
    rosterNeed: Math.max(0, desiredRosterSize(team) - roster.length) * 12,
  };
}

function teamNeedScore(team: TeamState, player: TeamPlayer) {
  const profile = teamNeedProfile(team);
  const bucket = positionBucket(player.prospect.position);
  const positionNeed = bucket === 'guard' ? profile.guardNeed : bucket === 'big' ? profile.bigNeed : profile.wingNeed;
  const shootingNeed = 10 - (team.roster.reduce((sum, entry) => sum + entry.prospect.categories.shooting, 0) / Math.max(1, team.roster.length));
  const playmakingNeed = 10 - (team.roster.reduce((sum, entry) => sum + entry.prospect.categories.playmaking, 0) / Math.max(1, team.roster.length));
  const defenseNeed = 10 - (team.roster.reduce((sum, entry) => sum + entry.prospect.categories.defense, 0) / Math.max(1, team.roster.length));
  const personalityFit = computePersonalityFit(team, player);
  const chemistryNeed = Math.max(0, 62 - team.chemistry);
  const highEgoCount = team.roster.filter((entry) => entry.personality.ego >= 8).length;
  const egoPenalty = highEgoCount >= 2 && player.personality.ego >= 8 ? 18 : 0;
  return (
    positionNeed * 1.6 +
    player.prospect.categories.shooting * shootingNeed * 0.26 +
    player.prospect.categories.playmaking * playmakingNeed * 0.22 +
    player.prospect.categories.defense * defenseNeed * 0.26 +
    profile.depthNeed * 2.1 +
    profile.staminaNeed * 1.7 +
    profile.rosterNeed * 1.6 +
    chemistryNeed * 1.25 +
    personalityFit * 0.42 +
    player.prospect.potential * 3.4 -
    player.prospect.age * 0.9 -
    egoPenalty
  );
}

function recordMarketOffer(
  franchise: FranchiseState,
  playerId: string,
  team: TeamState,
  offer: { salary: number; years: number },
  happiness: number,
  role: FreeAgencyRole,
  acceptanceOdds: number,
) {
  const day = franchise.freeAgencyState?.currentDay ?? 1;
  return {
    ...franchise,
    freeAgents: franchise.freeAgents.map((player) => {
      if (player.id !== playerId) return player;
      const existing = (player.marketOffers ?? []).filter((entry) => entry.teamId !== team.id);
      return {
        ...player,
        marketOffers: [
          ...existing,
          {
            teamId: team.id,
            teamName: team.name,
            salary: offer.salary,
            years: offer.years,
            happiness,
            role,
            day,
            acceptanceOdds,
            fromOriginalTeam: player.formerTeamId === team.id,
          },
        ].sort((a, b) => b.happiness - a.happiness || b.salary - a.salary || b.years - a.years),
      };
    }),
  };
}

function buildAiOfferForPlayer(franchise: FranchiseState, team: TeamState, player: TeamPlayer) {
  const day = franchise.freeAgencyState?.currentDay ?? 1;
  const { minSalary, targetSalary } = calculateSalaryBand(player);
  const existingOffer = (player.marketOffers ?? []).find((offer) => offer.teamId === team.id);
  const bestOffer = player.marketOffers?.[0];
  const role = determineOfferRole(team, player);
  const fitScore = computePersonalityFit(team, player);
  const hometownDiscount = player.formerTeamId === team.id && player.happiness >= 7 ? 5_000 : 0;
  const aggression = teamNeedScore(team, player) * 16 + fitScore * 22 + Math.max(0, day - 2) * 2_500;
  const biddingPremium =
    bestOffer && bestOffer.teamId !== team.id
      ? Math.round((bestOffer.salary - targetSalary) * 0.45) + bestOffer.years * 800
      : 0;
  const overspendPenalty = team.teamRating >= 8 && role === 'bench' ? 7_500 : fitScore <= 42 ? 6_000 : 0;
  const proposedSalary = clamp(
    Math.round(
      (existingOffer?.salary ?? targetSalary) +
        aggression * 0.1 +
        biddingPremium -
        hometownDiscount -
        overspendPenalty -
        team.contractSeason * 250,
    ),
    minSalary,
    targetSalary + 22_000,
  );
  const proposedYears = clamp(
    existingOffer?.years ??
    (player.formerTeamId === team.id && player.happiness >= 7
      ? Math.max(2, Math.min(4, player.yearsWithTeam + 1))
      : player.prospect.age >= 29
        ? 2
        : player.prospect.potential >= 8
          ? 4
          : player.personality.loyalty >= 8 && fitScore >= 68
            ? 4
            : 3),
    1,
    5,
  );
  const offer = { salary: proposedSalary, years: proposedYears };
  const evaluation = evaluateContractOffer(franchise, team.id, player, offer, { role });
  const capRoom = team.salaryCap - teamSalaryTotal(team) + (existingOffer?.salary ?? 0);
  const capOkay = capRoom >= proposedSalary;
  return { offer, evaluation, capOkay, role, existingOffer };
}

function signFreeAgentToTeam(franchise: FranchiseState, teamId: string, playerId: string, offer: { salary: number; years: number }): FranchiseState {
  const allTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const team = allTeams.find((entry) => entry.id === teamId);
  const freeAgent = franchise.freeAgents.find((player) => player.id === playerId);
  if (!team || !freeAgent) return franchise;

  const nextSalary = offer.salary;
  if (teamSalaryTotal(team) + nextSalary > team.salaryCap) return franchise;

  const signedPlayer = withFreshContract(
    {
      ...freeAgent,
      id: `${team.id}:${freeAgent.prospect.id}:fa:${Date.now().toString(36)}`,
      yearsWithTeam: freeAgent.formerTeamId === team.id ? freeAgent.yearsWithTeam : 0,
      happiness: clamp(freeAgent.happiness + (offer.salary >= calculateMarketSalary(freeAgent) ? 2 : 1), 1, 10),
      desireToLeave: clamp(freeAgent.desireToLeave - 2, 1, 10),
      morale: clamp(freeAgent.morale + 8, 12, 98),
      status: getPlayerStatusLabel(clamp(freeAgent.morale + 8, 12, 98)),
      recentTradeAdjustment: 0,
      formerTeamId: undefined,
      formerTeamName: undefined,
      marketOffers: undefined,
    },
    nextSalary,
    offer.years,
  );

  let nextTeam = {
    ...team,
    roster: [...team.roster, signedPlayer],
  };
  nextTeam = setDefaultActivePlayers(nextTeam);
  nextTeam.teamRating = computeTeamRatingFromRoster(nextTeam);

  return refreshFranchiseDynamics(
    upsertTeam(
      {
        ...franchise,
        freeAgents: franchise.freeAgents.filter((player) => player.id !== playerId),
      },
      nextTeam,
    ),
  );
}

function buildEmptyFreeAgencySummary(day: number): FreeAgencyDaySummary {
  return {
    day,
    signings: [],
    newOffers: [],
    biggestContracts: [],
    feed: [],
  };
}

function runAiOfferWave(franchise: FranchiseState, summary: FreeAgencyDaySummary): FranchiseState {
  let next = franchise;
  const aiTeams = [franchise.ai, ...franchise.otherTeams];
  const aggressionMultiplier = getAiAggressionMultiplier();

  for (const team of aiTeams) {
    const profile = teamNeedProfile(team);
    const desiredSize = desiredRosterSize(team);
    const urgency = profile.rosterNeed + profile.depthNeed + profile.staminaNeed;
    const baseOffers =
      team.roster.length < MIN_TEAM_ROSTER_SIZE ? 3 : team.roster.length < desiredSize ? 2 : urgency > 14 ? 2 : 1;
    const maxOffers = clamp(Math.round(baseOffers * aggressionMultiplier), 1, 4);

    const targets = next.freeAgents
      .slice()
      .sort((a, b) => {
        const planA = buildAiOfferForPlayer(next, team, a);
        const planB = buildAiOfferForPlayer(next, team, b);
        const fitA = computePersonalityFit(team, a);
        const fitB = computePersonalityFit(team, b);
        const scoreA =
          planA.evaluation.acceptanceOdds +
          teamNeedScore(team, a) * 0.18 +
          fitA * 0.2 +
          (planA.role === 'starter' ? 8 : planA.role === 'rotation' ? 4 : 1);
        const scoreB =
          planB.evaluation.acceptanceOdds +
          teamNeedScore(team, b) * 0.18 +
          fitB * 0.2 +
          (planB.role === 'starter' ? 8 : planB.role === 'rotation' ? 4 : 1);
        return scoreB - scoreA;
      })
      .slice(0, 6);

    let offersMade = 0;
    for (const target of targets) {
      if (offersMade >= maxOffers) break;
      const plan = buildAiOfferForPlayer(next, team, target);
      if (!plan.capOkay || plan.evaluation.acceptanceOdds < 28 - Math.round((aggressionMultiplier - 1) * 12)) continue;
      if (computePersonalityFit(team, target) <= 36) continue;
      if (plan.role === 'bench' && team.roster.length >= desiredSize && team.teamRating >= 8) continue;

      next = recordMarketOffer(
        next,
        target.id,
        team,
        plan.offer,
        plan.evaluation.happinessMeter,
        plan.role,
        plan.evaluation.acceptanceOdds,
      );
      summary.newOffers.push({
        playerId: target.id,
        playerName: target.prospect.name,
        teamId: team.id,
        teamName: team.name,
        salary: plan.offer.salary,
        years: plan.offer.years,
        role: plan.role,
        acceptanceOdds: plan.evaluation.acceptanceOdds,
      });
      offersMade += 1;
    }
  }

  return next;
}

function resolveFreeAgencyDay(franchise: FranchiseState, summary: FreeAgencyDaySummary): FranchiseState {
  let next = franchise;
  const totalDays = franchise.freeAgencyState?.totalDays ?? FREE_AGENCY_TOTAL_DAYS;
  const currentDay = franchise.freeAgencyState?.currentDay ?? 1;

  for (const player of next.freeAgents.slice().sort((a, b) => freeAgentValue(b) - freeAgentValue(a))) {
    const offers = sortMarketOffers(player);
    if (!offers.length) continue;

    const topOffer = offers[0];
    const secondOffer = offers[1];
    const patienceThreshold = clamp(62 + player.prospect.potential * 2 + player.desireToLeave * 2 - player.happiness * 2 - currentDay * 5, 35, 92);
    const topScore =
      topOffer.happiness * 0.62 +
      (topOffer.acceptanceOdds ?? topOffer.happiness) * 0.28 +
      (topOffer.role === 'starter' ? 9 : topOffer.role === 'rotation' ? 5 : 0);
    const biddingWarPressure = secondOffer
      ? Math.abs((secondOffer.acceptanceOdds ?? secondOffer.happiness) - (topOffer.acceptanceOdds ?? topOffer.happiness)) <= 6 &&
        Math.abs(secondOffer.salary - topOffer.salary) <= 8_000
      : false;
    const mustDecide = currentDay >= totalDays || player.prospect.overall < 76 || topOffer.happiness >= 88;
    const shouldWait = !mustDecide && (topScore < patienceThreshold || biddingWarPressure);
    if (shouldWait) {
      if (biddingWarPressure) {
        summary.feed.push(`Bidding war heating up for ${player.prospect.name}.`);
      }
      continue;
    }

    const acceptanceLine = currentDay >= totalDays ? 44 : currentDay >= totalDays - 1 ? 54 : 66;
    const decisionScore = topScore + currentDay * 3 + (player.formerTeamId === topOffer.teamId ? 10 : 0);
    if (decisionScore < acceptanceLine) continue;

    summary.signings.push({
      playerId: player.id,
      playerName: player.prospect.name,
      teamId: topOffer.teamId,
      teamName: topOffer.teamName,
      salary: topOffer.salary,
      years: topOffer.years,
      role: topOffer.role,
    });
    summary.feed.push(`${topOffer.teamName} signs ${player.prospect.name} to a ${topOffer.years}-year deal.`);
    next = signFreeAgentToTeam(next, topOffer.teamId, player.id, { salary: topOffer.salary, years: topOffer.years });
  }

  summary.biggestContracts = summary.signings
    .slice()
    .sort((a, b) => b.salary - a.salary || b.years - a.years)
    .slice(0, 3)
    .map((entry) => ({
      playerName: entry.playerName,
      teamName: entry.teamName,
      salary: entry.salary,
      years: entry.years,
    }));

  if (!summary.feed.length) {
    summary.feed.push('Quiet market day. Teams are still weighing their next moves.');
  }

  return next;
}

function finalizeAiRosterDepth(franchise: FranchiseState): FranchiseState {
  let next = franchise;
  const aiTeams = [franchise.ai, ...franchise.otherTeams];

  for (const team of aiTeams) {
    let workingTeam = team;
    let market = next.freeAgents.slice().sort((a, b) => freeAgentValue(b) - freeAgentValue(a));
    while (workingTeam.roster.length < MIN_TEAM_ROSTER_SIZE && market.length) {
      const target = market.find((player) => teamSalaryTotal(workingTeam) + Math.max(14_000, Math.round(calculateMarketSalary(player) * 0.78)) <= workingTeam.salaryCap);
      if (!target) break;
      const lowCost = clamp(Math.max(14_000, Math.round(calculateMarketSalary(target) * 0.78)), 14_000, 72_000);
      next = signFreeAgentToTeam(next, workingTeam.id, target.id, { salary: lowCost, years: 2 });
      workingTeam = getAllTeams(next).find((entry) => entry.id === team.id) ?? workingTeam;
      market = next.freeAgents.slice().sort((a, b) => freeAgentValue(b) - freeAgentValue(a));
    }
  }

  return refreshFranchiseDynamics(next);
}

function seedAiMarketOffers(franchise: FranchiseState): FranchiseState {
  const summary = buildEmptyFreeAgencySummary(franchise.freeAgencyState?.currentDay ?? 1);
  return refreshFranchiseDynamics(runAiOfferWave(franchise, summary));
}

export function advanceFreeAgencyDay(franchise: FranchiseState): { updated: FranchiseState; summary: FreeAgencyDaySummary } {
  if (!franchise.freeAgencyPending) {
    const summary = buildEmptyFreeAgencySummary(0);
    summary.feed.push('Free agency is not active.');
    return { updated: franchise, summary };
  }

  const freeAgencyState = franchise.freeAgencyState ?? {
    currentDay: 1,
    totalDays: FREE_AGENCY_TOTAL_DAYS,
    dailySummaries: [],
  };
  const summary = buildEmptyFreeAgencySummary(freeAgencyState.currentDay);
  let next: FranchiseState = { ...franchise, freeAgencyState };

  next = runAiOfferWave(next, summary);
  next = resolveFreeAgencyDay(next, summary);

  const nextDay =
    freeAgencyState.currentDay >= freeAgencyState.totalDays
      ? freeAgencyState.totalDays
      : freeAgencyState.currentDay + 1;

  next = {
    ...next,
    freeAgencyState: {
      ...freeAgencyState,
      currentDay: nextDay,
      dailySummaries: [...freeAgencyState.dailySummaries, summary].slice(-10),
    },
  };

  return { updated: refreshFranchiseDynamics(next), summary };
}

export function reSignPlayer(
  franchise: FranchiseState,
  playerId: string,
  offer: { salary: number; years: number },
): {
  updated: FranchiseState;
  accepted: boolean;
  reason?: string;
  evaluation: ReturnType<typeof evaluateContractOffer>;
  counterOffer?: { salary: number; years: number };
} {
  if (!franchise.freeAgencyPending) {
    return {
      updated: franchise,
      accepted: false,
      reason: 'Extensions are handled during end-of-season free agency now.',
      evaluation: {
        minSalary: 0,
        targetSalary: 0,
        maxSalary: 0,
        acceptanceOdds: 0,
        happinessMeter: 0,
        loyaltyMeter: 0,
        teamAppeal: 0,
        likelyToRefuse: true,
        reasons: ['Wait for end-of-season free agency to negotiate contracts.'],
      },
    };
  }

  const player = franchise.user.roster.find((entry) => entry.id === playerId);
  if (!player) {
    return {
      updated: franchise,
      accepted: false,
      reason: 'Player not found.',
      evaluation: {
        minSalary: 0,
        targetSalary: 0,
        maxSalary: 0,
        acceptanceOdds: 0,
        happinessMeter: 0,
        loyaltyMeter: 0,
        teamAppeal: 0,
        likelyToRefuse: true,
        reasons: ['Player not found.'],
      },
    };
  }

  const evaluation = evaluateContractOffer(franchise, franchise.user.id, player, offer, { isReSign: true });
  const adjustedSalaryTotal = teamSalaryTotal(franchise.user) - player.contract.salary + offer.salary;
  if (adjustedSalaryTotal > franchise.user.salaryCap) {
    return {
      updated: franchise,
      accepted: false,
      reason: 'This deal would push you over the hard cap.',
      evaluation,
    };
  }

  if (evaluation.acceptanceOdds < 48) {
    return {
      updated: franchise,
      accepted: false,
      reason: 'Player rejected the extension.',
      evaluation,
      counterOffer: evaluation.acceptanceOdds >= 34 ? contractCounter(player, offer) : undefined,
    };
  }

  const updatedUser = {
    ...franchise.user,
    roster: franchise.user.roster.map((entry) =>
      entry.id === playerId
        ? {
            ...withFreshContract(entry, offer.salary, offer.years),
            happiness: clamp(entry.happiness + (offer.salary >= evaluation.targetSalary ? 2 : 1), 1, 10),
            desireToLeave: clamp(entry.desireToLeave - 2, 1, 10),
          }
        : entry,
    ),
  };

  return {
    updated: refreshFranchiseDynamics({ ...franchise, user: updatedUser }),
    accepted: true,
    evaluation,
  };
}

export function signFreeAgent(
  franchise: FranchiseState,
  playerId: string,
  offer: { salary: number; years: number },
): {
  updated: FranchiseState;
  accepted: boolean;
  submitted?: boolean;
  reason?: string;
  evaluation: ReturnType<typeof evaluateContractOffer>;
  counterOffer?: { salary: number; years: number };
} {
  if (!franchise.freeAgencyPending) {
    return {
      updated: franchise,
      accepted: false,
      reason: 'Free agency is only available after the season ends.',
      evaluation: {
        minSalary: 0,
        targetSalary: 0,
        maxSalary: 0,
        acceptanceOdds: 0,
        happinessMeter: 0,
        loyaltyMeter: 0,
        teamAppeal: 0,
        likelyToRefuse: true,
        reasons: ['Wait until end-of-season free agency opens.'],
      },
    };
  }

  const team = franchise.user;
  const freeAgent = franchise.freeAgents.find((player) => player.id === playerId);
  if (!freeAgent) {
    return {
      updated: franchise,
      accepted: false,
      reason: 'Free agent not found.',
      evaluation: {
        minSalary: 0,
        targetSalary: 0,
        maxSalary: 0,
        acceptanceOdds: 0,
        happinessMeter: 0,
        loyaltyMeter: 0,
        teamAppeal: 0,
        likelyToRefuse: true,
        reasons: ['Free agent not found.'],
      },
    };
  }
  const role = determineOfferRole(team, freeAgent);
  const evaluation = evaluateContractOffer(franchise, team.id, freeAgent, offer, { role });
  const offerBoard = recordMarketOffer(franchise, playerId, team, offer, evaluation.happinessMeter, role, evaluation.acceptanceOdds);
  if (teamSalaryTotal(team) + offer.salary > team.salaryCap + getCapAllowance()) {
    return {
      updated: refreshFranchiseDynamics(offerBoard),
      accepted: false,
      reason: 'That contract does not fit under the $350k hard cap.',
      evaluation,
    };
  }

  if (evaluation.acceptanceOdds < 34) {
    return {
      updated: refreshFranchiseDynamics(offerBoard),
      accepted: false,
      submitted: false,
      reason: 'That offer is too weak to stay alive on the market.',
      evaluation,
      counterOffer: contractCounter(freeAgent, offer),
    };
  }

  const currentDay = franchise.freeAgencyState?.currentDay ?? 1;
  const totalDays = franchise.freeAgencyState?.totalDays ?? FREE_AGENCY_TOTAL_DAYS;
  const immediateAccept =
    evaluation.acceptanceOdds >= 88 ||
    (currentDay >= totalDays && evaluation.acceptanceOdds >= 62) ||
    (freeAgent.formerTeamId === team.id && freeAgent.happiness >= 8 && evaluation.acceptanceOdds >= 74);

  if (!immediateAccept) {
    const patience = freeAgent.prospect.potential >= 8 || freeAgent.prospect.overall >= 84;
    return {
      updated: refreshFranchiseDynamics(offerBoard),
      accepted: false,
      submitted: true,
      reason: patience
        ? 'Offer submitted. The player wants to see if the market improves.'
        : 'Offer submitted. The player is weighing your bid against the market.',
      evaluation,
      counterOffer: evaluation.acceptanceOdds >= 48 && evaluation.acceptanceOdds < 62 ? contractCounter(freeAgent, offer) : undefined,
    };
  }

  return {
    updated: refreshFranchiseDynamics(signFreeAgentToTeam(offerBoard, team.id, playerId, offer)),
    accepted: true,
    submitted: true,
    evaluation,
  };
}

function generateOffseasonFreeAgents(franchise: FranchiseState, count: number) {
  const templateProspects = loadDraftProspects(franchise.seasonIndex + 40);
  return templateProspects.slice(0, count).map((prospect, index) => {
    const base = createTeamPlayer('fa', prospect, 9);
    return {
      ...base,
      id: `fa:${franchise.seasonIndex}:${prospect.id}:${index}`,
      contract: {
        seasonsLeft: 1,
        salary: Math.max(14_000, Math.round(calculateMarketSalary(base) * 0.82)),
      },
      happiness: clamp(base.happiness + 1, 1, 10),
      desireToLeave: clamp(base.desireToLeave + 1, 1, 10),
      formerTeamId: undefined,
      formerTeamName: undefined,
      marketOffers: [],
    };
  });
}

export function processEndOfSeason(franchise: FranchiseState): FranchiseState {
  const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const expiredFreeAgents: TeamPlayer[] = [];

  const nextTeams = leagueTeams.map((team) => {
    const retainedRoster: TeamPlayer[] = [];
    const successBoost = teamSuccessScore(franchise, team.id) >= 0.6 ? 1 : teamSuccessScore(franchise, team.id) <= 0.3 ? -1 : 0;
    for (const player of team.roster) {
      const nextYears = Math.max(0, player.contract.seasonsLeft - 1);
      const nextPlayer = {
        ...withFreshContract(player, player.contract.salary, nextYears),
        yearsWithTeam: player.yearsWithTeam + 1,
        happiness: clamp(player.happiness + successBoost + (playerPerGameScore(player) >= 12 ? 1 : 0), 1, 10),
        desireToLeave: clamp(player.desireToLeave + (successBoost < 0 ? 1 : -1), 1, 10),
      };
      if (nextYears <= 0) {
        expiredFreeAgents.push({
          ...nextPlayer,
          formerTeamId: team.id,
          formerTeamName: team.name,
          marketOffers: [],
        });
        continue;
      }
      retainedRoster.push(nextPlayer);
    }

    let nextTeam = {
      ...team,
      roster: retainedRoster,
      contractSeason: team.contractSeason + 1,
    };
    nextTeam = setDefaultActivePlayers(nextTeam);
    nextTeam.teamRating = computeTeamRatingFromRoster(nextTeam);
    return nextTeam;
  });

  const baseState: FranchiseState = {
    ...franchise,
    user: nextTeams.find((team) => team.id === franchise.user.id) ?? franchise.user,
    ai: nextTeams.find((team) => team.id === franchise.ai.id) ?? franchise.ai,
    otherTeams: franchise.otherTeams.map((team) => nextTeams.find((entry) => entry.id === team.id) ?? team),
    freeAgents: resetFreeAgentSeasonStats([
      ...franchise.freeAgents,
      ...expiredFreeAgents,
      ...generateOffseasonFreeAgents(
        franchise,
        Math.max(18, leagueTeams.length * 2 - (franchise.freeAgents.length + expiredFreeAgents.length)),
      ),
    ]).map((player) => ({
      ...player,
      marketOffers: player.marketOffers ?? [],
    })),
    freeAgencyPending: true,
    freeAgencyState: {
      currentDay: 1,
      totalDays: FREE_AGENCY_TOTAL_DAYS,
      dailySummaries: [],
    },
  };

  return refreshFranchiseDynamics(seedAiMarketOffers(baseState));
}

export function completeFreeAgencyPhase(franchise: FranchiseState): FranchiseState {
  let advanced = franchise;
  const totalDays = advanced.freeAgencyState?.totalDays ?? FREE_AGENCY_TOTAL_DAYS;
  while ((advanced.freeAgencyState?.dailySummaries.length ?? 0) < totalDays) {
    advanced = advanceFreeAgencyDay(advanced).updated;
  }
  advanced = finalizeAiRosterDepth(advanced);
  return refreshFranchiseDynamics({
    ...advanced,
    freeAgencyPending: false,
    freeAgencyState: advanced.freeAgencyState
      ? {
          ...advanced.freeAgencyState,
          currentDay: advanced.freeAgencyState.totalDays,
        }
      : null,
  });
}

function createDraftPickOwnershipMap(teams: TeamState[], maxRounds: number) {
  const ownership = new Map<string, string>();
  for (const team of teams) {
    for (const pick of team.draftPicks) {
      ownership.set(`${pick.fromTeamId}:${pick.round}`, pick.ownerTeamId ?? team.id);
    }
  }

  for (const team of teams) {
    for (let round = 1; round <= maxRounds; round += 1) {
      const key = `${team.id}:${round}`;
      if (!ownership.has(key)) ownership.set(key, team.id);
    }
  }

  return ownership;
}

function createDraftPickAssetsForTeams(teams: TeamState[], availableProspectsLength: number, standings: DraftStandingRow[]) {
  const teamsCount = teams.length;
  const requiredRounds = Math.max(1, Math.ceil(availableProspectsLength / teamsCount));
  const ownershipMap = createDraftPickOwnershipMap(teams, requiredRounds);
  const teamIdsByWorstRecord = teams
    .slice()
    .sort((a, b) => {
      const rowA = standings.find((row) => row.teamId === a.id);
      const rowB = standings.find((row) => row.teamId === b.id);
      const winsA = rowA?.wins ?? 0;
      const winsB = rowB?.wins ?? 0;
      const pdA = (rowA?.pointsFor ?? 0) - (rowA?.pointsAgainst ?? 0);
      const pdB = (rowB?.pointsFor ?? 0) - (rowB?.pointsAgainst ?? 0);
      return winsA - winsB || pdA - pdB || a.teamRating - b.teamRating;
    })
    .map((team) => team.id);

  const draftOrderTeamIds: string[] = [];
  for (let round = 1; round <= requiredRounds; round += 1) {
    for (const sourceTeamId of teamIdsByWorstRecord) {
      draftOrderTeamIds.push(ownershipMap.get(`${sourceTeamId}:${round}`) ?? sourceTeamId);
    }
  }

  const trimmedDraftOrderTeamIds = draftOrderTeamIds.slice(0, availableProspectsLength);
  const pickOwners: Record<string, DraftPickAsset[]> = Object.fromEntries(teams.map((team) => [team.id, []]));
  trimmedDraftOrderTeamIds.forEach((ownerTeamId, index) => {
    const round = Math.floor(index / teamsCount) + 1;
    const pickPosition = index + 1;
    const sourceTeamId = teamIdsByWorstRecord[index % teamsCount];
    pickOwners[ownerTeamId].push({
      id: `pick-${round}-${pickPosition}-${sourceTeamId}`,
      fromTeamId: sourceTeamId,
      ownerTeamId,
      round,
      pickPosition,
      value: 0,
    });
  });

  return {
    maxRounds: requiredRounds,
    draftOrderTeamIds: trimmedDraftOrderTeamIds,
    pickOwners,
  };
}

function computeTeamRatingFromRoster(team: TeamState): number {
  return depthAwareTeamRating(team);
}

function computeDraftPickValue(pick: DraftPickAsset, team: TeamState, franchise?: FranchiseState): number {
  const roundWeight = (5 - pick.round) * 1200;
  const positionWeight = franchise?.season && franchise.season.phase === 'complete'
    ? Math.max(0, 1200 - (pick.pickPosition - 1) * 12)
    : 600; // unknown pre-lottery: neutral value

  let baseValue = Math.max(250, roundWeight + positionWeight);

  if (franchise?.seasonStandings && franchise.seasonStandings.length > 0) {
    const teamRankIndex = franchise.seasonStandings.findIndex((r) => r.teamId === pick.fromTeamId);
    const teamCount = franchise.seasonStandings.length;

    if (teamRankIndex >= 0) {
      const badnessFactor = teamRankIndex / Math.max(1, teamCount - 1); // 0 best, 1 worst
      const scaled = baseValue * (1 + badnessFactor * 0.55);
      baseValue = Math.round(scaled);
    }
  }

  return baseValue;
}

export function computeTradePackageValue(
  team: TeamState,
  playerIds: string[],
  pickIds: string[],
  franchise?: FranchiseState,
): number {
  const players = team.roster.filter((p) => playerIds.includes(p.id));
  const playerValue = players.reduce((sum, p) => sum + computePlayerTradeValue(team, p), 0);
  const picks = team.draftPicks.filter((p) => pickIds.includes(p.id));
  const pickValue = picks.reduce((sum, p) => sum + computeDraftPickValue(p, team, franchise), 0);
  return playerValue + pickValue;
}

export function evaluateTradePackage(
  userPackage: { playerIds: string[]; pickIds: string[] },
  aiPackage: { playerIds: string[]; pickIds: string[] },
  franchise: FranchiseState,
): { score: number; color: 'good' | 'fair' | 'bad'; label: string } {
  const userValue = computeTradePackageValue(franchise.user, userPackage.playerIds, userPackage.pickIds, franchise);
  const aiValue = computeTradePackageValue(franchise.ai, aiPackage.playerIds, aiPackage.pickIds, franchise);
  const diff = Math.abs(userValue - aiValue);
  const base = Math.max(
    1,
    Math.round(100 - (diff / Math.max(1, (userValue + aiValue) / 2)) * 100 + getDifficultyTuning().tradeAcceptanceBias * 35),
  );
  let label: 'bad' | 'fair' | 'good' = 'good';
  if (base < 40) label = 'bad';
  else if (base < 70) label = 'fair';
  return {
    score: base,
    color: label,
    label: label === 'good' ? 'Balanced' : label === 'fair' ? 'Slightly uneven' : 'Uneven',
  };
}

export type TradeCounterOffer = {
  fromTeamId: string;
  toTeamId: string;
  fromPlayerIds: string[];
  toPlayerIds: string[];
  fromPickIds: string[];
  toPickIds: string[];
  message: string;
  flexibility?: number;
};

function moveDate(current: CalendarDate, days: number): CalendarDate {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let y = current.year;
  let m = current.month;
  let d = current.day + days;
  while (true) {
    const max = daysInMonth[m - 1] + (m === 2 && y % 4 === 0 ? 1 : 0);
    if (d <= max) break;
    d -= max;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return { year: y, month: m, day: d };
}

export function advanceDate(franchise: FranchiseState, days: number): FranchiseState {
  return { ...franchise, currentDate: moveDate(franchise.currentDate, days) };
}

export function ensureSeasonReady(franchise: FranchiseState): FranchiseState {
  if (!franchise.draftCompleted) return franchise;
  if (franchise.season) return franchise;

  const allTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const seasonStandings = allTeams
    .map((t) => ({
      teamId: t.id,
      teamName: t.name,
      managerName: t.managerName,
      logoText: t.logoText,
      logoColor: t.logoColor,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      streak: 'â€”' as const,
      streakCount: 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsAgainst - (a.pointsFor - a.pointsAgainst));

  const powerRankings = allTeams
    .map((t) => {
      const avgPotential = t.roster.length ? t.roster.reduce((s, p) => s + p.prospect.potential, 0) / t.roster.length : 5;
      const score = t.teamRating * 1.2 + avgPotential * 0.9;
      return {
        teamId: t.id,
        teamName: t.name,
        managerName: t.managerName,
        logoText: t.logoText,
        logoColor: t.logoColor,
        rank: 0,
        score,
      } satisfies PowerRankingRow;
    })
    .sort((a, b) => b.score - a.score)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  const season: SeasonState = {
    seasonId: `season-${franchise.seasonIndex}-${Date.now()}`,
    phase: 'regular',
    weeksTotal: 5,
    weekIndex: 0,
    games: buildRoundRobinWeeks(allTeams.map((t) => t.id), 5),
  };

  return refreshFranchiseDynamics({
    ...franchise,
    seasonStandings,
    powerRankings,
    season,
  });
}

export function prepareNextSeasonCycle(franchise: FranchiseState): FranchiseState {
  const processedFranchise = processEndOfSeason(franchise);
  const resetUser = resetTeamSeasonStats(processedFranchise.user);
  const resetAi = resetTeamSeasonStats(processedFranchise.ai);
  const resetOther = processedFranchise.otherTeams.map((team) => resetTeamSeasonStats(team));
  const teams = [resetUser, resetAi, ...resetOther];
  const availableProspects = ensureProspectPoolDepth(
    loadDraftProspects(franchise.seasonIndex + 1),
    teams.length,
    franchise.seasonIndex + 1,
  ).slice().sort((a, b) => a.rank - b.rank);
  const nextStandings = franchise.seasonStandings.length
    ? franchise.seasonStandings.slice()
    : teams.map((team) => ({
        teamId: team.id,
        teamName: team.name,
        managerName: team.managerName,
        logoText: team.logoText,
        logoColor: team.logoColor,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        streak: 'â€”' as const,
        streakCount: 0,
      }));

  const { maxRounds, draftOrderTeamIds, pickOwners } = createDraftPickAssetsForTeams(teams, availableProspects.length, nextStandings);
  const attachPicks = (team: TeamState): TeamState => ({
    ...team,
    draftPicks: (pickOwners[team.id] ?? []).map((pick) => ({
      ...pick,
      value: computeDraftPickValue({ ...pick, value: 0 }, team, franchise),
    })),
  });

  return refreshFranchiseDynamics({
    ...franchise,
    user: attachPicks(resetUser),
    ai: attachPicks(resetAi),
    otherTeams: resetOther.map(attachPicks),
    freeAgents: resetFreeAgentSeasonStats(processedFranchise.freeAgents),
    freeAgencyPending: true,
    freeAgencyState: processedFranchise.freeAgencyState,
    draft: {
      round: 1,
      maxRounds,
      availableProspects,
      draftOrderTeamIds,
      currentPickIndex: 0,
      draftFeed: [],
      draftedByTeamId: {},
    },
    draftCompleted: false,
    season: null,
    currentDate: moveDate(franchise.currentDate, 21),
  });
}

export function applyTrade(
  franchise: FranchiseState,
  params: {
    fromTeamId: string;
    toTeamId: string;
    fromPlayerIds: string[];
    toPlayerIds: string[];
    fromPickIds: string[];
    toPickIds: string[];
  },
): { updated: FranchiseState; accepted: boolean; reason?: string; newsPost?: LeagueNewsPost } {
  const { fromTeamId, toTeamId, fromPlayerIds, toPlayerIds, fromPickIds, toPickIds } = params;
  const teams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const fromTeam = teams.find((t) => t.id === fromTeamId);
  const toTeam = teams.find((t) => t.id === toTeamId);
  if (!fromTeam || !toTeam) return { updated: franchise, accepted: false, reason: 'Team not found' };

  const fromPlayers = fromTeam.roster.filter((p) => fromPlayerIds.includes(p.id));
  const toPlayers = toTeam.roster.filter((p) => toPlayerIds.includes(p.id));

  if (fromPlayers.length !== fromPlayerIds.length || toPlayers.length !== toPlayerIds.length) {
    return { updated: franchise, accepted: false, reason: 'Invalid player IDs in trade' };
  }

  const fromPicks = fromTeam.draftPicks.filter((p) => fromPickIds.includes(p.id));
  const toPicks = toTeam.draftPicks.filter((p) => toPickIds.includes(p.id));

  const fromValue = computeTradePackageValue(fromTeam, fromPlayerIds, fromPickIds);
  const toValue = computeTradePackageValue(toTeam, toPlayerIds, toPickIds);

  const ratio = toValue / Math.max(1, fromValue);

  // AI tolerance depends on season timing and needs.
  const seasonPhase = franchise.season?.phase ?? 'regular';
  const volatility = seasonPhase === 'regular' ? 1.0 : seasonPhase === 'playoffs' ? 0.6 : 1.2;

  const acceptThreshold = 0.68 * volatility;

  if (ratio < acceptThreshold || ratio > 1 / acceptThreshold) {
    return { updated: franchise, accepted: false, reason: 'AI rejected the package as not fair' };
  }

  // execute player transfer
  const updateTeam = (team: TeamState, outPlayers: TeamPlayer[], inPlayers: TeamPlayer[], outPicks: DraftPickAsset[], inPicks: DraftPickAsset[]) => {
    const noOutPlayers = team.roster.filter((p) => !outPlayers.some((o) => o.id === p.id));
    const keptPicks = team.draftPicks.filter((p) => !outPicks.some((o) => o.id === p.id));
    const incomingPicksUpdated = inPicks.map((p) => ({ ...p, ownerTeamId: team.id }));

    const convertedPlayers = inPlayers.map((p) => ({
      ...p,
      id: `${team.id}:${p.prospect.id}:${p.acquiredRound}:traded`,
      yearsWithTeam: 0,
      happiness: clamp(p.happiness - 1, 1, 10),
      desireToLeave: clamp(p.desireToLeave + 1, 1, 10),
    }));

    let nextTeam = {
      ...team,
      roster: [...noOutPlayers, ...convertedPlayers],
      draftPicks: [...keptPicks, ...incomingPicksUpdated],
    };
    nextTeam = setDefaultActivePlayers(nextTeam);
    nextTeam.teamRating = computeTeamRatingFromRoster(nextTeam);
    const adjustedIncoming = convertedPlayers.map((player) => applyTradePlayerMood(player, nextTeam, franchise));
    nextTeam = {
      ...nextTeam,
      roster: [...noOutPlayers, ...adjustedIncoming],
    };
    nextTeam = setDefaultActivePlayers(nextTeam);
    nextTeam.teamRating = computeTeamRatingFromRoster(nextTeam);
    return nextTeam;
  };

  const updatedFrom = updateTeam(fromTeam, fromPlayers, toPlayers, fromPicks, toPicks);
  const updatedTo = updateTeam(toTeam, toPlayers, fromPlayers, toPicks, fromPicks);

  const leagueTeamsMap = new Map<string, TeamState>(teams.map((t) => [t.id, t]));
  leagueTeamsMap.set(updatedFrom.id, updatedFrom);
  leagueTeamsMap.set(updatedTo.id, updatedTo);

  const updatedUser = leagueTeamsMap.get(franchise.user.id) ?? franchise.user;
  const updatedAi = leagueTeamsMap.get(franchise.ai.id) ?? franchise.ai;
  const updatedOther = franchise.otherTeams.map((t) => leagueTeamsMap.get(t.id) ?? t);
  const updatedTeams = [updatedUser, updatedAi, ...updatedOther];
  const updatedDraft = franchise.draftCompleted
    ? franchise.draft
    : {
        ...franchise.draft,
        draftOrderTeamIds: franchise.draft.draftOrderTeamIds.map((teamId, index) => {
          if (index < franchise.draft.currentPickIndex) return teamId;
          const slotOwner = updatedTeams.find((team) => team.draftPicks.some((pick) => pick.pickPosition === index + 1));
          return slotOwner?.id ?? teamId;
        }),
      };

  const post: LeagueNewsPost = {
    id: `trade-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAtMs: Date.now(),
    type: 'trade',
    icon: '🤝',
    badge: 'TRADE',
    badgeTone: 'good',
    text: `${fromTeam.name} trades ${fromPlayers.map((p) => p.prospect.name).join(', ')}${fromPicks.length ? ' + picks' : ''} to ${toTeam.name} for ${toPlayers.map((p) => p.prospect.name).join(', ')}${toPicks.length ? ' + picks' : ''}.`,
  };

  const tradeEntry: TradeLogEntry = {
    id: `trade-log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAtMs: Date.now(),
    fromTeamId,
    toTeamId,
    outgoingPlayerIds: fromPlayerIds,
    incomingPlayerIds: toPlayerIds,
    outgoingPickIds: fromPickIds,
    incomingPickIds: toPickIds,
    ratingDelta: updatedUser.teamRating - franchise.user.teamRating,
    description: post.text,
  };

  return {
    updated: refreshFranchiseDynamics({
      ...franchise,
      user: updatedUser,
      ai: updatedAi,
      otherTeams: updatedOther,
      draft: updatedDraft,
      tradeHistory: [...franchise.tradeHistory, tradeEntry],
    }),
    accepted: true,
    newsPost: post,
  };
}

export function userDraftPickAuto(franchise: FranchiseState, prospectId: string): FranchiseState {
  if (franchise.draftCompleted) return franchise;

  const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];

  const currentPickTeamId = franchise.draft.draftOrderTeamIds[franchise.draft.currentPickIndex];
  if (currentPickTeamId !== franchise.user.id) return franchise;

  const pickProspects = [...franchise.draft.availableProspects];
  const pickIndex = pickProspects.findIndex((p) => p.id === prospectId);
  if (pickIndex < 0) return franchise;
  const pickedProspect = pickProspects[pickIndex];

  const draftedByTeamId = { ...franchise.draft.draftedByTeamId };
  const draftFeed = [...franchise.draft.draftFeed];

  const nextTeams = leagueTeams.slice();
  const getTeam = (teamId: string) => nextTeams.find((t) => t.id === teamId);

  const draftForTeam = (teamId: string, prospect: Prospect, isHuman: boolean, pickNumber: number) => {
    const team = getTeam(teamId);
    if (!team) return;

    const roundAtPick = Math.floor((pickNumber - 1) / nextTeams.length) + 1;
    const salary = computeSalary(prospect.overall);
    // Consume prospect from pool first.
    const poolIdx = pickProspects.findIndex((p) => p.id === prospect.id);
    if (poolIdx >= 0) pickProspects.splice(poolIdx, 1);

    let updated: TeamState = { ...team };
    if (canAfford(team, salary)) {
      const tp = createTeamPlayer(team.id, prospect, roundAtPick);
      updated = {
        ...team,
        roster: [...team.roster, tp],
        cash: team.cash - Math.round(salary * 0.35),
      };
      // Ensure every drafted team has a valid 2v2 lineup for season simulation.
      updated = setDefaultActivePlayers(updated);
      updated.teamRating = computeTeamRatingFromRoster(updated);
    } else {
      updated.teamRating = computeTeamRatingFromRoster(updated);
    }

    const teamIdx = nextTeams.findIndex((t) => t.id === updated.id);
    if (teamIdx >= 0) nextTeams[teamIdx] = updated;

    draftedByTeamId[teamId] = [...(draftedByTeamId[teamId] ?? []), prospect.id];

    const surpriseLabel = prospect.potential >= 8 ? 'Trophy Potential' : 'Strategic Fit';
    const pressRelease = isHuman
      ? `${updated.name} (You) takes ${prospect.name}. Shooting ${prospect.categories.shooting}, Defense ${prospect.categories.defense}.`
      : `${updated.name} selects ${prospect.name}. Potential ${prospect.potential}/10.`;

    draftFeed.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      pickNumber,
      teamId: updated.id,
      teamName: updated.name,
      managerName: updated.managerName,
      teamLogoText: updated.logoText,
      teamLogoColor: updated.logoColor,
      prospectId: prospect.id,
      prospectName: prospect.name,
      position: prospect.position,
      overall: prospect.overall,
      potential: prospect.potential,
      categories: prospect.categories,
      surpriseLabel,
      pressRelease,
      createdAtMs: Date.now(),
    });
  };

  draftForTeam(franchise.user.id, pickedProspect, true, franchise.draft.currentPickIndex + 1);

  // Advance cursor by 1, then let AI teams auto-pick until it’s the next user turn (or draft ends).
  let currentPickIndex = franchise.draft.currentPickIndex + 1;
  const totalPicks = franchise.draft.draftOrderTeamIds.length;

  while (currentPickIndex < totalPicks) {
    const nextTeamId = franchise.draft.draftOrderTeamIds[currentPickIndex];
    if (nextTeamId === franchise.user.id) break;

    const nextTeam = nextTeams.find((t) => t.id === nextTeamId);
    if (!nextTeam) break;

    const topPool = pickProspects.slice(0, 10);
    const aiProspect = aiChooseProspect(topPool, nextTeam);
    draftForTeam(nextTeamId, aiProspect, false, currentPickIndex + 1);

    currentPickIndex += 1;
    // Update feed pickNumber to match the cursor.
    // (We set pickNumber at the time of drafting.)
  }

  const draftCompleted = currentPickIndex >= totalPicks;
  const nextRound = Math.floor(currentPickIndex / nextTeams.length) + 1;

  const nextDraft: DraftState = {
    ...franchise.draft,
    round: nextRound,
    currentPickIndex,
    availableProspects: pickProspects,
    draftFeed,
    draftedByTeamId,
  };

  const updatedUser = nextTeams.find((t) => t.id === franchise.user.id) ?? franchise.user;
  const updatedAi = nextTeams.find((t) => t.id === franchise.ai.id) ?? franchise.ai;
  const updatedOther = nextTeams.filter((t) => t.id !== franchise.user.id && t.id !== franchise.ai.id);

  if (!draftCompleted) {
    return refreshFranchiseDynamics({
      ...franchise,
      user: updatedUser,
      ai: updatedAi,
      otherTeams: updatedOther,
      draft: nextDraft,
      draftCompleted: false,
      freeAgencyPending: false,
      freeAgencyState: null,
    });
  }

  // Finalize season standings + power rankings after draft completion.
  const allTeams = [updatedUser, updatedAi, ...updatedOther];
  const teamToStanding = (t: TeamState): DraftStandingRow => {
    return {
      teamId: t.id,
      teamName: t.name,
      managerName: t.managerName,
      logoText: t.logoText,
      logoColor: t.logoColor,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      streak: '—',
      streakCount: 0,
    };
  };

  const seasonStandings = allTeams.map(teamToStanding).sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsAgainst - (a.pointsFor - a.pointsAgainst));

  const powerRankings = allTeams
    .map((t) => {
      const avgPotential = t.roster.length ? t.roster.reduce((s, p) => s + p.prospect.potential, 0) / t.roster.length : 5;
      const score = t.teamRating * 1.2 + avgPotential * 0.9;
      return {
        teamId: t.id,
        teamName: t.name,
        managerName: t.managerName,
        logoText: t.logoText,
        logoColor: t.logoColor,
        rank: 0,
        score,
      } satisfies PowerRankingRow;
    })
    .sort((a, b) => b.score - a.score)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  const season: SeasonState = {
    seasonId: `season-${franchise.seasonIndex + 1}-${Date.now()}`,
    phase: 'regular',
    weeksTotal: 5,
    weekIndex: 0,
    games: buildRoundRobinWeeks(allTeams.map((t) => t.id), 5),
  };

  return refreshFranchiseDynamics({
    ...franchise,
    user: updatedUser,
    ai: updatedAi,
    otherTeams: updatedOther,
    draft: nextDraft,
    draftCompleted: true,
    freeAgencyPending: false,
    freeAgencyState: null,
    seasonIndex: franchise.seasonIndex + 1,
    seasonStandings,
    powerRankings,
    season,
  });
}

export function setActivePlayers(
  franchise: FranchiseState,
  team: 'user' | 'ai',
  active: [string, string],
): FranchiseState {
  const t = franchise[team];
  const rosterIds = new Set(t.roster.map((p) => p.id));
  const a0 = active[0] && rosterIds.has(active[0]) ? active[0] : '';
  const a1 = active[1] && rosterIds.has(active[1]) ? active[1] : '';
  const nextTeam: TeamState = { ...t, activePlayerIds: [a0, a1] };
  return refreshFranchiseDynamics({ ...franchise, [team]: nextTeam } as FranchiseState);
}

export function setRotationMode(
  franchise: FranchiseState,
  team: 'user' | 'ai',
  rotationMode: TeamState['rotationMode'],
): FranchiseState {
  const nextTeam: TeamState = {
    ...franchise[team],
    rotationMode,
  };
  nextTeam.teamRating = computeTeamRatingFromRoster(nextTeam);
  return refreshFranchiseDynamics({ ...franchise, [team]: nextTeam } as FranchiseState);
}

function deriveOverallFromCategories(categories: Prospect['categories']): number {
  return deriveOverall100({ categories });
}

function statsForPhase(player: TeamPlayer, phase: 'regular' | 'playoffs' | 'complete' = 'regular') {
  return phase === 'playoffs' ? player.playoffStats : player.seasonStats;
}

function perGame(stats: TeamPlayer['seasonStats']) {
  const n = Math.max(1, stats.matchesPlayed);
  return {
    points: stats.points / n,
    assists: stats.assists / n,
    rebounds: stats.rebounds / n,
    steals: stats.steals / n,
    blocks: stats.blocks / n,
  };
}

function teamNeeds(team: TeamState) {
  if (!team.roster.length) return { shooting: 0.2, speed: 0.2, playmaking: 0.2, defense: 0.2 };
  const avg = (fn: (tp: TeamPlayer) => number) => team.roster.reduce((s, p) => s + fn(p), 0) / team.roster.length;

  const baseline = 7;
  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
  const aShooting = avg((p) => p.prospect.categories.shooting);
  const aSpeed = avg((p) => p.prospect.categories.speed);
  const aPlaymaking = avg((p) => p.prospect.categories.playmaking);
  const aDefense = avg((p) => p.prospect.categories.defense);

  const depthPenalty = clamp01((6.6 - getDepthScore(team)) / 6.6) * 0.18;

  return {
    shooting: clamp01((baseline - aShooting) / baseline + depthPenalty * 0.7),
    speed: clamp01((baseline - aSpeed) / baseline + depthPenalty * 0.4),
    playmaking: clamp01((baseline - aPlaymaking) / baseline + depthPenalty * 0.55),
    defense: clamp01((baseline - aDefense) / baseline + depthPenalty * 0.8),
  };
}

function roleMultiplierForTeam(team: TeamState, playerId: string) {
  const [ballHandlerId, offBallId] = team.activePlayerIds;
  const p = team.roster.find((x) => x.id === playerId);
  if (!p) return 1;

  if (playerId === ballHandlerId) {
    // Offense engine role.
    return 0.95 + (p.prospect.categories.shooting + p.prospect.categories.playmaking) / 18;
  }
  if (playerId === offBallId) {
    // Defensive anchor role.
    return 0.95 + p.prospect.categories.defense / 16;
  }
  return 1;
}

function teamLeaders(team: TeamState) {
  // Only 2v2 slots, but keep this flexible for future expansion.
  const top = (fn: (p: TeamPlayer) => number) => team.roster.slice().sort((a, b) => fn(b) - fn(a))[0];
  const pointsTop = top((p) => p.seasonStats.points);
  const assistsTop = top((p) => p.seasonStats.assists);
  const reboundsTop = top((p) => p.seasonStats.rebounds);
  const stealsTop = top((p) => p.seasonStats.steals);
  const blocksTop = top((p) => p.seasonStats.blocks);
  return {
    points: pointsTop && pointsTop.seasonStats.points > 0 ? pointsTop.id : '',
    assists: assistsTop && assistsTop.seasonStats.assists > 0 ? assistsTop.id : '',
    rebounds: reboundsTop && reboundsTop.seasonStats.rebounds > 0 ? reboundsTop.id : '',
    steals: stealsTop && stealsTop.seasonStats.steals > 0 ? stealsTop.id : '',
    blocks: blocksTop && blocksTop.seasonStats.blocks > 0 ? blocksTop.id : '',
  };
}

function computePlayerTradeValue(
  team: TeamState,
  player: TeamPlayer,
  opts?: { needs?: ReturnType<typeof teamNeeds> },
): number {
  const needs = opts?.needs ?? teamNeeds(team);
  const personalityFit = computePersonalityFit(team, player);
  const base =
    player.prospect.overall * 145 +
    player.prospect.potential * 220 +
    player.contract.seasonsLeft * 180 +
    (player.stamina - 70) * 10;

  // Rank penalty: better ranked prospects are cheaper to acquire but more “credible” in trade value.
  const rankPenalty = Math.min(1000, player.prospect.rank * 14);

  const pg = perGame(player.seasonStats);
  const perf =
    pg.points * 85 +
    pg.assists * 70 +
    pg.rebounds * 40 +
    pg.steals * 75 +
    pg.blocks * 75;

  // Needs fit: if the team is weak in defense, defensive players should pop in trade value.
  const needFit =
    player.prospect.categories.shooting * needs.shooting * 120 +
    player.prospect.categories.defense * needs.defense * 140 +
    player.prospect.categories.playmaking * needs.playmaking * 80 +
    player.prospect.categories.speed * needs.speed * 55;
  const chemistryLift = team.chemistry < 56 ? (personalityFit - 50) * 22 : (personalityFit - 50) * 12;
  const moraleLift = (player.morale - 50) * 18;

  const role = roleMultiplierForTeam(team, player.id);
  const leaders = teamLeaders(team);
  const leaderBoost =
    player.id === leaders.points ||
    player.id === leaders.assists ||
    player.id === leaders.rebounds ||
    player.id === leaders.steals ||
    player.id === leaders.blocks
      ? 1.12
      : 1;

  const depthScarcityBoost = getDepthScore(team) < 6.4 ? 1.06 : 1;
  return Math.max(1, (base + perf + needFit + chemistryLift + moraleLift - rankPenalty) * role * leaderBoost * depthScarcityBoost);
}

function computePickTradeValueForTeam(team: TeamState, pick: DraftPickAsset, franchise: FranchiseState) {
  return computeDraftPickValue(pick, team, franchise);
}

function buildCounterOffer(
  franchise: FranchiseState,
  fromTeam: TeamState,
  toTeam: TeamState,
  fromPlayerIds: string[],
  toPlayerIds: string[],
  fromPickIds: string[],
  toPickIds: string[],
): TradeCounterOffer | undefined {
  const needs = teamNeeds(toTeam);
  const currentIncomingValue = computeTradePackageValue(toTeam, fromPlayerIds, fromPickIds, franchise);
  const currentOutgoingValue = computeTradePackageValue(toTeam, toPlayerIds, toPickIds, franchise);
  const targetIncomingValue = currentOutgoingValue * 0.84;

  let nextFromPlayerIds = [...fromPlayerIds];
  let nextToPlayerIds = [...toPlayerIds];
  let nextFromPickIds = [...fromPickIds];
  let nextToPickIds = [...toPickIds];

  const selectedFromPlayers = fromTeam.roster.filter((p) => nextFromPlayerIds.includes(p.id));
  const selectedToPlayers = toTeam.roster.filter((p) => nextToPlayerIds.includes(p.id));
  const selectedFromPicks = fromTeam.draftPicks.filter((p) => nextFromPickIds.includes(p.id));
  const selectedToPicks = toTeam.draftPicks.filter((p) => nextToPickIds.includes(p.id));

  const unselectedFromPlayers = fromTeam.roster
    .filter((p) => !nextFromPlayerIds.includes(p.id))
    .map((player) => ({
      kind: 'player' as const,
      id: player.id,
      label: player.prospect.name,
      value: computePlayerTradeValue(toTeam, player, { needs }),
    }))
    .sort((a, b) => a.value - b.value);

  const unselectedFromPicks = fromTeam.draftPicks
    .filter((p) => !nextFromPickIds.includes(p.id))
    .map((pick) => ({
      kind: 'pick' as const,
      id: pick.id,
      label: `Round ${pick.round} Pick ${pick.pickPosition}`,
      value: computePickTradeValueForTeam(toTeam, pick, franchise),
    }))
    .sort((a, b) => a.value - b.value);

  const removableToPlayers = selectedToPlayers
    .map((player) => ({
      kind: 'player' as const,
      id: player.id,
      label: player.prospect.name,
      value: computePlayerTradeValue(toTeam, player, { needs }),
    }))
    .sort((a, b) => b.value - a.value);

  const removableToPicks = selectedToPicks
    .map((pick) => ({
      kind: 'pick' as const,
      id: pick.id,
      label: `Round ${pick.round} Pick ${pick.pickPosition}`,
      value: computePickTradeValueForTeam(toTeam, pick, franchise),
    }))
    .sort((a, b) => b.value - a.value);

  const asks: string[] = [];
  let incomingValue = currentIncomingValue;
  let outgoingValue = currentOutgoingValue;
  let adjustmentCount = 0;

  while (incomingValue < targetIncomingValue) {
    if (adjustmentCount >= 2) break;
    const shortfall = targetIncomingValue - incomingValue;
    const addCandidate =
      [...unselectedFromPlayers, ...unselectedFromPicks]
        .filter((candidate) => {
          if (candidate.kind === 'player') return !nextFromPlayerIds.includes(candidate.id);
          return !nextFromPickIds.includes(candidate.id);
        })
        .sort((a, b) => Math.abs(a.value - shortfall) - Math.abs(b.value - shortfall))[0];

    const removeCandidate =
      [...removableToPlayers, ...removableToPicks]
        .filter((candidate) => {
          if (candidate.kind === 'player') return nextToPlayerIds.includes(candidate.id);
          return nextToPickIds.includes(candidate.id);
        })
        .sort((a, b) => Math.abs(a.value - shortfall) - Math.abs(b.value - shortfall))[0];

    if (!addCandidate && !removeCandidate) break;

    const addDelta = addCandidate ? Math.abs(addCandidate.value - shortfall) : Number.POSITIVE_INFINITY;
    const removeDelta = removeCandidate ? Math.abs(removeCandidate.value - shortfall) : Number.POSITIVE_INFINITY;

    if (addDelta <= removeDelta && addCandidate) {
      if (addCandidate.kind === 'player') nextFromPlayerIds.push(addCandidate.id);
      else nextFromPickIds.push(addCandidate.id);
      incomingValue += addCandidate.value;
      asks.push(`add ${addCandidate.label}`);
      adjustmentCount += 1;
      continue;
    }

    if (removeCandidate) {
      if (removeCandidate.kind === 'player') nextToPlayerIds = nextToPlayerIds.filter((id) => id !== removeCandidate.id);
      else nextToPickIds = nextToPickIds.filter((id) => id !== removeCandidate.id);
      outgoingValue -= removeCandidate.value;
      asks.push(`take ${removeCandidate.label} out`);
      adjustmentCount += 1;
    }

    if (outgoingValue <= 0) break;
  }

  const finalIncomingValue = computeTradePackageValue(toTeam, nextFromPlayerIds, nextFromPickIds, franchise);
  const finalOutgoingValue = computeTradePackageValue(toTeam, nextToPlayerIds, nextToPickIds, franchise);
  const finalRatio = finalOutgoingValue > 0 ? finalIncomingValue / finalOutgoingValue : 1;

  const changed =
    nextFromPlayerIds.join('|') !== fromPlayerIds.join('|') ||
    nextToPlayerIds.join('|') !== toPlayerIds.join('|') ||
    nextFromPickIds.join('|') !== fromPickIds.join('|') ||
    nextToPickIds.join('|') !== toPickIds.join('|');

  if (!changed || finalRatio < 0.83) return undefined;

  const message = asks.length
    ? `${toTeam.name} likes this better. Try ${asks.join(' and ')} and you should be close.`
    : `${toTeam.name} is willing to compromise on this structure.`;

  return {
    fromTeamId: fromTeam.id,
    toTeamId: toTeam.id,
    fromPlayerIds: nextFromPlayerIds,
    toPlayerIds: nextToPlayerIds,
    fromPickIds: nextFromPickIds,
    toPickIds: nextToPickIds,
    message,
    flexibility: 0.08,
  };
}

function evaluateAiResponse(
  franchise: FranchiseState,
  fromTeam: TeamState,
  toTeam: TeamState,
  fromPlayerIds: string[],
  toPlayerIds: string[],
  fromPickIds: string[],
  toPickIds: string[],
): { accepted: boolean; reason?: string; counterOffer?: TradeCounterOffer } {
  const fromValueForTo = computeTradePackageValue(toTeam, fromPlayerIds, fromPickIds, franchise);
  const toValueForTo = computeTradePackageValue(toTeam, toPlayerIds, toPickIds, franchise);

  const needs = teamNeeds(toTeam);
  const incoming = fromTeam.roster.filter((p) => fromPlayerIds.includes(p.id));
  const outgoing = toTeam.roster.filter((p) => toPlayerIds.includes(p.id));

  const fitScore = (players: TeamPlayer[]) =>
    players.reduce(
      (sum, p) =>
        sum +
        p.prospect.categories.shooting * needs.shooting +
        p.prospect.categories.playmaking * needs.playmaking +
        p.prospect.categories.speed * needs.speed +
        p.prospect.categories.defense * needs.defense +
        computePersonalityFit(toTeam, p) * 0.28,
      0,
    );

  const incomingFit = fitScore(incoming);
  const outgoingFit = fitScore(outgoing);

  const fitDelta = incomingFit - outgoingFit;
  const outgoingPain = outgoing.reduce((sum, player) => sum + coreHoldScore(toTeam, player), 0);
  const incomingUpside = incoming.reduce((sum, player) => sum + player.prospect.potential + player.contract.seasonsLeft * 0.5, 0);
  const rosterBalanceBonus =
    incoming.reduce((sum, player) => sum + needFitScoreForTeam(toTeam, player), 0) * 0.025 -
    outgoingPain * 0.045;
  const chemistryBalance =
    incoming.reduce((sum, player) => sum + computePersonalityFit(toTeam, player), 0) -
    outgoing.reduce((sum, player) => sum + computePersonalityFit(toTeam, player), 0);

  const valueRatio = toValueForTo > 0 ? fromValueForTo / toValueForTo : 1;
  const ratioScore = Math.max(0, Math.min(1, (valueRatio - 0.6) / 0.7));

  const needScore = Math.max(0, Math.min(1, (fitDelta + 180) / 340));
  const difficulty = getDifficultyTuning();

  const range = franchise.seasonStandings.length;
  let rankPosition = franchise.seasonStandings.findIndex((r) => r.teamId === toTeam.id);
  if (rankPosition < 0) rankPosition = 0;
  const urgency = range > 1 ? rankPosition / (range - 1) : 0; // 0 best, 1 worst
  const urgencyBonus = 0.12 + 0.22 * urgency; // worse teams get noticeably more flexible

  const acceptanceScore =
    ratioScore * 0.37 +
    needScore * 0.28 +
    urgencyBonus * 0.2 +
    Math.max(0, Math.min(0.16, incomingUpside * 0.008 + rosterBalanceBonus + chemistryBalance * 0.0008)) +
    difficulty.tradeAcceptanceBias;

  if (
    valueRatio >= 0.79 - difficulty.tradeAcceptanceBias * 0.18 &&
    valueRatio <= 1.28 + difficulty.tradeAcceptanceBias * 0.12 &&
    needScore >= 0.12 &&
    outgoingPain <= incomingUpside + 8 &&
    chemistryBalance >= -28
  ) {
    return { accepted: true };
  }

  if (acceptanceScore >= 0.19) {
    return { accepted: true };
  }

  const counterOffer = buildCounterOffer(franchise, fromTeam, toTeam, fromPlayerIds, toPlayerIds, fromPickIds, toPickIds);
  if (counterOffer) {
    const counterIncomingValue = computeTradePackageValue(toTeam, counterOffer.fromPlayerIds, counterOffer.fromPickIds, franchise);
    const counterOutgoingValue = computeTradePackageValue(toTeam, counterOffer.toPlayerIds, counterOffer.toPickIds, franchise);
    const currentGap = Math.abs(counterIncomingValue - fromValueForTo);
    const outgoingGap = Math.abs(counterOutgoingValue - toValueForTo);
    const softness = counterOffer.flexibility ?? 0.08;
    const closeToCounter =
      currentGap <= Math.max(450, counterIncomingValue * softness) &&
      outgoingGap <= Math.max(450, counterOutgoingValue * (softness + 0.02));

    if (closeToCounter && needScore >= 0.08) {
      return { accepted: true };
    }
  }

  return {
    accepted: false,
    reason: counterOffer ? `${toTeam.name} wants a softer compromise, but they are still open if you stay close to this range.` : 'Target team passed, but they are much more open to closer value deals now.',
    counterOffer,
  };
}

export function requestTrade(
  franchise: FranchiseState,
  params:
    | { userPlayerId: string; aiPlayerId: string; acceptMode?: 'auto' | 'ask' }
    | {
        fromTeamId: string;
        toTeamId: string;
        fromPlayerIds: string[];
        toPlayerIds: string[];
        fromPickIds?: string[];
        toPickIds?: string[];
        acceptMode?: 'auto' | 'ask';
      },
): {
  updated: FranchiseState;
  accepted: boolean;
  reason?: string;
  score?: number;
  packageLabel?: string;
  newsPost?: LeagueNewsPost;
  counterOffer?: TradeCounterOffer;
} {
  const isLegacy = 'userPlayerId' in params;
  const fromTeamId = isLegacy ? franchise.user.id : params.fromTeamId;
  const toTeamId = isLegacy ? franchise.ai.id : params.toTeamId;
  const fromPlayerIds = isLegacy ? [params.userPlayerId] : params.fromPlayerIds;
  const toPlayerIds = isLegacy ? [params.aiPlayerId] : params.toPlayerIds;
  const fromPickIds = isLegacy ? [] : params.fromPickIds ?? [];
  const toPickIds = isLegacy ? [] : params.toPickIds ?? [];

  const packageEval = evaluateTradePackage(
    { playerIds: fromPlayerIds, pickIds: fromPickIds },
    { playerIds: toPlayerIds, pickIds: toPickIds },
    franchise,
  );

  const teams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const fromTeam = teams.find((t) => t.id === fromTeamId);
  const toTeam = teams.find((t) => t.id === toTeamId);

  if (!fromTeam || !toTeam) {
    return { updated: franchise, accepted: false, reason: 'Team not found', score: packageEval.score, packageLabel: packageEval.label };
  }

  if (toTeam.id !== franchise.user.id) {
    const aiResult = evaluateAiResponse(franchise, fromTeam, toTeam, fromPlayerIds, toPlayerIds, fromPickIds, toPickIds);
    if (!aiResult.accepted) {
      return {
        updated: franchise,
        accepted: false,
        reason: aiResult.reason,
        score: packageEval.score,
        packageLabel: packageEval.label,
        counterOffer: aiResult.counterOffer,
      };
    }
  }

  const result = applyTrade(franchise, {
    fromTeamId,
    toTeamId,
    fromPlayerIds,
    toPlayerIds,
    fromPickIds,
    toPickIds,
  });

  if (!result.accepted) {
    return { updated: franchise, accepted: false, reason: result.reason, score: packageEval.score, packageLabel: packageEval.label };
  }

  return {
    updated: result.updated,
    accepted: true,
    reason: result.newsPost?.text,
    newsPost: result.newsPost,
    score: packageEval.score,
    packageLabel: packageEval.label,
  };
}

function standingAggression(franchise: FranchiseState, teamId: string) {
  if (!franchise.seasonStandings.length) return 0.5;
  const index = franchise.seasonStandings.findIndex((row) => row.teamId === teamId);
  if (index < 0) return 0.5;
  const normalized = index / Math.max(1, franchise.seasonStandings.length - 1);
  // Bottom teams chase shake-ups, top teams chase upgrades.
  return 0.45 + Math.abs(normalized - 0.5);
}

function needFitScoreForTeam(team: TeamState, player: TeamPlayer) {
  const needs = teamNeeds(team);
  return (
    player.prospect.categories.shooting * needs.shooting * 1.05 +
    player.prospect.categories.playmaking * needs.playmaking * 0.95 +
    player.prospect.categories.speed * needs.speed * 0.55 +
    player.prospect.categories.defense * needs.defense * 1.1 +
    player.prospect.potential * 0.32
  );
}

function coreHoldScore(team: TeamState, player: TeamPlayer) {
  const leaderIds = new Set(Object.values(teamLeaders(team)).filter(Boolean));
  const activeCore = team.activePlayerIds.includes(player.id) ? 1.2 : 0;
  const leaderCore = leaderIds.has(player.id) ? 1 : 0;
  const contractShield = player.contract.seasonsLeft >= 3 ? 0.35 : 0;
  const loyaltyShield = player.yearsWithTeam * 0.07 + player.loyalty * 0.05;
  const talentShield = overallToTenScale(player.prospect.overall) * 0.32 + player.prospect.potential * 0.14;
  return activeCore + leaderCore + contractShield + loyaltyShield + talentShield;
}

function sellerTradeInterest(team: TeamState, player: TeamPlayer) {
  const expiringPush = player.contract.seasonsLeft <= 1 ? 1.35 : player.contract.seasonsLeft === 2 ? 0.5 : 0;
  const unhappyPush = Math.max(0, player.desireToLeave - player.happiness) * 0.28;
  const veteranPush = player.prospect.age >= 29 ? 0.45 : 0;
  return expiringPush + unhappyPush + veteranPush - coreHoldScore(team, player) * 0.44;
}

function buyerOfferAppeal(buyer: TeamState, seller: TeamState, player: TeamPlayer) {
  const sellerNeeds = teamNeeds(seller);
  const buyerNeeds = teamNeeds(buyer);
  const sellerFit = computePlayerTradeValue(seller, player, { needs: sellerNeeds }) / 1000;
  const buyerLoss = needFitScoreForTeam(buyer, player) + coreHoldScore(buyer, player) * 0.75;
  const contractAppeal = player.contract.seasonsLeft <= 2 ? 0.45 : 0;
  return sellerFit + contractAppeal - buyerLoss * 0.38;
}

function shouldAiAcceptCounter(
  franchise: FranchiseState,
  counterOffer: TradeCounterOffer,
) {
  const teams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const buyer = teams.find((team) => team.id === counterOffer.fromTeamId);
  const seller = teams.find((team) => team.id === counterOffer.toTeamId);
  if (!buyer || !seller) return false;

  const buyerIncomingValue = computeTradePackageValue(
    buyer,
    counterOffer.toPlayerIds,
    counterOffer.toPickIds,
    franchise,
  );
  const buyerOutgoingValue = computeTradePackageValue(
    buyer,
    counterOffer.fromPlayerIds,
    counterOffer.fromPickIds,
    franchise,
  );
  const ratio = buyerIncomingValue / Math.max(1, buyerOutgoingValue);

  const incomingPlayers = seller.roster.filter((player) => counterOffer.toPlayerIds.includes(player.id));
  const outgoingPlayers = buyer.roster.filter((player) => counterOffer.fromPlayerIds.includes(player.id));
  const fitDelta =
    incomingPlayers.reduce((sum, player) => sum + needFitScoreForTeam(buyer, player), 0) -
    outgoingPlayers.reduce((sum, player) => sum + needFitScoreForTeam(buyer, player), 0);

  const softness = counterOffer.flexibility ?? 0.08;
  return ratio >= 0.66 - softness * 0.2 || fitDelta >= 1.2;
}

function buildAiTradeProposal(franchise: FranchiseState, buyer: TeamState, seller: TeamState) {
  if (buyer.id === seller.id) return null;
  if (buyer.roster.length < 2 || seller.roster.length < 2) return null;

  const sellerTargets = seller.roster
    .map((player) => ({
      player,
      score:
        needFitScoreForTeam(buyer, player) * 1.25 +
        sellerTradeInterest(seller, player) +
        standingAggression(franchise, buyer.id) * 0.9,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const buyerOffers = buyer.roster
    .map((player) => ({
      player,
      score: buyerOfferAppeal(buyer, seller, player),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const buyerPicks = buyer.draftPicks
    .map((pick) => ({
      pick,
      value: computePickTradeValueForTeam(seller, pick, franchise),
    }))
    .sort((a, b) => a.value - b.value);

  let best:
    | {
        fromPlayerIds: string[];
        toPlayerIds: string[];
        fromPickIds: string[];
        score: number;
      }
    | null = null;

  for (const target of sellerTargets) {
    for (const offer of buyerOffers) {
      if (target.player.id === offer.player.id) continue;

      const sellerIncomingValue = computePlayerTradeValue(seller, offer.player) / 1000;
      const sellerOutgoingValue = computePlayerTradeValue(seller, target.player) / 1000;
      const buyerIncomingFit = needFitScoreForTeam(buyer, target.player);
      const buyerOutgoingFit = needFitScoreForTeam(buyer, offer.player);
      const sellerIncomingFit = needFitScoreForTeam(seller, offer.player);
      const sellerOutgoingFit = needFitScoreForTeam(seller, target.player);

      let fromPickIds: string[] = [];
      let totalIncoming = sellerIncomingValue;
      const valueGap = sellerOutgoingValue * 0.92 - totalIncoming;
      if (valueGap > 0.18) {
        const sweetener = buyerPicks.find((entry) => entry.value / 1000 >= valueGap * 0.45);
        if (sweetener) {
          fromPickIds = [sweetener.pick.id];
          totalIncoming += sweetener.value / 1000;
        }
      }

      const ratio = totalIncoming / Math.max(0.1, sellerOutgoingValue);
      if (ratio < 0.64 || ratio > 1.55) continue;

      const score =
        (buyerIncomingFit - buyerOutgoingFit) * 1.25 +
        (sellerIncomingFit - sellerOutgoingFit) * 0.9 -
        Math.abs(1 - ratio) * 1.9 +
        standingAggression(franchise, buyer.id) * 0.5;

      if (!best || score > best.score) {
        best = {
          fromPlayerIds: [offer.player.id],
          toPlayerIds: [target.player.id],
          fromPickIds,
          score,
        };
      }
    }
  }

  if (!best) return null;
  return {
    fromTeamId: buyer.id,
    toTeamId: seller.id,
    fromPlayerIds: best.fromPlayerIds,
    toPlayerIds: best.toPlayerIds,
    fromPickIds: best.fromPickIds,
    toPickIds: [] as string[],
  };
}

export function simulateAiLeagueTradeActivity(
  franchise: FranchiseState,
  opts?: { maxTrades?: number; tradeChance?: number },
): { updated: FranchiseState; newsPosts: LeagueNewsPost[]; summary?: string } {
  if (!franchise.season || franchise.season.phase !== 'regular') {
    return { updated: franchise, newsPosts: [] };
  }
  if (franchise.freeAgencyPending || !franchise.draftCompleted) {
    return { updated: franchise, newsPosts: [] };
  }

  const chance = Math.min(0.95, (opts?.tradeChance ?? 0.58) * getAiAggressionMultiplier());
  if (Math.random() > chance) {
    return { updated: franchise, newsPosts: [] };
  }

  const maxTrades = clamp(Math.round((opts?.maxTrades ?? 1) * getAiAggressionMultiplier()), 1, 3);
  const aiTeams = [franchise.ai, ...franchise.otherTeams].filter((team) => team.roster.length >= 2);
  if (aiTeams.length < 2) {
    return { updated: franchise, newsPosts: [] };
  }

  let working = franchise;
  const newsPosts: LeagueNewsPost[] = [];
  const usedTeams = new Set<string>();
  const attempts: Array<{ buyerId: string; sellerId: string; weight: number; noise: number }> = [];

  for (const buyer of aiTeams) {
    for (const seller of aiTeams) {
      if (buyer.id === seller.id) continue;
      const weight = standingAggression(franchise, buyer.id) + seller.roster.length * 0.08;
      attempts.push({ buyerId: buyer.id, sellerId: seller.id, weight, noise: Math.random() });
    }
  }

  attempts.sort((a, b) => b.weight - a.weight || a.noise - b.noise);

  for (const attempt of attempts) {
    if (newsPosts.length >= maxTrades) break;
    if (usedTeams.has(attempt.buyerId) || usedTeams.has(attempt.sellerId)) continue;

    const liveTeams = [working.ai, ...working.otherTeams];
    const buyer = liveTeams.find((team) => team.id === attempt.buyerId);
    const seller = liveTeams.find((team) => team.id === attempt.sellerId);
    if (!buyer || !seller) continue;

    const proposal = buildAiTradeProposal(working, buyer, seller);
    if (!proposal) continue;

    let outcome = requestTrade(working, proposal);
    if (!outcome.accepted && outcome.counterOffer && shouldAiAcceptCounter(working, outcome.counterOffer)) {
      outcome = requestTrade(working, {
        fromTeamId: outcome.counterOffer.fromTeamId,
        toTeamId: outcome.counterOffer.toTeamId,
        fromPlayerIds: outcome.counterOffer.fromPlayerIds,
        toPlayerIds: outcome.counterOffer.toPlayerIds,
        fromPickIds: outcome.counterOffer.fromPickIds,
        toPickIds: outcome.counterOffer.toPickIds,
      });
    }

    if (!outcome.accepted || !outcome.newsPost) continue;

    working = outcome.updated;
    newsPosts.push({
      ...outcome.newsPost,
      badgeTone: 'info',
    });
    usedTeams.add(attempt.buyerId);
    usedTeams.add(attempt.sellerId);
  }

  return {
    updated: working,
    newsPosts,
    summary: newsPosts.length ? `${newsPosts.length} league trade${newsPosts.length === 1 ? '' : 's'} shook up the market.` : undefined,
  };
}

function computeTeamRating(t: TeamState): number {
  const n = Math.max(1, t.roster.length);
  const avgCats =
    t.roster.reduce((s, p) => s + p.prospect.categories.shooting + p.prospect.categories.playmaking + p.prospect.categories.speed + p.prospect.categories.defense, 0) /
    (n * 4);
  const avgPerf =
    t.roster.reduce((s, p) => {
      const combinedStats = {
        matchesPlayed: p.seasonStats.matchesPlayed + p.playoffStats.matchesPlayed,
        points: p.seasonStats.points + p.playoffStats.points,
        assists: p.seasonStats.assists + p.playoffStats.assists,
        rebounds: p.seasonStats.rebounds + p.playoffStats.rebounds,
        steals: p.seasonStats.steals + p.playoffStats.steals,
        blocks: p.seasonStats.blocks + p.playoffStats.blocks,
      };
      const pg = perGame(combinedStats);
      return s + pg.points + pg.assists * 0.5 + p.prospect.categories.defense * 0.15 + (combinedStats.steals + combinedStats.blocks) * 0.03;
    }, 0) / n;
  const rating = 0.72 * avgCats + 0.08 * avgPerf;
  return clamp(Math.round(rating), 1, 10);
}

export function applyMatchResults(
  franchise: FranchiseState,
  params: {
    inGameStatsByEntityId: Record<string, PlayerInGameStats>;
    didUserWin?: boolean;
    finalScore?: { user: number; ai: number };
  },
): { updated: FranchiseState; progressionNotices: string[] } {
  const { inGameStatsByEntityId, didUserWin, finalScore } = params;
  const progressionNotices: string[] = [];
  const statBucket: 'seasonStats' | 'playoffStats' = franchise.season?.phase === 'playoffs' ? 'playoffStats' : 'seasonStats';

  function applyToTeam(team: TeamState): TeamState {
    const nextRoster = team.roster.map((tp) => {
      const inc = inGameStatsByEntityId[tp.id];
      if (!inc) return tp;

      const beforeCats = tp.prospect.categories;
      const beforeRounds = {
        shooting: Math.round(beforeCats.shooting),
        speed: Math.round(beforeCats.speed),
        playmaking: Math.round(beforeCats.playmaking),
        defense: Math.round(beforeCats.defense),
      };

      const currentStats = tp[statBucket];
      const nextBucketStats: TeamPlayer['seasonStats'] = {
        matchesPlayed: currentStats.matchesPlayed + 1,
        points: currentStats.points + inc.points,
        assists: currentStats.assists + inc.assists,
        rebounds: currentStats.rebounds + inc.rebounds,
        steals: currentStats.steals + inc.steals,
        blocks: currentStats.blocks + inc.blocks,
      };

      // Progression: high potential improves faster.
      const growth = tp.prospect.potential / 10; // 0.1..1
      const shootingBoost = growth * (inc.points * 0.02 + inc.assists * 0.01);
      const playmakingBoost = growth * (inc.assists * 0.03 + inc.points * 0.005 + inc.rebounds * 0.004);
      const defenseBoost = growth * (inc.steals * 0.05 + inc.blocks * 0.04 + inc.rebounds * 0.015);
      const speedBoost = growth * (inc.steals * 0.02 + inc.blocks * 0.015 + inc.rebounds * 0.01);

      const nextCats = {
        shooting: clamp(tp.prospect.categories.shooting + shootingBoost, 1, 10),
        speed: clamp(tp.prospect.categories.speed + speedBoost, 1, 10),
        playmaking: clamp(tp.prospect.categories.playmaking + playmakingBoost, 1, 10),
        defense: clamp(tp.prospect.categories.defense + defenseBoost, 1, 10),
      };

      const nextOverall = deriveOverallFromCategories(nextCats);

      const afterRounds = {
        shooting: Math.round(nextCats.shooting),
        speed: Math.round(nextCats.speed),
        playmaking: Math.round(nextCats.playmaking),
        defense: Math.round(nextCats.defense),
      };

      const improved: string[] = [];
      if (afterRounds.shooting > beforeRounds.shooting) improved.push(`shooting +${afterRounds.shooting - beforeRounds.shooting}`);
      if (afterRounds.speed > beforeRounds.speed) improved.push(`speed +${afterRounds.speed - beforeRounds.speed}`);
      if (afterRounds.playmaking > beforeRounds.playmaking) improved.push(`playmaking +${afterRounds.playmaking - beforeRounds.playmaking}`);
      if (afterRounds.defense > beforeRounds.defense) improved.push(`defense +${afterRounds.defense - beforeRounds.defense}`);

      if (improved.length) {
        progressionNotices.push(`${tp.prospect.name}'s ${improved.join(', ')}!`);
      }

      return {
        ...tp,
        [statBucket]: nextBucketStats,
        stamina: recoverBetweenGames(tp).stamina,
        prospect: {
          ...tp.prospect,
          categories: nextCats,
          overall: nextOverall,
        },
      };
    });

    return {
      ...team,
      roster: nextRoster,
      teamRating: computeTeamRating({ ...team, roster: nextRoster }),
    };
  }

  const nextUser = applyToTeam(franchise.user);
  const nextAi = setDefaultActivePlayers(applyToTeam(franchise.ai));

  // Update season standings + power rankings (UI-only season meta).
  let nextSeasonStandings = franchise.seasonStandings;
  if (finalScore && nextSeasonStandings.length > 0) {
    nextSeasonStandings = nextSeasonStandings.map((row) => {
      if (row.teamId === franchise.user.id) {
        const won = didUserWin === true;
        return {
          ...row,
          wins: row.wins + (won ? 1 : 0),
          losses: row.losses + (won ? 0 : 1),
          pointsFor: row.pointsFor + finalScore.user,
          pointsAgainst: row.pointsAgainst + finalScore.ai,
          streak: won ? 'W' : 'L',
          streakCount:
            (won ? row.streak === 'W' : row.streak === 'L') ? row.streakCount + 1 : 1,
        };
      }
      if (row.teamId === franchise.ai.id) {
        const won = didUserWin === false;
        return {
          ...row,
          wins: row.wins + (won ? 1 : 0),
          losses: row.losses + (won ? 0 : 1),
          pointsFor: row.pointsFor + finalScore.ai,
          pointsAgainst: row.pointsAgainst + finalScore.user,
          streak: won ? 'W' : 'L',
          streakCount:
            (won ? row.streak === 'W' : row.streak === 'L') ? row.streakCount + 1 : 1,
        };
      }
      return row;
    });

    nextSeasonStandings = [...nextSeasonStandings].sort((a, b) => {
      const pdA = a.pointsFor - a.pointsAgainst;
      const pdB = b.pointsFor - b.pointsAgainst;
      return b.wins - a.wins || pdB - pdA;
    });
  }

  const allTeams = [nextUser, nextAi, ...franchise.otherTeams];
  const nextPowerRankings: PowerRankingRow[] = allTeams
    .map((t) => {
      const avgPotential = t.roster.length ? t.roster.reduce((s, p) => s + p.prospect.potential, 0) / t.roster.length : 5;
      const score = t.teamRating * 1.2 + avgPotential * 0.9;
      return {
        teamId: t.id,
        teamName: t.name,
        managerName: t.managerName,
        logoText: t.logoText,
        logoColor: t.logoColor,
        rank: 0,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  return {
    updated: refreshFranchiseDynamics({
      ...franchise,
      user: nextUser,
      ai: nextAi,
      seasonStandings: nextSeasonStandings,
      powerRankings: nextPowerRankings,
    }),
    progressionNotices,
  };
}

// Applies a match result to ANY two teams in the league (user, rival, or other teams).
// This is used by the manual season schedule flow.
export function applyLeagueMatchResults(
  franchise: FranchiseState,
  params: {
    homeTeamId: string;
    awayTeamId: string;
    inGameStatsByEntityId: Record<string, PlayerInGameStats>;
    finalScore: { home: number; away: number };
  },
): { updated: FranchiseState; progressionNotices: string[] } {
  const { inGameStatsByEntityId, finalScore } = params;
  const progressionNotices: string[] = [];
  const statBucket: 'seasonStats' | 'playoffStats' = franchise.season?.phase === 'playoffs' ? 'playoffStats' : 'seasonStats';

  const winnerTeamId =
    finalScore.home === finalScore.away ? null : finalScore.home > finalScore.away ? params.homeTeamId : params.awayTeamId;

  const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
  const byId = (id: string) => leagueTeams.find((t) => t.id === id);
  const home = byId(params.homeTeamId);
  const away = byId(params.awayTeamId);
  if (!home || !away) return { updated: franchise, progressionNotices: [] };

  function applyToTeam(team: TeamState): TeamState {
    const nextRoster = team.roster.map((tp) => {
      const inc = inGameStatsByEntityId[tp.id];
      if (!inc) return tp;

      const beforeCats = tp.prospect.categories;
      const beforeRounds = {
        shooting: Math.round(beforeCats.shooting),
        speed: Math.round(beforeCats.speed),
        playmaking: Math.round(beforeCats.playmaking),
        defense: Math.round(beforeCats.defense),
      };

      const currentStats = tp[statBucket];
      const nextBucketStats: TeamPlayer['seasonStats'] = {
        matchesPlayed: currentStats.matchesPlayed + 1,
        points: currentStats.points + inc.points,
        assists: currentStats.assists + inc.assists,
        rebounds: currentStats.rebounds + inc.rebounds,
        steals: currentStats.steals + inc.steals,
        blocks: currentStats.blocks + inc.blocks,
      };

      const growth = tp.prospect.potential / 10; // 0.1..1
      const shootingBoost = growth * (inc.points * 0.02 + inc.assists * 0.01);
      const playmakingBoost = growth * (inc.assists * 0.03 + inc.points * 0.005 + inc.rebounds * 0.004);
      const defenseBoost = growth * (inc.steals * 0.05 + inc.blocks * 0.04 + inc.rebounds * 0.015);
      const speedBoost = growth * (inc.steals * 0.02 + inc.blocks * 0.015 + inc.rebounds * 0.01);

      const nextCats = {
        shooting: clamp(tp.prospect.categories.shooting + shootingBoost, 1, 10),
        speed: clamp(tp.prospect.categories.speed + speedBoost, 1, 10),
        playmaking: clamp(tp.prospect.categories.playmaking + playmakingBoost, 1, 10),
        defense: clamp(tp.prospect.categories.defense + defenseBoost, 1, 10),
      };

      const nextOverall = deriveOverallFromCategories(nextCats);

      const afterRounds = {
        shooting: Math.round(nextCats.shooting),
        speed: Math.round(nextCats.speed),
        playmaking: Math.round(nextCats.playmaking),
        defense: Math.round(nextCats.defense),
      };

      const improved: string[] = [];
      if (afterRounds.shooting > beforeRounds.shooting) improved.push(`shooting +${afterRounds.shooting - beforeRounds.shooting}`);
      if (afterRounds.speed > beforeRounds.speed) improved.push(`speed +${afterRounds.speed - beforeRounds.speed}`);
      if (afterRounds.playmaking > beforeRounds.playmaking) improved.push(`playmaking +${afterRounds.playmaking - beforeRounds.playmaking}`);
      if (afterRounds.defense > beforeRounds.defense) improved.push(`defense +${afterRounds.defense - beforeRounds.defense}`);

      if (improved.length) {
        progressionNotices.push(`${tp.prospect.name}'s ${improved.join(', ')}!`);
      }

      return {
        ...tp,
        [statBucket]: nextBucketStats,
        stamina: recoverBetweenGames(tp).stamina,
        prospect: {
          ...tp.prospect,
          categories: nextCats,
          overall: nextOverall,
        },
      };
    });

    return setDefaultActivePlayers({
      ...team,
      roster: nextRoster,
      teamRating: computeTeamRating({ ...team, roster: nextRoster }),
    });
  }

  const updatedHome = applyToTeam(home);
  const updatedAway = applyToTeam(away);

  const nextTeams = leagueTeams.map((t) => {
    if (t.id === updatedHome.id) return updatedHome;
    if (t.id === updatedAway.id) return updatedAway;
    return t;
  });

  const updatedUser = nextTeams.find((t) => t.id === franchise.user.id)!;
  const updatedAi = nextTeams.find((t) => t.id === franchise.ai.id)!;
  const updatedOther = nextTeams.filter((t) => t.id !== franchise.user.id && t.id !== franchise.ai.id);

  // Update standings for both teams (if standings exist).
  let nextSeasonStandings = franchise.seasonStandings;
  if (nextSeasonStandings.length > 0) {
    nextSeasonStandings = nextSeasonStandings.map((row) => {
      if (row.teamId === params.homeTeamId) {
        const won = winnerTeamId === params.homeTeamId;
        return {
          ...row,
          wins: row.wins + (winnerTeamId && won ? 1 : 0),
          losses: row.losses + (winnerTeamId && !won ? 1 : 0),
          pointsFor: row.pointsFor + finalScore.home,
          pointsAgainst: row.pointsAgainst + finalScore.away,
          streak: winnerTeamId ? (won ? 'W' : 'L') : '—',
          streakCount: winnerTeamId ? ((won ? row.streak === 'W' : row.streak === 'L') ? row.streakCount + 1 : 1) : 0,
        };
      }
      if (row.teamId === params.awayTeamId) {
        const won = winnerTeamId === params.awayTeamId;
        return {
          ...row,
          wins: row.wins + (winnerTeamId && won ? 1 : 0),
          losses: row.losses + (winnerTeamId && !won ? 1 : 0),
          pointsFor: row.pointsFor + finalScore.away,
          pointsAgainst: row.pointsAgainst + finalScore.home,
          streak: winnerTeamId ? (won ? 'W' : 'L') : '—',
          streakCount: winnerTeamId ? ((won ? row.streak === 'W' : row.streak === 'L') ? row.streakCount + 1 : 1) : 0,
        };
      }
      return row;
    });

    nextSeasonStandings = [...nextSeasonStandings].sort((a, b) => {
      const pdA = a.pointsFor - a.pointsAgainst;
      const pdB = b.pointsFor - b.pointsAgainst;
      return b.wins - a.wins || pdB - pdA;
    });
  }

  const allTeamsForRank = [updatedUser, updatedAi, ...updatedOther];
  const nextPowerRankings: PowerRankingRow[] = allTeamsForRank
    .map((t) => {
      const avgPotential = t.roster.length ? t.roster.reduce((s, p) => s + p.prospect.potential, 0) / t.roster.length : 5;
      const score = t.teamRating * 1.2 + avgPotential * 0.9;
      return {
        teamId: t.id,
        teamName: t.name,
        managerName: t.managerName,
        logoText: t.logoText,
        logoColor: t.logoColor,
        rank: 0,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  return {
    updated: refreshFranchiseDynamics({
      ...franchise,
      user: updatedUser,
      ai: updatedAi,
      otherTeams: updatedOther,
      seasonStandings: nextSeasonStandings,
      powerRankings: nextPowerRankings,
    }),
    progressionNotices,
  };
}

export function getTradeValueForTeam(franchise: FranchiseState, team: 'user' | 'ai', playerId: string): number {
  const t = franchise[team];
  const player = t.roster.find((p) => p.id === playerId);
  if (!player) return 0;
  return computePlayerTradeValue(t, player);
}
