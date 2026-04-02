import type { FranchiseState, LeagueNewsPost } from './types';
import { createPlayerPersonality, getPlayerStatusLabel, refreshFranchiseDynamics } from './personality';

const KEY = 'combinedAppFranchiseSave_v1';

export type FranchiseSaveV1 = {
  version: 1;
  savedAtMs: number;
  franchise: FranchiseState;
  newsPosts: LeagueNewsPost[];
};

function normalizePlayer(player: any) {
  const personality = player?.personality ?? createPlayerPersonality({ prospect: player.prospect });
  const morale =
    typeof player?.morale === 'number'
      ? Math.max(0, Math.min(100, player.morale))
      : Math.max(12, Math.min(92, 46 + (player?.happiness ?? 6) * 5 - (player?.desireToLeave ?? 4) * 2));
  return {
    ...player,
    yearsWithTeam: typeof player?.yearsWithTeam === 'number' ? player.yearsWithTeam : 0,
    loyalty: typeof player?.loyalty === 'number' ? player.loyalty : 6,
    happiness: typeof player?.happiness === 'number' ? player.happiness : 6,
    desireToLeave: typeof player?.desireToLeave === 'number' ? player.desireToLeave : 4,
    personality,
    morale,
    status: player?.status ?? getPlayerStatusLabel(morale),
    recentTradeAdjustment: typeof player?.recentTradeAdjustment === 'number' ? player.recentTradeAdjustment : 0,
  };
}

function normalizeTeam(team: any) {
  return {
    ...team,
    roster: Array.isArray(team?.roster) ? team.roster.map(normalizePlayer) : [],
    chemistry: typeof team?.chemistry === 'number' ? team.chemistry : 58,
    lockerRoomStatus: typeof team?.lockerRoomStatus === 'string' ? team.lockerRoomStatus : 'steady',
  };
}

export function saveFranchise(state: { franchise: FranchiseState; newsPosts: LeagueNewsPost[] }) {
  const payload: FranchiseSaveV1 = {
    version: 1,
    savedAtMs: Date.now(),
    franchise: state.franchise,
    newsPosts: state.newsPosts,
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadFranchise(): { franchise: FranchiseState; newsPosts: LeagueNewsPost[] } | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<FranchiseSaveV1>;
    if (parsed.version !== 1) return null;
    if (!parsed.franchise) return null;
    const normalizedFranchise = refreshFranchiseDynamics({
      ...parsed.franchise,
      user: normalizeTeam((parsed.franchise as FranchiseState).user),
      ai: normalizeTeam((parsed.franchise as FranchiseState).ai),
      otherTeams: Array.isArray((parsed.franchise as FranchiseState).otherTeams)
        ? (parsed.franchise as FranchiseState).otherTeams.map(normalizeTeam)
        : [],
      freeAgents: Array.isArray((parsed.franchise as FranchiseState).freeAgents)
        ? (parsed.franchise as FranchiseState).freeAgents.map(normalizePlayer)
        : [],
      freeAgencyPending: typeof (parsed.franchise as FranchiseState).freeAgencyPending === 'boolean'
        ? (parsed.franchise as FranchiseState).freeAgencyPending
        : false,
    } as FranchiseState);
    return {
      franchise: normalizedFranchise,
      newsPosts: Array.isArray(parsed.newsPosts) ? (parsed.newsPosts as LeagueNewsPost[]) : [],
    };
  } catch {
    return null;
  }
}

export function hasSavedFranchise(): boolean {
  return !!localStorage.getItem(KEY);
}

export function clearFranchise() {
  localStorage.removeItem(KEY);
}
