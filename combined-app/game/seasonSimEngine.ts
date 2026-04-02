import { createMatch, updateMatch, type MatchResult, type PlayerInput } from './basketballEngine';
import { deriveOverall100, overallToTenScale } from './ratings';
import { depthAwareTeamRating } from './stamina';
import type { DraftStandingRow, FranchiseState, LeagueNewsPost, PowerRankingRow, PlayerInGameStats, Prospect, TeamState } from './types';
import { applyMatchResults, simulateAiLeagueTradeActivity } from './franchise';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(v: { x: number; y: number }) {
  const l = Math.hypot(v.x, v.y);
  if (l <= 0.0001) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

function sub(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function deriveOverallFromCategories(categories: Prospect['categories']): number {
  return deriveOverall100({ categories });
}

function computeTeamRatingFromRoster(team: TeamState) {
  return depthAwareTeamRating(team);
}

function getLeagueTeams(franchise: FranchiseState): TeamState[] {
  return [franchise.user, franchise.ai, ...franchise.otherTeams];
}

function pushPost(posts: LeagueNewsPost[], post: LeagueNewsPost) {
  posts.push(post);
}

function createPost(
  prefix: string,
  type: LeagueNewsPost['type'],
  text: string,
  extras?: Partial<LeagueNewsPost>,
): LeagueNewsPost {
  return {
    id: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAtMs: Date.now(),
    type,
    text,
    ...extras,
  };
}

function buildScheduleRoundRobin(teamIds: string[], weeks: number) {
  // Circle method for even team count.
  const n = teamIds.length;
  if (n % 2 !== 0) throw new Error('Schedule requires even team count');
  const arr = [...teamIds];
  const half = n / 2;
  const schedule: Array<Array<{ a: string; b: string }>> = [];

  for (let w = 0; w < weeks; w++) {
    const pairs: Array<{ a: string; b: string }> = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      pairs.push({ a, b });
    }
    schedule.push(pairs);

    // Rotate all but first.
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    for (let i = 1; i < n; i++) arr[i] = rest[i - 1];
    arr[0] = fixed;
  }

  return schedule;
}

function getUserBasket(state: { court: { width: number; height: number } }) {
  return { x: state.court.width - 70, y: state.court.height * 0.5 };
}

function getClosestOpponent(pos: { x: number; y: number }, entities: Array<{ team: 'user' | 'ai'; pos: { x: number; y: number }; categories: any; id: string }>, fromTeam: 'user' | 'ai') {
  let best: { id: string; d: number; categories: any } | null = null;
  for (const e of entities) {
    if (e.team === fromTeam) continue;
    const d = dist(pos, e.pos);
    if (!best || d < best.d) best = { id: e.id, d, categories: e.categories };
  }
  return best;
}

function computeUserDecisionInput(match: any, nowMs: number, decisionState: { lastDecisionAt: number; cooldownMs: number }) {
  const input: PlayerInput = { moveX: 0, moveY: 0, shootPressed: false, passPressed: false, passTarget: undefined };

  if (match.ball.kind !== 'possession') {
    // No control when not in possession.
    return input;
  }

  const ownerId = match.ball.ownerId as string;
  const owner = match.entities.find((e: any) => e.id === ownerId);
  if (!owner || owner.team !== 'user') return input;

  const ball = owner;
  const basket = getUserBasket(match);
  const dBasket = dist(ball.pos, basket);

  const userTeamEntities = match.entities.filter((e: any) => e.team === 'user');
  const teammate = userTeamEntities.find((e: any) => e.id !== ball.id);

  const canAct = nowMs - decisionState.lastDecisionAt >= decisionState.cooldownMs;

  if (canAct) {
    // Shooting decision.
    const shooting = ball.categories.shooting as number;
    const playmaking = ball.categories.playmaking as number;
    const defender = getClosestOpponent(ball.pos, match.entities, 'user');
    const defenderSkill = defender?.categories.defense ?? 5;
    const distFactor = clamp(dBasket / 520, 0, 1);

    const hitChance = clamp(
      0.12 + (shooting / 10) * 0.62 - (defenderSkill / 10) * 0.22 - distFactor * 0.22,
      0.05,
      0.9,
    );

    const wantsShot = dBasket < 280 && Math.random() < (0.25 + hitChance * 0.55) * (1 + (shooting - defenderSkill) / 40);
    if (wantsShot) {
      input.shootPressed = true;
      decisionState.lastDecisionAt = nowMs;
      return input;
    }

    // Passing decision (if teammate is more skilled shooting-wise).
    if (teammate) {
      const passChance = 0.06 + (playmaking / 10) * 0.22;
      const receiverBetter = teammate.categories.shooting >= ball.categories.shooting + 1;
      if (receiverBetter && Math.random() < passChance) {
        input.passPressed = true;
        input.passTarget = { x: teammate.pos.x, y: teammate.pos.y };
        decisionState.lastDecisionAt = nowMs;
        return input;
      }
    }
  }

  // Movement: move toward basket, with slight bias toward teammate if close.
  const moveTarget = dBasket > 240 ? basket : teammate?.pos ?? basket;
  const dir = normalize(sub(moveTarget, ball.pos));
  input.moveX = dir.x;
  input.moveY = dir.y;
  return input;
}

function simulateArcadeMatchAI(teamA: TeamState, teamB: TeamState, opts?: { courtWidth?: number; courtHeight?: number; dtMs?: number; maxSteps?: number }): MatchResult {
  // Engine controls:
  // - `teamA` acts as the "user" side using our synthesized inputs.
  // - `teamB` is controlled by the engine's AI.
  const match = createMatch(teamA, teamB, { courtWidth: opts?.courtWidth ?? 960, courtHeight: opts?.courtHeight ?? 540 });

  const dtMs = opts?.dtMs ?? 45;
  const maxSteps = opts?.maxSteps ?? 2200;

  const decisionState = { lastDecisionAt: -1e9, cooldownMs: 320 };
  const startMs = performance.now();

  for (let step = 0; step < maxSteps; step++) {
    const nowMs = startMs + step * dtMs;

    const input = computeUserDecisionInput(match, nowMs, decisionState);
    // Edge-trigger actions; our decision function sets shoot/pass for this frame only.
    const out = updateMatch(match as any, input, dtMs) as any;

    if (out?.status === 'ended') return out as MatchResult;
  }

  // Fallback: if something goes wrong, end with current score.
  return {
    status: 'ended',
    winner: match.score.user === match.score.ai ? 'draw' : match.score.user > match.score.ai ? 'user' : 'ai',
    finalScore: match.score,
    playerStatsByEntityId: match.playerStatsByEntityId,
  };
}

export type SeasonMatchEvent = {
  id: string;
  week: number;
  matchup: { aId: string; bId: string };
  homeTeamId: string;
  awayTeamId: string;
  finalScore: { a: number; b: number };
  winnerTeamId: string | null;
  topScorerByPoints: { playerId: string; playerName: string; points: number };
  awardLeaders: {
    mvp: Array<{ playerId: string; playerName: string; teamId: string; score: number; rank: number; prevRank: number | null; arrow: '↑' | '↓' | '→' | '—' }>;
    roy: Array<{ playerId: string; playerName: string; teamId: string; score: number; rank: number; prevRank: number | null; arrow: '↑' | '↓' | '→' | '—' }>;
    dpoy: Array<{ playerId: string; playerName: string; teamId: string; score: number; rank: number; prevRank: number | null; arrow: '↑' | '↓' | '→' | '—' }>;
  };
  seasonStandingsSnapshot: DraftStandingRow[];
};

export type SeasonSimulationResult = {
  updatedFranchise: FranchiseState;
  seasonStandings: DraftStandingRow[];
  powerRankings: PowerRankingRow[];
  awardWinners: { mvp: string; roy: string; dpoy: string };
  seasonPosts: LeagueNewsPost[];
  events: SeasonMatchEvent[];
  finals?: {
    championTeamId: string;
    finalsMvpPlayerId: string;
  };
  playoffs?: {
    seeds: Array<{ seed: number; teamId: string; teamName: string }>;
    semifinals: Array<{ aTeamId: string; bTeamId: string; score: { a: number; b: number }; winnerTeamId: string }>;
    finals?: { aTeamId: string; bTeamId: string; score: { a: number; b: number }; winnerTeamId: string };
  };
  seasonSummary?: {
    bestTeamId: string;
    bestPlayerId: string;
    biggestImprovementPlayerId: string;
    biggestImprovementDelta: number;
  };
};

function computeAwardLeaderboards(franchise: FranchiseState, standingsByTeamId: Record<string, DraftStandingRow>) {
  const allTeams = getLeagueTeams(franchise);
  const roster = allTeams.flatMap((t) => t.roster.map((p) => ({ team: t, player: p })));

  const perTeamGames = (teamId: string) => {
    // Derive from wins/losses.
    const row = standingsByTeamId[teamId];
    if (!row) return 0;
    return row.wins + row.losses;
  };

  // League averages for “consistency” proxy.
  const pgScores = roster
    .filter((x) => x.player.seasonStats.matchesPlayed > 0)
    .map((x) => {
      const n = Math.max(1, x.player.seasonStats.matchesPlayed);
      return x.player.seasonStats.points / n;
    });
  const meanPointsPG = pgScores.length ? pgScores.reduce((a, b) => a + b, 0) / pgScores.length : 0;

  const scoreMvp = (teamWins: number, player: typeof roster[number]) => {
    const n = Math.max(1, player.player.seasonStats.matchesPlayed);
    const ptsPG = player.player.seasonStats.points / n;
    const astPG = player.player.seasonStats.assists / n;
    const rebPG = player.player.seasonStats.rebounds / n;
    const stlPG = player.player.seasonStats.steals / n;
    const blkPG = player.player.seasonStats.blocks / n;

    const efficiency = ptsPG * 0.95 + astPG * 0.7 + rebPG * 0.45 + stlPG * 1.0 + blkPG * 0.85;
    const consistency = meanPointsPG > 0 ? 1 - clamp(Math.abs(ptsPG - meanPointsPG) / meanPointsPG, 0, 1) * 0.5 : 1;
    const potentialBoost = player.player.prospect.potential / 10;
    return efficiency + teamWins * 0.35 + potentialBoost * 0.6 + consistency * 0.25;
  };

  const scoreRoy = (player: typeof roster[number]) => {
    const n = Math.max(1, player.player.seasonStats.matchesPlayed);
    const ptsPG = player.player.seasonStats.points / n;
    const astPG = player.player.seasonStats.assists / n;
    const rebPG = player.player.seasonStats.rebounds / n;
    const stlPG = player.player.seasonStats.steals / n;
    const blkPG = player.player.seasonStats.blocks / n;

    const efficiency = ptsPG * 0.9 + astPG * 0.7 + rebPG * 0.4 + (stlPG + blkPG) * 0.95;
    const potentialBoost = player.player.prospect.potential / 10;
    return efficiency + potentialBoost * 0.75;
  };

  const scoreDpoy = (player: typeof roster[number], teamRow: DraftStandingRow) => {
    const n = Math.max(1, player.player.seasonStats.matchesPlayed);
    const stlPG = player.player.seasonStats.steals / n;
    const blkPG = player.player.seasonStats.blocks / n;
    const defCat = player.player.prospect.categories.defense;
    const teamGames = Math.max(1, teamRow.wins + teamRow.losses);
    const oppPPG = teamRow.pointsAgainst / teamGames;
    const defense = stlPG * 1.4 + blkPG * 1.3 + defCat * 0.55 + clamp((110 - oppPPG) / 30, 0, 2);
    return defense;
  };

  const mvpCandidates = roster
    .filter((x) => x.player.seasonStats.matchesPlayed > 0)
    .map((x) => {
      const teamRow = standingsByTeamId[x.team.id];
      return {
        playerId: x.player.id,
        playerName: x.player.prospect.name,
        teamId: x.team.id,
        score: scoreMvp(teamRow?.wins ?? 0, x),
      };
    })
    .sort((a, b) => b.score - a.score);

  const royCandidates = roster
    .filter((x) => x.player.seasonStats.matchesPlayed > 0)
    .map((x) => ({
      playerId: x.player.id,
      playerName: x.player.prospect.name,
      teamId: x.team.id,
      score: scoreRoy(x),
    }))
    .sort((a, b) => b.score - a.score);

  const dpoyCandidates = roster
    .filter((x) => x.player.seasonStats.matchesPlayed > 0)
    .map((x) => {
      const row = standingsByTeamId[x.team.id];
      return {
        playerId: x.player.id,
        playerName: x.player.prospect.name,
        teamId: x.team.id,
        score: scoreDpoy(x, row ?? { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, streak: '—', streakCount: 0, teamId: x.team.id, teamName: x.team.name, managerName: x.team.managerName, logoText: x.team.logoText, logoColor: x.team.logoColor }),
      };
    })
    .sort((a, b) => b.score - a.score);

  return {
    mvpTop5: mvpCandidates.slice(0, 5),
    royTop5: royCandidates.slice(0, 5),
    dpoyTop5: dpoyCandidates.slice(0, 5),
  };
}

function computePlayoffSeededTeams(franchise: FranchiseState, standings: DraftStandingRow[]) {
  const sorted = [...standings].sort((a, b) => {
    const pdA = a.pointsFor - a.pointsAgainst;
    const pdB = b.pointsFor - b.pointsAgainst;
    return b.wins - a.wins || pdB - pdA;
  });
  const allTeams = getLeagueTeams(franchise);
  return sorted.map((row) => allTeams.find((t) => t.id === row.teamId)!).filter(Boolean);
}

function cloneTeamWithBoost(team: TeamState, boostPct: number): TeamState {
  const boosted: TeamState = JSON.parse(JSON.stringify(team));
  for (const tp of boosted.roster) {
    const growth = (tp.prospect.potential / 10) * boostPct;
    tp.prospect.categories.shooting = clamp(tp.prospect.categories.shooting + growth, 1, 10);
    tp.prospect.categories.speed = clamp(tp.prospect.categories.speed + growth * 0.9, 1, 10);
    tp.prospect.categories.playmaking = clamp(tp.prospect.categories.playmaking + growth * 0.75, 1, 10);
    tp.prospect.categories.defense = clamp(tp.prospect.categories.defense + growth * 0.95, 1, 10);
    tp.prospect.overall = deriveOverallFromCategories(tp.prospect.categories);
  }
  boosted.teamRating = computeTeamRatingFromRoster(boosted);
  // Keep activePlayerIds as-is; they reference player ids in roster.
  return boosted;
}

export function simulateSeasonWithAwardsAndPlayoffs(franchise: FranchiseState, opts?: { gamesPerTeam?: number; weeks?: number; dtMs?: number }): SeasonSimulationResult {
  const gamesPerTeam = opts?.gamesPerTeam ?? 5;
  const dtMs = opts?.dtMs ?? 45;

  const seasonTeams = getLeagueTeams(franchise);
  const teamIds = seasonTeams.map((t) => t.id);

  const weeks = gamesPerTeam; // each week each team plays once (fast and replayable)
  const schedule = buildScheduleRoundRobin(teamIds, weeks);

  // Reset season stats/standings for this simulation by using existing seasonStats (expected 0 right after draft).
  const updatedFranchise: FranchiseState = JSON.parse(JSON.stringify(franchise));

  const teamsById = Object.fromEntries(getLeagueTeams(updatedFranchise).map((t) => [t.id, t])) as Record<string, TeamState>;

  const standingsByTeamId: Record<string, DraftStandingRow> = {};
  for (const t of seasonTeams) {
    standingsByTeamId[t.id] = {
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
  }

  let prevTop5ByAward = { mvp: new Map<string, number>(), roy: new Map<string, number>(), dpoy: new Map<string, number>() };

  const seasonPosts: LeagueNewsPost[] = [];
  const events: SeasonMatchEvent[] = [];

  // Capture pre-season overall for “biggest improvement”.
  const playerStartOverall: Record<string, number> = {};
  for (const t of seasonTeams) for (const p of t.roster) playerStartOverall[p.id] = p.prospect.overall;
  const teamStartRating: Record<string, number> = {};
  for (const t of seasonTeams) teamStartRating[t.id] = t.teamRating;

  for (let w = 0; w < weeks; w++) {
    const pairings = schedule[w];

    for (let m = 0; m < pairings.length; m++) {
      const p = pairings[m];

      // Alternate which side is user-controlled to reduce bias.
      const userSideIsA = (w + m) % 2 === 0;
      const teamUserId = userSideIsA ? p.a : p.b;
      const teamAiId = userSideIsA ? p.b : p.a;
      const teamUser = teamsById[teamUserId];
      const teamAi = teamsById[teamAiId];

      const matchResult = simulateArcadeMatchAI(teamUser, teamAi, { dtMs });
      const matchWinnerTeamId =
        matchResult.winner === 'draw'
          ? null
          : matchResult.winner === 'user'
            ? teamUserId
            : teamAiId;

      // Apply progression to both teams using applyMatchResults via a temp franchise.
      const temp: FranchiseState = {
        user: JSON.parse(JSON.stringify(teamUser)),
        ai: JSON.parse(JSON.stringify(teamAi)),
        otherTeams: [],
        freeAgents: [],
        freeAgencyPending: false,
        draft: updatedFranchise.draft,
        draftCompleted: false,
        seasonIndex: 0,
        seasonStandings: [],
        powerRankings: [],
        season: null,
        currentDate: updatedFranchise.currentDate,
        tradeHistory: [],
      };

      const applied = applyMatchResults(temp, {
        inGameStatsByEntityId: matchResult.playerStatsByEntityId,
        didUserWin: matchResult.winner === 'user',
        finalScore: matchResult.finalScore,
      });

      const updatedUser = applied.updated.user;
      const updatedAi = applied.updated.ai;
      // Keep seasonStats + categories changes.
      teamsById[teamUserId] = updatedUser;
      teamsById[teamAiId] = updatedAi;

      // Update standings from final score.
      const scoreA = matchResult.finalScore.user;
      const scoreB = matchResult.finalScore.ai;
      // Determine which side corresponds to teamUserId/teamAiId.
      const userWon = matchResult.winner === 'user';
      const aiWon = matchResult.winner === 'ai';
      if (userWon) {
        standingsByTeamId[teamUserId].wins += 1;
        standingsByTeamId[teamAiId].losses += 1;
      } else if (aiWon) {
        standingsByTeamId[teamAiId].wins += 1;
        standingsByTeamId[teamUserId].losses += 1;
      } else {
        // draw: split as loss/win? keep neutral
      }

      standingsByTeamId[teamUserId].pointsFor += userWon ? scoreA : scoreA;
      standingsByTeamId[teamUserId].pointsAgainst += aiWon ? scoreB : scoreB;
      standingsByTeamId[teamAiId].pointsFor += aiWon ? scoreB : scoreB;
      standingsByTeamId[teamAiId].pointsAgainst += userWon ? scoreA : scoreA;

      // Streak.
      const uRow = standingsByTeamId[teamUserId];
      const aRow = standingsByTeamId[teamAiId];
      if (matchResult.winner === 'user') {
        uRow.streak = 'W';
        uRow.streakCount += 1;
        aRow.streak = 'L';
        aRow.streakCount += 1;
      } else if (matchResult.winner === 'ai') {
        aRow.streak = 'W';
        aRow.streakCount += 1;
        uRow.streak = 'L';
        uRow.streakCount += 1;
      } else {
        // draw resets streak softly
        uRow.streak = '—';
        aRow.streak = '—';
        uRow.streakCount = 0;
        aRow.streakCount = 0;
      }

      // Award leaders after this match.
      // Rebuild updatedFranchise teams references.
      updatedFranchise.user = Object.values(teamsById).find((t) => t.id === updatedFranchise.user.id)!;
      updatedFranchise.ai = Object.values(teamsById).find((t) => t.id === updatedFranchise.ai.id)!;
      updatedFranchise.otherTeams = updatedFranchise.otherTeams.map((t) => teamsById[t.id] ?? t);

      const leaders = computeAwardLeaderboards(updatedFranchise, standingsByTeamId);

      const withArrow = (
        award: 'mvp' | 'roy' | 'dpoy',
        list: Array<{ playerId: string; playerName: string; teamId: string; score: number }>,
      ) => {
        const prev = prevTop5ByAward[award];
        return list.map((x, idx) => {
          const rank = idx + 1;
          const prevRank = prev.get(x.playerId) ?? null;
          const arrow: '↑' | '↓' | '→' | '—' =
            prevRank == null ? '—' : prevRank === rank ? '→' : prevRank > rank ? '↑' : '↓';
          return { ...x, rank, prevRank, arrow };
        });
      };

      const mvpTop5 = withArrow('mvp', leaders.mvpTop5);
      const royTop5 = withArrow('roy', leaders.royTop5);
      const dpoyTop5 = withArrow('dpoy', leaders.dpoyTop5);

      // Update prev maps for next match.
      prevTop5ByAward.mvp = new Map(mvpTop5.map((x) => [x.playerId, x.rank]));
      prevTop5ByAward.roy = new Map(royTop5.map((x) => [x.playerId, x.rank]));
      prevTop5ByAward.dpoy = new Map(dpoyTop5.map((x) => [x.playerId, x.rank]));

      // Build a couple “live” reactions.
      const topScorerId = Object.entries(matchResult.playerStatsByEntityId)
        .sort((a, b) => (b[1].points ?? 0) - (a[1].points ?? 0))[0]?.[0];
      const topScorerTeam = seasonTeams.find((t) => t.roster.some((p) => p.id === topScorerId));
      const topScorerPlayer = topScorerTeam?.roster.find((p) => p.id === topScorerId);
      const topScorer = topScorerPlayer
        ? { playerId: topScorerPlayer.id, playerName: topScorerPlayer.prospect.name, points: matchResult.playerStatsByEntityId[topScorerPlayer.id]?.points ?? 0 }
        : { playerId: 'unknown', playerName: 'Unknown', points: 0 };

      const weekLabel = `Week ${w + 1}`;
      const teamUserName = teamUser.name;
      const teamAiName = teamAi.name;
      const postText = `${weekLabel}: ${teamUserName} ${matchResult.winner === 'draw' ? 'draws' : matchResult.winner === 'user' ? 'beats' : 'loses to'} ${teamAiName} (${matchResult.finalScore.user}-${matchResult.finalScore.ai}).`;
      pushPost(
        seasonPosts,
        createPost(`match-post-${w}-${m}`, 'highlight', postText, {
          icon: '🔥',
          badge: 'MATCH',
          badgeTone: 'info',
        }),
      );
      if (topScorer.points > 0) {
        pushPost(
          seasonPosts,
          createPost(`match-pts-${w}-${m}`, 'highlight', `${topScorer.playerName} drops ${topScorer.points} points in the spotlight.`, {
            createdAtMs: Date.now() + 10,
            icon: '🎯',
            badge: 'TOP',
            badgeTone: 'accent',
          }),
        );
      }
      const scoreMargin = Math.abs(matchResult.finalScore.user - matchResult.finalScore.ai);
      const leaderTeamName = Object.values(standingsByTeamId)
        .slice()
        .sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst))[0]?.teamName;
      pushPost(
        seasonPosts,
        createPost(
          `reaction-${w}-${m}`,
          'reaction',
          scoreMargin <= 3
            ? `Fans are calling ${teamUserName} vs ${teamAiName} one of the wildest finishes of Week ${w + 1}.`
            : `${matchResult.winner === 'user' ? teamUserName : teamAiName} looked in full control from the opening tip tonight.`,
          {
            createdAtMs: Date.now() + 14,
            icon: scoreMargin <= 3 ? '📣' : '💬',
            badge: 'REACTION',
            badgeTone: scoreMargin <= 3 ? 'accent' : 'primary',
          },
        ),
      );
      if (leaderTeamName) {
        pushPost(
          seasonPosts,
          createPost(
            `standings-${w}-${m}`,
            'breaking',
            `${leaderTeamName} now sits on top of the league table after the latest slate of results.`,
            {
              createdAtMs: Date.now() + 18,
              icon: '📈',
              badge: 'STANDINGS',
              badgeTone: 'good',
            },
          ),
        );
      }
      if (mvpTop5[0]) {
        pushPost(
          seasonPosts,
          createPost(
            `race-${w}-${m}`,
            'reaction',
            `${mvpTop5[0].playerName} is building serious MVP momentum heading into the next round of games.`,
            {
              createdAtMs: Date.now() + 22,
              icon: '👀',
              badge: 'RACE',
              badgeTone: 'info',
            },
          ),
        );
      }

      events.push({
        id: `${w}-${m}-${Date.now()}`,
        week: w + 1,
        matchup: { aId: p.a, bId: p.b },
        homeTeamId: teamUserId,
        awayTeamId: teamAiId,
        finalScore: { a: matchResult.finalScore.user, b: matchResult.finalScore.ai },
        winnerTeamId: matchWinnerTeamId,
        topScorerByPoints: topScorer,
        awardLeaders: { mvp: mvpTop5, roy: royTop5, dpoy: dpoyTop5 },
        seasonStandingsSnapshot: Object.values(standingsByTeamId)
          .sort((a, b) => b.wins - a.wins || (b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)),
      });
    }

    if (w < weeks - 1) {
      const tradeActivity = simulateAiLeagueTradeActivity(updatedFranchise, {
        maxTrades: Math.random() < 0.22 ? 2 : 1,
        tradeChance: 0.72 - w * 0.08,
      });
      if (tradeActivity.newsPosts.length) {
        updatedFranchise.user = tradeActivity.updated.user;
        updatedFranchise.ai = tradeActivity.updated.ai;
        updatedFranchise.otherTeams = tradeActivity.updated.otherTeams;
        for (const team of getLeagueTeams(updatedFranchise)) {
          teamsById[team.id] = team;
        }
        for (const post of tradeActivity.newsPosts) {
          pushPost(seasonPosts, post);
        }
      }
    }
  }

  const seasonStandings = Object.values(standingsByTeamId).sort((a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst));

  const powerRankings: PowerRankingRow[] = Object.values(teamsById)
    .map((t) => {
      const avgPotential = t.roster.length ? t.roster.reduce((s, p) => s + p.prospect.potential, 0) / t.roster.length : 5;
      const score = t.teamRating * 1.2 + avgPotential * 0.9;
      return { teamId: t.id, teamName: t.name, managerName: t.managerName, logoText: t.logoText, logoColor: t.logoColor, rank: 0, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((row, idx) => ({ ...row, rank: idx + 1 }));

  // Final winners.
  updatedFranchise.user = teamsById[updatedFranchise.user.id] ?? updatedFranchise.user;
  updatedFranchise.ai = teamsById[updatedFranchise.ai.id] ?? updatedFranchise.ai;
  updatedFranchise.otherTeams = updatedFranchise.otherTeams.map((t) => teamsById[t.id] ?? t);

  const finalLeaders = computeAwardLeaderboards(updatedFranchise, standingsByTeamId);
  const awardWinners = {
    mvp: finalLeaders.mvpTop5[0]?.playerId ?? '',
    roy: finalLeaders.royTop5[0]?.playerId ?? '',
    dpoy: finalLeaders.dpoyTop5[0]?.playerId ?? '',
  };

  // Biggest improvement proxy: best delta in overall for any player.
  let bestImprover: { playerId: string; delta: number } | null = null;
  for (const t of seasonTeams) {
    const currentTeam = teamsById[t.id];
    if (!currentTeam) continue;
    for (const p of currentTeam.roster) {
      const before = playerStartOverall[p.id] ?? p.prospect.overall;
      const delta = p.prospect.overall - before;
      if (!bestImprover || delta > bestImprover.delta) bestImprover = { playerId: p.id, delta };
    }
  }

  if (awardWinners.mvp) {
    const mvpTeam = seasonTeams.find((t) => t.roster.some((p) => p.id === awardWinners.mvp));
    const mvpPlayer = mvpTeam?.roster.find((p) => p.id === awardWinners.mvp);
    if (mvpPlayer) {
      pushPost(
        seasonPosts,
        createPost(`award-mvp`, 'award', `${mvpPlayer.prospect.name} wins MVP!`, {
          icon: '🏆',
          badge: 'MVP',
          badgeTone: 'accent',
        }),
      );
    }
  }

  const sortedStandings = Object.values(standingsByTeamId).sort(
    (a, b) => b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst),
  );
  const bestTeamId = sortedStandings[0]?.teamId ?? '';
  const bestPlayerId = awardWinners.mvp;
  const biggestImprovementPlayerId = bestImprover?.playerId ?? '';
  const biggestImprovementDelta = bestImprover?.delta ?? 0;

  // Playoffs: use standings to seed and then simulate top matchups.
  const seededTeams = computePlayoffSeededTeams(updatedFranchise, seasonStandings);
  const n = seededTeams.length;

  const teamsToQualify = n <= 6 ? Math.min(2, n) : n <= 10 ? Math.min(4, n) : Math.min(8, n);
  const qualified = seededTeams.slice(0, teamsToQualify);

  const playoffMatches: Array<{ round: 'semi' | 'final' | 'quarter'; a: TeamState; b: TeamState }> = [];
  if (teamsToQualify === 2) {
    playoffMatches.push({ round: 'final', a: qualified[0], b: qualified[1] });
  } else if (teamsToQualify === 4) {
    // Semi
    playoffMatches.push({ round: 'semi', a: qualified[0], b: qualified[3] });
    playoffMatches.push({ round: 'semi', a: qualified[1], b: qualified[2] });
    // Finals placeholders; filled after sim
  } else {
    // For simplicity in this first iteration, treat any >=8 as semi+final only.
    // The full bracket UI comes next.
    playoffMatches.push({ round: 'semi', a: qualified[0], b: qualified[teamsToQualify - 1] });
  }

  // Simulate semis then finals for >=4.
  let finalsTeams: { winnerA: TeamState; winnerB: TeamState } | null = null;
  let championTeam: TeamState | null = null;
  let finalsMvpPlayerId = '';
  let playoffResults: SeasonSimulationResult['playoffs'] | undefined = undefined;

  const playoffStatsByPlayerId: Record<string, { points: number; assists: number; rebounds: number; steals: number; blocks: number }> = {};

  const simulateBoosted = (a: TeamState, b: TeamState, boost: number) => {
    const ab = cloneTeamWithBoost(a, boost);
    const bb = cloneTeamWithBoost(b, boost);
    return simulateArcadeMatchAI(ab, bb, { dtMs });
  };

  if (teamsToQualify === 2) {
    const match = simulateBoosted(qualified[0], qualified[1], 0.12);
    championTeam = match.winner === 'user' ? qualified[0] : match.winner === 'ai' ? qualified[1] : qualified[0];
    // finals MVP: top efficiency by points+contrib
    const finalsStats = match.playerStatsByEntityId;
    let best: { id: string; score: number } | null = null;
    for (const [id, s] of Object.entries(finalsStats)) {
      const score = (s.points ?? 0) + (s.assists ?? 0) * 0.6 + (s.rebounds ?? 0) * 0.25 + (s.steals ?? 0) * 1.0 + (s.blocks ?? 0) * 1.0;
      if (!best || score > best.score) best = { id, score };
    }
    finalsMvpPlayerId = best?.id ?? '';

    const seeds = qualified.map((t, idx) => ({
      seed: idx + 1,
      teamId: t.id,
      teamName: t.name,
    }));

    playoffResults = {
      seeds,
      semifinals: [],
      finals: {
        aTeamId: qualified[0].id,
        bTeamId: qualified[1].id,
        score: { a: match.finalScore.user, b: match.finalScore.ai },
        winnerTeamId: championTeam.id,
      },
    };
  } else if (teamsToQualify === 4) {
    const semi1 = simulateBoosted(qualified[0], qualified[3], 0.14);
    const semi2 = simulateBoosted(qualified[1], qualified[2], 0.14);
    const winner1 = semi1.winner === 'user' ? qualified[0] : semi1.winner === 'ai' ? qualified[3] : qualified[0];
    const winner2 = semi2.winner === 'user' ? qualified[1] : semi2.winner === 'ai' ? qualified[2] : qualified[1];
    const finalMatch = simulateBoosted(winner1, winner2, 0.16);
    championTeam = finalMatch.winner === 'user' ? winner1 : finalMatch.winner === 'ai' ? winner2 : winner1;

    const finalsStats = finalMatch.playerStatsByEntityId;
    let best: { id: string; score: number } | null = null;
    for (const [id, s] of Object.entries(finalsStats)) {
      const score = (s.points ?? 0) + (s.assists ?? 0) * 0.6 + (s.rebounds ?? 0) * 0.25 + (s.steals ?? 0) * 1.0 + (s.blocks ?? 0) * 1.0;
      if (!best || score > best.score) best = { id, score };
    }
    finalsMvpPlayerId = best?.id ?? '';

    const seeds = qualified.map((t, idx) => ({
      seed: idx + 1,
      teamId: t.id,
      teamName: t.name,
    }));

    playoffResults = {
      seeds,
      semifinals: [
        {
          aTeamId: qualified[0].id,
          bTeamId: qualified[3].id,
          score: { a: semi1.finalScore.user, b: semi1.finalScore.ai },
          winnerTeamId: winner1.id,
        },
        {
          aTeamId: qualified[1].id,
          bTeamId: qualified[2].id,
          score: { a: semi2.finalScore.user, b: semi2.finalScore.ai },
          winnerTeamId: winner2.id,
        },
      ],
      finals: {
        aTeamId: winner1.id,
        bTeamId: winner2.id,
        score: { a: finalMatch.finalScore.user, b: finalMatch.finalScore.ai },
        winnerTeamId: championTeam.id,
      },
    };
  } else {
    // Fallback: pick best by regular season teamRating.
    championTeam = qualified[0] ?? null;
  }

  if (championTeam) {
    pushPost(
      seasonPosts,
      createPost(`champ`, 'highlight', `${championTeam.name} are the champions!`, {
        icon: '🏀',
        badge: 'CHAMP',
        badgeTone: 'good',
      }),
    );
    pushPost(
      seasonPosts,
      createPost(`champ-reaction`, 'reaction', `The league is exploding with reactions as ${championTeam.name} celebrate on the floor with the trophy.`, {
        createdAtMs: Date.now() + 10,
        icon: '🎉',
        badge: 'CELEBRATION',
        badgeTone: 'accent',
      }),
    );
    pushPost(
      seasonPosts,
      createPost(`champ-breaking`, 'breaking', `${championTeam.name} just closed the finals and the offseason rumor cycle is already starting.`, {
        createdAtMs: Date.now() + 14,
        icon: '🚨',
        badge: 'BREAKING',
        badgeTone: 'info',
      }),
    );
  }

  if (finalsMvpPlayerId) {
    const allTeams = getLeagueTeams(updatedFranchise);
    const team = allTeams.find((t) => t.roster.some((p) => p.id === finalsMvpPlayerId));
    const player = team?.roster.find((p) => p.id === finalsMvpPlayerId);
    if (player) {
      pushPost(
        seasonPosts,
        createPost(`finals-mvp`, 'award', `${player.prospect.name} wins Finals MVP!`, {
          createdAtMs: Date.now() + 20,
          icon: '⭐',
          badge: 'FINALS MVP',
          badgeTone: 'accent',
        }),
      );
      pushPost(
        seasonPosts,
        createPost(`finals-mvp-reaction`, 'reaction', `${player.prospect.name} just authored the signature performance of the postseason and owns the Finals MVP trophy.`, {
          createdAtMs: Date.now() + 24,
          icon: '📸',
          badge: 'VIRAL',
          badgeTone: 'accent',
        }),
      );
    }
  }

  return {
    updatedFranchise,
    seasonStandings,
    powerRankings,
    awardWinners,
    seasonPosts,
    events,
    finals: championTeam && finalsMvpPlayerId ? { championTeamId: championTeam.id, finalsMvpPlayerId } : undefined,
    playoffs: playoffResults,
    seasonSummary: {
      bestTeamId,
      bestPlayerId,
      biggestImprovementPlayerId,
      biggestImprovementDelta,
    },
  };
}
