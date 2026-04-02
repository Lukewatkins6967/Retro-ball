import React, { useEffect, useMemo, useState } from 'react';
import type { FranchiseState, FreeAgencyDaySummary, LeagueNewsPost } from '../game/types';
import type { DraftStandingRow } from '../game/types';
import {
  createFranchiseState,
  getUserDraftChoices,
  applyMatchResults,
  applyLeagueMatchResults,
  requestTrade,
  reSignPlayer,
  signFreeAgent,
  advanceFreeAgencyDay,
  completeFreeAgencyPhase,
  advanceSingleDraftPick,
  type TradeCounterOffer,
  setActivePlayers,
  setRotationMode,
  advanceDraftPicks,
  userDraftPick,
  advanceDate,
  ensureSeasonReady,
  prepareNextSeasonCycle,
  simulateAiLeagueTradeActivity,
} from '../game/franchise';
import StartMenu from '../ui/StartMenu';
import DraftMenu from '../ui/DraftMenu';
import RosterMenu from '../ui/RosterMenu';
import TradeMenu from '../ui/TradeMenu';
import GameScreen from '../ui/GameScreen';
import UpdateLogWidget, { type UpdateLogEntry } from '../ui/UpdateLogWidget';
import UpdateLogPage from '../ui/UpdateLogPage';
import TopNav from '../ui/TopNav';
import LotteryScreen from '../ui/LotteryScreen';
import NewsScreen from '../ui/NewsScreen';
import SeasonSimScreen from '../ui/SeasonSimScreen';
import SeasonScheduleScreen from '../ui/SeasonScheduleScreen';
import PlayoffsScreen from '../ui/PlayoffsScreen';
import StatsScreen from '../ui/StatsScreen';
import Modal from '../ui/Modal';
import FreeAgencyScreen from '../ui/FreeAgencyScreen';
import SettingsPanel from '../ui/SettingsPanel';
import FreeAgencyRecapModal from '../ui/FreeAgencyRecapModal';
import { simulateMatch, type SimulatedMatch } from '../game/matchSim';
import BoxScoreModal from '../ui/BoxScoreModal';
import { createPlayoffsState, tryAdvancePlayoffs } from '../game/playoffs';
import { clearFranchise, hasSavedFranchise, loadFranchise, saveFranchise } from '../game/persistence';
import { buildDynamicStorylinePosts } from '../game/personality';
import { applySettingsToDocument, getSimPaceFromSettings, loadGameSettings, saveGameSettings, setCurrentSettings, type GameSettings } from '../game/settings';

type Screen = 'start' | 'lottery' | 'draft' | 'roster' | 'stats' | 'trade' | 'freeAgency' | 'game' | 'seasonSchedule' | 'playoffs' | 'season' | 'news' | 'updateLog';
type ScheduledGameContext = {
  source: 'season' | 'playoffs';
  id: string;
  homeTeamId: string;
  awayTeamId: string;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('start');
  const [franchise, setFranchise] = useState<FranchiseState | null>(null);
  const [settings, setSettings] = useState<GameSettings>(() => loadGameSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tradeMessage, setTradeMessage] = useState<string | undefined>(undefined);
  const [tradeCounterOffer, setTradeCounterOffer] = useState<TradeCounterOffer | undefined>(undefined);
  const [progressionNotices, setProgressionNotices] = useState<string[]>([]);
  const [frontOfficeMessage, setFrontOfficeMessage] = useState<string | undefined>(undefined);
  const [tradePartnerId, setTradePartnerId] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState<Screen>('start');

  const [updateLevel, setUpdateLevel] = useState(0);
  const [entries, setEntries] = useState<UpdateLogEntry[]>([]);
  const [newsPosts, setNewsPosts] = useState<LeagueNewsPost[]>([]);
  const [hasSave, setHasSave] = useState(false);
  const [freeAgencyRecapFranchise, setFreeAgencyRecapFranchise] = useState<FranchiseState | null>(null);
  const [aiForNextPick, setAiForNextPick] = useState<boolean>(() => {
    // Default to manual drafting.
    return false;
  });

  const [confirmRestartOpen, setConfirmRestartOpen] = useState(false);
  const [confirmSimOpen, setConfirmSimOpen] = useState(false);
  const [simResult, setSimResult] = useState<{ score: { user: number; ai: number }; top: Array<{ name: string; pts: number }> } | null>(null);
  const [championshipCelebration, setChampionshipCelebration] = useState<{ teamName: string; message: string; nextFranchise: FranchiseState } | null>(null);

  const [scheduledPlayGame, setScheduledPlayGame] = useState<ScheduledGameContext | null>(null);
  const [boxScore, setBoxScore] = useState<{
    title: string;
    homeTeamName: string;
    awayTeamName: string;
    score: { home: number; away: number };
    homeLines: SimulatedMatch['boxScore']['homeLines'];
    awayLines: SimulatedMatch['boxScore']['awayLines'];
  } | null>(null);

  const lastSeasonStandings = useMemo(() => {
    if (!franchise) return [];
    try {
      const raw = localStorage.getItem('combinedAppLastSeasonStandings_v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw) as DraftStandingRow[];
      return parsed;
    } catch {
      return [];
    }
  }, [franchise]);

  const scheduledGameView = useMemo(() => {
    if (!franchise || !scheduledPlayGame) return null;
    const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
    const homeTeam = leagueTeams.find((team) => team.id === scheduledPlayGame.homeTeamId) ?? franchise.user;
    const awayTeam = leagueTeams.find((team) => team.id === scheduledPlayGame.awayTeamId) ?? franchise.ai;
    const userIsHome = franchise.user.id === scheduledPlayGame.homeTeamId;
    const controlledTeam = userIsHome ? homeTeam : awayTeam;
    const opponentTeam = userIsHome ? awayTeam : homeTeam;
    const matchType = scheduledPlayGame.source === 'playoffs' ? 'Playoff Matchup' : 'Season Matchup';

    return {
      homeTeam,
      awayTeam,
      controlledTeam,
      opponentTeam,
      userIsHome,
      matchLabel: `${awayTeam.name} at ${homeTeam.name}`,
      matchMetaLabel: `${matchType} • ${userIsHome ? 'Home Floor' : 'Road Test'}`,
    };
  }, [franchise, scheduledPlayGame]);

  const buildFreeAgencyNewsPosts = (summaries: FreeAgencyDaySummary[]) => {
    const posts: LeagueNewsPost[] = [];
    let offset = 0;

    for (const summary of summaries) {
      for (const signing of summary.signings) {
        posts.push({
          id: `fa-signing-${summary.day}-${signing.playerId}-${offset}`,
          createdAtMs: Date.now() + offset,
          type: 'breaking',
          icon: 'FA',
          badge: 'FA',
          badgeTone: signing.teamId === franchise?.user.id ? 'good' : 'accent',
          text: `${signing.teamName} signs ${signing.playerName} for ${signing.years} years at $${Math.round(signing.salary / 1000)}k per season.`,
        });
        offset += 1;
      }

      const headlineFeeds = summary.feed.slice(0, 3);
      for (const feedItem of headlineFeeds) {
        posts.push({
          id: `fa-feed-${summary.day}-${offset}`,
          createdAtMs: Date.now() + offset,
          type: feedItem.toLowerCase().includes('signs') ? 'breaking' : 'reaction',
          icon: 'FA',
          badge: `DAY ${summary.day}`,
          badgeTone: feedItem.toLowerCase().includes('bidding war') ? 'accent' : 'info',
          text: feedItem,
        });
        offset += 1;
      }
    }

    return posts;
  };

  const finishFreeAgencyWithRecap = (completed: FranchiseState, summaries: FreeAgencyDaySummary[], closeMessage: string) => {
    setFranchise(completed);
    setNewsPosts((prev) => [
      ...buildDynamicStorylinePosts(completed, { limit: 3 }),
      ...buildFreeAgencyNewsPosts(summaries),
      {
        id: `fa-close-${Date.now()}`,
        createdAtMs: Date.now(),
        type: 'breaking',
        icon: 'FA',
        badge: 'FA',
        badgeTone: 'accent',
        text: 'Free agency closes and the league shifts to the lottery and draft.',
      },
      ...prev,
    ].slice(0, 250));
    setFrontOfficeMessage(closeMessage);
    setFreeAgencyRecapFranchise(completed);
  };

  const pushStorylines = (nextFranchise: FranchiseState, limit = 2) => {
    setNewsPosts((prev) => [...buildDynamicStorylinePosts(nextFranchise, { limit }), ...prev].slice(0, 250));
  };

  // On first mount, check for saved franchise.
  useEffect(() => {
    try {
      setHasSave(hasSavedFranchise());
    } catch {
      setHasSave(false);
    }
  }, []);

  useEffect(() => {
    setCurrentSettings(settings);
    applySettingsToDocument(settings);
    saveGameSettings(settings);
  }, [settings]);

  // Auto-save franchise + news.
  useEffect(() => {
    if (!franchise) return;
    try {
      saveFranchise({ franchise, newsPosts });
      setHasSave(true);
    } catch {
      // Ignore storage issues.
    }
  }, [franchise, newsPosts]);

  useEffect(() => {
    const seedEntries: UpdateLogEntry[] = [
      {
        id: 'seed-1',
        createdAt: Date.now() - 1000 * 60 * 60 * 4,
        description: 'Hybrid core: draft/roster/roster management + arcade 2v2 gameplay driven by NBA draft stats',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-2',
        createdAt: Date.now() - 1000 * 60 * 60 * 2,
        description: 'Stats & potential overhaul: per-player PTS/AST/REB/STL/BLK tracking, potential (1-10), team leaders, trade value & AI needs-based decisions, and match-based progression growth',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-3',
        createdAt: Date.now() - 1000 * 60 * 10,
        description: 'Update Log UI added: hover tooltip widget and full Update Log page with back navigation',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-4',
        createdAt: Date.now() - 1000 * 60 * 2,
        description: 'Update Log seeded/verified: widget starts at 0 and includes all currently implemented upgrades',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-5',
        createdAt: Date.now() - 1000 * 60 * 1,
        description: 'UI modernization: header navigation, refreshed rounded/shadowed menu layouts, stat/potential icons + bars, and updated Update Log styling',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-6',
        createdAt: Date.now() - 1000 * 60 * 0.5,
        description: 'Draft broadcast upgrade: randomized multi-team draft order, live TV-style draft feed, and season standings/power rankings UI',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-7',
        createdAt: Date.now() - 1000 * 60 * 0.25,
        description: 'Draft lottery pre-season system: standings-based weighted odds, animated reveal sequence, and lottery-driven draft order',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-8',
        createdAt: Date.now() - 1000 * 60 * 0.1,
        description: 'League Season sim added: 5-game regular season, live MVP/ROY/DPOY race UI, end-of-season awards + standings persistence, playoffs + championship, and Social/League News feed page',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-9',
        createdAt: Date.now() - 1000 * 60 * 0.05,
        description: 'Draft flow fix: AI now auto-advances picks until it becomes the user’s turn so the draft screen never stalls.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-10',
        createdAt: Date.now() - 1000 * 60 * 0.03,
        description: 'Draft control upgrade: choose “Me” vs “AI” for your picks, and improve prospect overall/potential separation using more original scouting data.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-11',
        createdAt: Date.now() - 1000 * 60 * 0.02,
        description: 'Draft controls refined: AI now pauses on your turns, can draft your next pick once on request, and no longer auto-picks in countdown (only you/AI button triggers picks).',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-12',
        createdAt: Date.now() - 1000 * 60 * 0.015,
        description: 'Safety + sim controls: added Restart Game (confirmation) and Simulate Match (confirmation + results popup + stat/standings updates).',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-13',
        createdAt: Date.now() - 1000 * 60 * 0.01,
        description: 'Trade AI updated to be smarter and less harsh, adjusting value ratio, need fit, and urgency weight for more realistic acceptance.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-14',
        createdAt: Date.now() - 1000 * 60 * 0.008,
        description: 'Reworked navigation: Matches now routes to Season Schedule and added dedicated Stats page for league-wide leaders and odds.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-15',
        createdAt: Date.now() - 1000 * 60 * 0.005,
        description: 'Season start auto-triggers after draft completion, removing extra “play or simulate match” actions from roster screen.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-16',
        createdAt: Date.now() - 1000 * 60 * 0.002,
        description: 'Dedicated Stats page now shows team standings, power rankings, lottery odds, and compute league leaders.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-17',
        createdAt: Date.now() - 1000 * 30,
        description: 'Bug fixes: played playoff games now update the bracket correctly, regular-season week advance no longer jumps to playoffs early, growth notices show on the roster, and the duplicate Stats nav button was removed.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-18',
        createdAt: Date.now() - 1000 * 15,
        description: 'Season flow update: Start Season now boots a playable schedule reliably, the draft no longer auto-links into the season screen after completion, and the Stats page UI was refreshed into a cleaner league dashboard.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-19',
        createdAt: Date.now() - 1000 * 8,
        description: 'Trade AI loosened substantially and now returns compromise counteroffers when a deal is close instead of hard-rejecting everything.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-20',
        createdAt: Date.now() - 1000 * 4,
        description: 'Match simulation rebuilt around calculated player matchups, possession-level shot creation, contest pressure, rebounds, and score normalization so results are more detailed and teams no longer keep landing on 0.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-21',
        createdAt: Date.now() - 1000 * 2,
        description: 'Season stats now split between regular season and playoffs, reset cleanly every new year, and the app automatically rolls into the next season cycle after the finals while preserving power rankings.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-22',
        createdAt: Date.now() - 1000,
        description: 'Finals winners now get a championship celebration screen before the next draft, and the social feed was upgraded with richer UI plus a much denser mix of reactions, standings buzz, and postseason coverage.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-23',
        createdAt: Date.now(),
        description: 'Traded draft picks now stay with the team that acquired them when the next draft arrives, and every post-launch season generates a fresh draft class instead of repeating the original pool.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-24',
        createdAt: Date.now() + 1,
        description: 'Roster cards now open a front-office player modal with stat detail, contract warnings, re-signing, trade access, and history, while offseason expirings feed a live free agency market under the hard cap.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-25',
        createdAt: Date.now() + 2,
        description: 'End-of-season flow now routes into a full free agency phase before the draft, with salary sliders, loyalty and happiness meters, cap-aware negotiations, intelligent AI signings, and live contract acceptance odds.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-26',
        createdAt: Date.now() + 3,
        description: 'New game flow now opens straight into the draft from the main Continue button, the old Start Draft button was removed, and startup/offseason state bugs were cleaned up around season sim handoffs.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-27',
        createdAt: Date.now() + 4,
        description: 'Free agency is now locked until the season truly ends, and the draft advances one visible pick at a time so you can actually watch every team make selections.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-28',
        createdAt: Date.now() + 5,
        description: 'AI teams now make their own in-season trades around the league, and the site shell was cleaned up with a sharper nav, richer schedule hub, and more polished page styling.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-29',
        createdAt: Date.now() + 6,
        description: 'Player management popups now stay inside the viewport and scroll cleanly, so the contract panel fits on screen instead of overflowing past the window.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-30',
        createdAt: Date.now() + 7,
        description: 'The player contract popup was tightened further with a smaller width, denser spacing, and more compact controls so it takes up less screen space.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-31',
        createdAt: Date.now() + 8,
        description: 'Modal panels now lock above the site chrome with background scrolling disabled, a sticky in-modal header, and top-anchored viewport sizing so popup titles never hide behind the nav.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-32',
        createdAt: Date.now() + 9,
        description: 'Modal overlays now render through a portal with full-screen fixed backdrops and higher stacking than the navbar, so the Hybrid Basketball header can no longer sit on top of contract popups.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-33',
        createdAt: Date.now() + 10,
        description: 'The trade screen was redesigned into a cleaner front-office hub with better partner cards, richer asset rows, a sticky deal summary rail, and a stronger confirm/counteroffer flow.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-34',
        createdAt: Date.now() + 11,
        description: 'End-of-season free agency now opens with a real market, roster re-signing is pushed into that offseason phase, traded lottery picks show their current owner, and the league was expanded with deeper draft classes and more teams.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-35',
        createdAt: Date.now() + 12,
        description: 'Player overall ratings now use a real 100-point scale with wider separation between prospects and veterans, while contracts, trades, sim balance, and team ratings were recalibrated around the new spread.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-36',
        createdAt: Date.now() + 13,
        description: 'Season schedule sim now supports both one-game-at-a-time results and a fast Sim Whole Week option, so you can clear a full slate without clicking every matchup individually.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-37',
        createdAt: Date.now() + 14,
        description: 'Trade AI now weighs roster fit and outgoing core pain more intelligently, counters are softer, and compromise deals can still be accepted even when you tweak them instead of copying the AI package exactly.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-38',
        createdAt: Date.now() + 15,
        description: 'Generated draft classes now create much more varied prospects with bigger name pools, seeded archetypes, different positions and body types, and more distinct skill/stat profiles instead of lightly remixed copies of the original class.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-39',
        createdAt: Date.now() + 16,
        description: 'The live game now leans into a more physical arcade style with stronger court presentation, manual dodge/jump/strip actions, defensive control when you do not have the ball, contact-heavy movement, and safer click-to-pass handling on the game canvas.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-40',
        createdAt: Date.now() + 17,
        description: 'Unity extraction pass: exported the Karate Basketball build into reusable project assets, then wired the live game to use the extracted pixel-art court, hoops, ball, and character sprite sets directly in the web match renderer.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-41',
        createdAt: Date.now() + 18,
        description: 'Live games now open in a fullscreen arcade shell with the site nav hidden, plus a corner options menu that lets you simulate the rest of a match or back out and leave that scheduled game unplayed.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-42',
        createdAt: Date.now() + 19,
        description: 'Arcade gameplay now leans much harder into the extracted Karate Basketball build: sharper full-screen rendering, richer crowd/court presentation, original-game audio cues, longer match flow, loose-ball physics, smarter pass flight, stronger hit/KO contact, and more explosive dunk/shot behavior.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-43',
        createdAt: Date.now() + 20,
        description: 'Free agency now runs as a live day-by-day market with competing offers, bidding wars, daily recaps, deeper roster targets, smarter cap-aware AI team building, and depth-weighted sim value before the lottery and draft.',
        major: true,
        delta: 0.5,
      },
      {
        id: 'seed-44',
        createdAt: Date.now() + 21,
        description: 'Theme polish pass: Modern stays untouched, while Retro Arcade, Dark Mode, Neon Cyber, Classic Sports, and Minimalist now each have much more dramatic backgrounds, panel treatments, button styles, and overall visual identity.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-45',
        createdAt: Date.now() + 22,
        description: 'Theme isolation pass: selected themes now restyle the full management website while the live arcade gameplay presentation stays visually fixed and unchanged.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-46',
        createdAt: Date.now() + 23,
        description: 'Theme expansion pass: non-Modern themes now push much deeper across the management website with stronger nav, page, card, chip, modal, schedule, trade, settings, and offseason styling for a more dramatic full-site visual change.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-47',
        createdAt: Date.now() + 24,
        description: 'Deployment prep pass: the app is now self-contained for hosting, draft data no longer depends on the sibling project at build time, and Vercel deployment files and setup docs are included for easy auto-updating releases.',
        major: false,
        delta: 0.1,
      },
      {
        id: 'seed-48',
        createdAt: Date.now() + 25,
        description: 'Hosting hardening pass: the repo can now build from the project root for Vercel too, with workspace scripts and safer TypeScript includes so deployment is less sensitive to dashboard root-directory setup.',
        major: false,
        delta: 0.1,
      },
    ];

    try {
      const raw = localStorage.getItem('combinedAppUpdateLog_v1');
      if (!raw) {
        const seedLevel = seedEntries.reduce((s, e) => s + e.delta, 0);
        setUpdateLevel(Math.round(seedLevel * 10) / 10);
        setEntries(seedEntries);
        return;
      }

      const parsed = JSON.parse(raw) as { updateLevel: number; entries: UpdateLogEntry[] };
      const storedEntries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const storedLevel = typeof parsed.updateLevel === 'number' ? parsed.updateLevel : 0;

      // Ensure we always include newly-added seed entries without overwriting user updates.
      const missingSeedEntries = seedEntries.filter((se) => !storedEntries.some((e) => e?.id === se.id));
      const missingDeltaSum = missingSeedEntries.reduce((s, e) => s + e.delta, 0);

      const nextEntries = missingSeedEntries.length ? [...storedEntries, ...missingSeedEntries] : storedEntries;
      const nextLevel = missingDeltaSum ? Math.round((storedLevel + missingDeltaSum) * 10) / 10 : storedLevel;

      setUpdateLevel(nextLevel);
      setEntries(nextEntries);
    } catch {
      // Ignore storage issues.
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        'combinedAppUpdateLog_v1',
        JSON.stringify({ updateLevel, entries }),
      );
    } catch {
      // Ignore storage issues.
    }
  }, [updateLevel, entries]);

  useEffect(() => {
    // Optional persistence: helps keep your preference across refresh.
    try {
      localStorage.setItem('combinedAppAiForNextPick_v1', aiForNextPick ? '1' : '0');
    } catch {
      // Ignore storage issues.
    }
  }, [aiForNextPick]);

  const draftChoices = useMemo(() => {
    if (!franchise) return [];
    return getUserDraftChoices(franchise, 6);
  }, [franchise]);

  // Seed initial news from the draft feed when a draft completes.
  useEffect(() => {
    if (!franchise) return;
    if (!franchise.draftCompleted) return;

    if (newsPosts.length > 0) return;
    try {
      const seedDraftPosts: LeagueNewsPost[] = franchise.draft.draftFeed.slice(-25).map((ev, idx) => ({
        id: `draft-post-${ev.id}-${idx}`,
        createdAtMs: ev.createdAtMs,
        type: 'draft',
        icon: '🏀',
        badge: 'DRAFT',
        badgeTone: 'primary',
        text: ev.pressRelease,
      }));
      setNewsPosts(seedDraftPosts);
    } catch {
      // ignore
    }
  }, [franchise, newsPosts.length]);

  const draftCompleted = !!franchise?.draftCompleted;

  // Auto-advance the draft:
  // - human mode: AI drafts until it's the user’s pick
  // - ai mode: AI drafts all remaining picks (including user picks)
  useEffect(() => {
    if (!franchise) return;
    if (screen !== 'draft') return;
    if (franchise.draftCompleted) return;

    const curPickTeamId = franchise.draft.draftOrderTeamIds[franchise.draft.currentPickIndex];
    const userTurn = curPickTeamId === franchise.user.id;

    if (userTurn) {
      if (!aiForNextPick) return;
      const timer = window.setTimeout(() => {
        setFranchise((prev) => (prev ? advanceSingleDraftPick(prev, { userPickMode: 'ai' }) : prev));
        setAiForNextPick(false);
      }, 900);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setFranchise((prev) => (prev ? advanceSingleDraftPick(prev, { userPickMode: 'human' }) : prev));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [screen, franchise?.draft.currentPickIndex, franchise?.draftCompleted, aiForNextPick, franchise]);

  const openSeasonSchedule = () => {
    setFranchise((prev) => (prev ? ensureSeasonReady(prev) : prev));
    setScreen('seasonSchedule');
  };

  const showFreeAgency = () => {
    if (!franchise?.freeAgencyPending) return;
    setFrontOfficeMessage(undefined);
    setScreen('freeAgency');
  };

  const simulateScheduledSeasonGame = (baseFranchise: FranchiseState, game: { id: string; homeTeamId: string; awayTeamId: string }) => {
    const leagueTeams = [baseFranchise.user, baseFranchise.ai, ...baseFranchise.otherTeams];
    const home = leagueTeams.find((t) => t.id === game.homeTeamId);
    const away = leagueTeams.find((t) => t.id === game.awayTeamId);
    if (!home || !away) {
      return {
        updated: baseFranchise,
        progressionNotices: [] as string[],
        result: null as SimulatedMatch | null,
      };
    }

    const res = simulateMatch(home, away, { pace: getSimPaceFromSettings(settings), userTeamId: baseFranchise.user.id });
    const applied = applyLeagueMatchResults(baseFranchise, {
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      inGameStatsByEntityId: res.playerStatsByEntityId,
      finalScore: { home: res.finalScore.user, away: res.finalScore.ai },
    });
    const nextSeason = applied.updated.season;
    if (!nextSeason) {
      return { updated: applied.updated, progressionNotices: applied.progressionNotices, result: res };
    }

    const homeScore = res.finalScore.user;
    const awayScore = res.finalScore.ai;
    const winnerTeamId =
      homeScore === awayScore ? null : homeScore > awayScore ? game.homeTeamId : game.awayTeamId;

    const nextGames = nextSeason.games.map((scheduledGame) => {
      if (scheduledGame.id !== game.id) return scheduledGame;
      return {
        ...scheduledGame,
        result: {
          played: true,
          score: { home: homeScore, away: awayScore },
          winnerTeamId,
        },
      };
    });

    const advanced = advanceDate(applied.updated, 1);
    return {
      updated: {
        ...advanced,
        season: { ...(advanced.season ?? nextSeason), games: nextGames },
      },
      progressionNotices: applied.progressionNotices,
      result: res,
    };
  };

  const rollIntoNextSeason = (completedFranchise: FranchiseState) => {
    try {
      localStorage.setItem('combinedAppLastSeasonStandings_v1', JSON.stringify(completedFranchise.seasonStandings));
    } catch {
      // Ignore storage issues.
    }

    setFranchise(prepareNextSeasonCycle(completedFranchise));
    setProgressionNotices([]);
    setScheduledPlayGame(null);
    setBoxScore(null);
    setFrontOfficeMessage('Free agency has opened. Re-sign your own players or hit the market before moving on to the draft lottery.');
    setScreen('freeAgency');
  };

  const queueChampionshipCelebration = (completedFranchise: FranchiseState) => {
    const championId = completedFranchise.season?.playoffs?.championTeamId;
    const champion = championId
      ? [completedFranchise.user, completedFranchise.ai, ...completedFranchise.otherTeams].find((team) => team.id === championId)
      : null;
    const teamName = champion?.name ?? 'League Champion';
    const message = `${teamName} are celebrating on the floor after closing out the finals. Take in the moment, then the league will roll into free agency before the next draft.`;

    setNewsPosts((prev) => [
      {
        id: `champ-celebration-${Date.now()}`,
        createdAtMs: Date.now(),
        type: 'highlight',
        icon: '🎉',
        badge: 'TITLE',
        badgeTone: 'accent',
        text: `${teamName} flood the court with a full championship celebration after the finals horn.`,
      },
      ...prev,
    ]);
    setChampionshipCelebration({ teamName, message, nextFranchise: completedFranchise });
  };

  return (
    <div className={`appShell ${screen === 'game' ? 'appShellGameplayLock' : ''}`}>
      <div className="appGlow appGlowLeft" aria-hidden="true" />
      <div className="appGlow appGlowRight" aria-hidden="true" />
      {screen !== 'updateLog' && screen !== 'game' && (
        <TopNav
          current={screen}
          hasFranchise={!!franchise}
          freeAgencyEnabled={!!franchise?.freeAgencyPending}
          onNavigate={(target) => {
            if ((target === 'game' || target === 'seasonSchedule' || target === 'stats') && !franchise) return;
            if (target === 'freeAgency' && !franchise?.freeAgencyPending) return;
            if (franchise?.freeAgencyPending && (target === 'draft' || target === 'seasonSchedule')) {
              setScreen('freeAgency');
              return;
            }
            if (target === 'seasonSchedule' && franchise) {
              setFranchise((prev) => (prev ? ensureSeasonReady(prev) : prev));
            }
            if (target === 'freeAgency') setFrontOfficeMessage(undefined);
            setScreen(target);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onRestart={() => setConfirmRestartOpen(true)}
        />
      )}
      {screen === 'start' && (
        <StartMenu
          onStart={({ userName }) => {
            const next = createFranchiseState({ userName });
            setFranchise(next);
            setProgressionNotices([]);
            setTradeMessage(undefined);
            setTradeCounterOffer(undefined);
            setFrontOfficeMessage(undefined);
            setNewsPosts([]);
            setScreen('draft');
          }}
          hasSave={hasSave}
          onContinue={() => {
            try {
              const loaded = loadFranchise();
              if (!loaded) return;
              setFranchise(loaded.franchise);
              setNewsPosts(loaded.newsPosts);
              setProgressionNotices([]);
              setTradeMessage(undefined);
              setSimResult(null);
              setScreen(loaded.franchise.freeAgencyPending ? 'freeAgency' : loaded.franchise.draftCompleted ? 'roster' : 'draft');
            } catch {
              // ignore
            }
          }}
        />
      )}

      {screen === 'lottery' && franchise && (
        <LotteryScreen
          teams={[franchise.user, franchise.ai, ...franchise.otherTeams]}
          lastSeasonStandings={
            (() => {
              // Seed a first “previous season standings” set if none exists.
              try {
                const raw = localStorage.getItem('combinedAppLastSeasonStandings_v1');
                if (raw) {
                  const parsed = JSON.parse(raw) as DraftStandingRow[];
                  if (Array.isArray(parsed) && parsed.length) return parsed;
                }
              } catch {
                // ignore
              }

              const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
              const generated: DraftStandingRow[] = leagueTeams.map((t) => {
                // Create a plausible record so lottery odds make sense.
                const wins = Math.round(Math.random() * 10);
                const losses = 20 - wins;
                const pointsFor = 80 + Math.round(Math.random() * 18);
                const pointsAgainst = pointsFor - Math.round((Math.random() - 0.3) * 8);
                return {
                  teamId: t.id,
                  teamName: t.name,
                  managerName: t.managerName,
                  logoText: t.logoText,
                  logoColor: t.logoColor,
                  wins,
                  losses,
                  pointsFor,
                  pointsAgainst,
                  streak: losses > wins ? 'L' : 'W',
                  streakCount: Math.max(1, Math.min(10, Math.round(Math.random() * 6))),
                };
              });
              try {
                localStorage.setItem('combinedAppLastSeasonStandings_v1', JSON.stringify(generated));
              } catch {
                // ignore
              }
              return generated;
            })()
          }
          maxRounds={franchise.draft.maxRounds}
          onComplete={(firstRoundOrder) => {
            const teamsCount = [franchise.user, franchise.ai, ...franchise.otherTeams].length;
            const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
            const pickOwnerBySourceAndRound = new Map<string, string>();
            for (const team of leagueTeams) {
              for (const pick of team.draftPicks) {
                pickOwnerBySourceAndRound.set(`${pick.fromTeamId}:${pick.round}`, pick.ownerTeamId ?? team.id);
              }
            }

            // Standings-driven follow-up rounds: worst-to-best based on stored standings (or generated seed above).
            let standingsForSort: DraftStandingRow[] = [];
            try {
              const raw = localStorage.getItem('combinedAppLastSeasonStandings_v1');
              if (raw) standingsForSort = JSON.parse(raw) as DraftStandingRow[];
            } catch {
              // ignore
            }

            const weightOf = (teamId: string) => {
              const row = standingsForSort.find((r) => r.teamId === teamId);
              if (!row) return 5;
              // Higher for worse records.
              const pd = row.pointsFor - row.pointsAgainst;
              return row.losses * 2 + (-pd) * 0.5;
            };

            const remainderOrder = leagueTeams
              .slice()
              .sort((a, b) => weightOf(b.id) - weightOf(a.id))
              .map((t) => t.id);

            const fullOrder: string[] = [];
            for (let r = 0; r < franchise.draft.maxRounds; r++) {
              const sourceOrder = r === 0 ? firstRoundOrder : remainderOrder;
              fullOrder.push(
                ...sourceOrder.map((sourceTeamId) => pickOwnerBySourceAndRound.get(`${sourceTeamId}:${r + 1}`) ?? sourceTeamId),
              );
            }

            setFranchise((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                draft: {
                  ...prev.draft,
                  draftOrderTeamIds: fullOrder.slice(0, prev.draft.availableProspects.length),
                  currentPickIndex: 0,
                  round: 1,
                  draftFeed: [],
                  draftedByTeamId: {},
                },
                draftCompleted: false,
              };
            });
            setScreen('draft');
          }}
        />
      )}

      {screen === 'news' && franchise && (
        <NewsScreen
          posts={newsPosts}
          onBack={() => setScreen('roster')}
        />
      )}

      {screen === 'draft' && franchise && (
        <DraftMenu
          franchise={franchise}
          choices={draftChoices}
          aiForNextPick={aiForNextPick}
          onAiForNextPickChange={(value) => setAiForNextPick(value)}
          onPick={(prospectId) => {
            setFranchise((prev) => (prev ? userDraftPick(prev, prospectId) : prev));
          }}
          onGoRoster={() => setScreen('roster')}
        />
      )}

      {screen === 'stats' && franchise && (
        <StatsScreen
          franchise={franchise}
          onBack={() => setScreen('roster')}
        />
      )}

      {screen === 'roster' && franchise && (
        <div>
          <div style={{ maxWidth: 980, margin: '16px auto 0', padding: '0 16px', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={() => {
                setTradeMessage(undefined);
                setTradeCounterOffer(undefined);
                setTradePartnerId(franchise.ai.id);
                setScreen('trade');
              }}
              style={{ padding: '8px 12px' }}
              disabled={franchise.user.roster.length < 2}
            >
              Trades
            </button>
          </div>

          <RosterMenu
            franchise={franchise}
            draftCompleted={draftCompleted}
            onBackToDraft={draftCompleted ? undefined : () => setScreen('draft')}
            onSetActive={(active) => setFranchise((prev) => (prev ? setActivePlayers(prev, 'user', active) : prev))}
            onSetRotationMode={(mode) => setFranchise((prev) => (prev ? setRotationMode(prev, 'user', mode) : prev))}
            onOpenTrade={() => {
              setTradeMessage(undefined);
              setTradeCounterOffer(undefined);
              setTradePartnerId(franchise.ai.id);
              setScreen('trade');
            }}
            onOpenFreeAgency={showFreeAgency}
            freeAgencyAvailable={!!franchise.freeAgencyPending}
            onOfferReSign={(playerId, offer) => {
              const player = franchise.user.roster.find((entry) => entry.id === playerId);
              if (!player) return;
              const result = reSignPlayer(franchise, playerId, offer);
              if (!result.accepted) {
                const counterText = result.counterOffer
                  ? ` Counter ask: $${Math.round(result.counterOffer.salary / 1000)}k for ${result.counterOffer.years} years.`
                  : '';
                setFrontOfficeMessage(`${player.prospect.name} said no. ${result.reason ?? 'Re-signing failed.'}${counterText}`);
                setNewsPosts((prev) => [
                  {
                    id: `re-sign-decline-${Date.now()}`,
                    createdAtMs: Date.now(),
                    type: 'breaking',
                    icon: '📉',
                    badge: 'RE-SIGN',
                    badgeTone: 'bad',
                    text: `${player.prospect.name} rejects an extension from ${franchise.user.name}.${counterText ? ` ${counterText.trim()}` : ''}`,
                  },
                  ...prev,
                ]);
                return;
              }
              setFranchise(result.updated);
              setFrontOfficeMessage(`${player.prospect.name} agreed to ${offer.years} years at $${Math.round(offer.salary / 1000)}k per season.`);
              setNewsPosts((prev) => [
                {
                  id: `re-sign-accept-${Date.now()}`,
                  createdAtMs: Date.now(),
                  type: 'breaking',
                  icon: '✍️',
                  badge: 'RE-SIGN',
                  badgeTone: 'good',
                  text: `${franchise.user.name} re-signs ${player.prospect.name} for ${offer.years} years at $${Math.round(offer.salary / 1000)}k annually.`,
                },
                ...prev,
              ]);
              pushStorylines(result.updated, 2);
            }}
            onStartSeason={openSeasonSchedule}
            progressionNotices={progressionNotices}
            message={frontOfficeMessage}
          />
        </div>
      )}

      {screen === 'freeAgency' && franchise && (
        <FreeAgencyScreen
          franchise={franchise}
          message={frontOfficeMessage}
          onBack={() => setScreen('roster')}
          onOffer={(playerId, offer) => {
            const player = franchise.freeAgents.find((entry) => entry.id === playerId);
            if (!player) return;
            const result = signFreeAgent(franchise, playerId, offer);
            setFranchise(result.updated);
            const counterText = result.counterOffer
              ? ` Counter ask: $${Math.round(result.counterOffer.salary / 1000)}k for ${result.counterOffer.years} years.`
              : '';
            if (result.accepted) {
              setFrontOfficeMessage(`${player.prospect.name} signed for ${offer.years} years at $${Math.round(offer.salary / 1000)}k per season.`);
              setNewsPosts((prev) => [
                {
                  id: `fa-signing-${Date.now()}`,
                  createdAtMs: Date.now(),
                  type: 'breaking',
                  icon: 'FA',
                  badge: 'FA',
                  badgeTone: 'good',
                  text: `${franchise.user.name} signs ${player.prospect.name} for ${offer.years} years at $${Math.round(offer.salary / 1000)}k annually.`,
                },
                ...prev,
              ]);
              pushStorylines(result.updated, 2);
              return;
            }
            if (result.submitted) {
              setFrontOfficeMessage(`${player.prospect.name}: ${result.reason ?? 'Offer submitted.'}${counterText}`);
              setNewsPosts((prev) => [
                {
                  id: `fa-offer-${Date.now()}`,
                  createdAtMs: Date.now(),
                  type: 'reaction',
                  icon: 'FA',
                  badge: 'BID',
                  badgeTone: 'info',
                  text: `${franchise.user.name} submits ${offer.years} years at $${Math.round(offer.salary / 1000)}k to ${player.prospect.name}. Current sign chance: ${result.evaluation.acceptanceOdds}%.`,
                },
                ...prev,
              ]);
              pushStorylines(result.updated, 1);
              return;
            }
            setFrontOfficeMessage(`${player.prospect.name} passed on the offer. ${result.reason ?? 'Signing failed.'}${counterText}`);
            setNewsPosts((prev) => [
              {
                id: `fa-refusal-${Date.now()}`,
                createdAtMs: Date.now(),
                type: 'breaking',
                icon: 'FA',
                badge: 'FA',
                badgeTone: 'bad',
                text: `${player.prospect.name} turns down a bid from ${franchise.user.name}.${counterText ? ` ${counterText.trim()}` : ''}`,
              },
              ...prev,
            ]);
            pushStorylines(result.updated, 1);
            return;
            if (!result.accepted) {
              setFranchise(result.updated);
              const counterText = result.counterOffer
                ? ` Counter ask: $${Math.round(result.counterOffer.salary / 1000)}k for ${result.counterOffer.years} years.`
                : '';
              setFrontOfficeMessage(`${player.prospect.name} refused the offer. ${result.reason ?? 'Signing failed.'}${counterText}`);
              setNewsPosts((prev) => [
                {
                  id: `fa-refusal-${Date.now()}`,
                  createdAtMs: Date.now(),
                  type: 'breaking',
                  icon: '🚪',
                  badge: 'FA',
                  badgeTone: 'bad',
                  text: `${player.prospect.name} rejects an offer from ${franchise.user.name}.${counterText ? ` ${counterText.trim()}` : ''}`,
                },
                ...prev,
              ]);
              return;
            }
            setFranchise(result.updated);
            setFrontOfficeMessage(`${player.prospect.name} signed for ${offer.years} years at $${Math.round(offer.salary / 1000)}k per season.`);
            setNewsPosts((prev) => [
              {
                id: `fa-signing-${Date.now()}`,
                createdAtMs: Date.now(),
                type: 'breaking',
                icon: '🧾',
                badge: 'FA',
                badgeTone: 'accent',
                text: `${franchise.user.name} signs ${player.prospect.name} for ${offer.years} years at $${Math.round(offer.salary / 1000)}k annually.`,
              },
              ...prev,
            ]);
          }}
          onAdvanceDay={() => {
            const advanced = advanceFreeAgencyDay(franchise);
            const totalDays = advanced.updated.freeAgencyState?.totalDays ?? 7;
            const summariesDone = advanced.updated.freeAgencyState?.dailySummaries.length ?? 0;
            if (summariesDone >= totalDays) {
              const completed = completeFreeAgencyPhase(advanced.updated);
              const newSummaries = completed.freeAgencyState?.dailySummaries.slice(-1) ?? [advanced.summary];
              finishFreeAgencyWithRecap(completed, newSummaries, 'Free agency wrapped. Review the market recap, then move on to the lottery.');
              return;
            }
            setFranchise(advanced.updated);
            setFrontOfficeMessage(advanced.summary.feed[0] ?? `Free agency Day ${advanced.summary.day} is in the books.`);
            setNewsPosts((prev) => [...buildFreeAgencyNewsPosts([advanced.summary]), ...prev].slice(0, 250));
            pushStorylines(advanced.updated, 2);
          }}
          onContinue={() => {
            const existingSummaryCount = franchise.freeAgencyState?.dailySummaries.length ?? 0;
            const completed = completeFreeAgencyPhase(franchise);
            const newSummaries = completed.freeAgencyState?.dailySummaries.slice(existingSummaryCount) ?? [];
            finishFreeAgencyWithRecap(completed, newSummaries, 'Free agency is complete. Review the recap, then continue to lottery night.');
          }}
        />
      )}

      {screen === 'seasonSchedule' && franchise && (
        <SeasonScheduleScreen
          franchise={franchise}
          onGoRoster={() => setScreen('roster')}
          onPlay={(game) => {
            setScheduledPlayGame({
              source: 'season',
              id: game.id,
              homeTeamId: game.homeTeamId,
              awayTeamId: game.awayTeamId,
            });
            setScreen('game');
          }}
          onSimulate={(game) => {
            const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
            const home = leagueTeams.find((t) => t.id === game.homeTeamId);
            const away = leagueTeams.find((t) => t.id === game.awayTeamId);
            const simulated = simulateScheduledSeasonGame(franchise, game);
            if (!simulated.result || !home || !away) return;
            setBoxScore({
              title: 'Box Score',
              homeTeamName: home.name,
              awayTeamName: away.name,
              score: { home: simulated.result.finalScore.user, away: simulated.result.finalScore.ai },
              homeLines: simulated.result.boxScore.homeLines,
              awayLines: simulated.result.boxScore.awayLines,
            });
            setFranchise(simulated.updated);
            setProgressionNotices(simulated.progressionNotices);
            pushStorylines(simulated.updated, 2);
          }}
          onSimulateWeek={() => {
            const season = franchise.season;
            if (!season) return;
            const remainingWeekGames = season.games.filter((g) => g.weekIndex === season.weekIndex && !g.result?.played);
            if (!remainingWeekGames.length) return;

            let working = franchise;
            const combinedNotices: string[] = [];
            for (const game of remainingWeekGames) {
              const simulated = simulateScheduledSeasonGame(working, game);
              working = simulated.updated;
              combinedNotices.push(...simulated.progressionNotices);
            }

            setFranchise(working);
            setProgressionNotices(combinedNotices);
            setFrontOfficeMessage(`Simulated all ${remainingWeekGames.length} remaining game${remainingWeekGames.length === 1 ? '' : 's'} for Week ${season.weekIndex + 1}. You can still use Advance Week when you're ready.`);
            pushStorylines(working, 2);
          }}
          onAdvanceWeek={() => {
            const season = franchise.season;
            if (!season) return;
            const weekGames = season.games.filter((g) => g.weekIndex === season.weekIndex);
            const allPlayed = weekGames.every((g) => g.result?.played);
            if (!allPlayed) return;
            const nextWeekIndex = season.weekIndex + 1;
            const regularSeasonComplete = nextWeekIndex >= season.weeksTotal;

            const tradePulse = !regularSeasonComplete
              ? simulateAiLeagueTradeActivity(franchise, {
                  maxTrades: 1,
                  tradeChance: 0.78,
                })
              : { updated: franchise, newsPosts: [], summary: undefined };

            if (tradePulse.newsPosts.length) {
              setNewsPosts((prev) => [...tradePulse.newsPosts, ...prev].slice(0, 250));
              setFrontOfficeMessage(tradePulse.summary ?? tradePulse.newsPosts[0]?.text);
              pushStorylines(tradePulse.updated, 2);
            } else {
              setFrontOfficeMessage(undefined);
            }

            const baseFranchise = tradePulse.updated;
            const currentSeason = baseFranchise.season;
            if (!currentSeason) return;

            if (!regularSeasonComplete) {
              setFranchise({
                ...baseFranchise,
                season: {
                  ...currentSeason,
                  weekIndex: nextWeekIndex,
                },
              });
              return;
            }

            const teams = [baseFranchise.user, baseFranchise.ai, ...baseFranchise.otherTeams];
            const playoffs = createPlayoffsState(teams, baseFranchise.seasonStandings);
            setFranchise({
              ...baseFranchise,
              season: {
                ...currentSeason,
                phase: 'playoffs',
                playoffs,
              },
            });
            if (regularSeasonComplete) {
              setScreen('playoffs');
            }
          }}
        />
      )}

      {screen === 'playoffs' && franchise && (
        <PlayoffsScreen
          franchise={franchise}
          onBack={() => setScreen('seasonSchedule')}
          onPlay={(game) => {
            setScheduledPlayGame({
              source: 'playoffs',
              id: game.id,
              homeTeamId: game.homeTeamId,
              awayTeamId: game.awayTeamId,
            });
            setScreen('game');
          }}
          onSimulate={(game) => {
            const season = franchise.season;
            const playoffs = season?.playoffs;
            if (!season || !playoffs) return;

            const leagueTeams = [franchise.user, franchise.ai, ...franchise.otherTeams];
            const home = leagueTeams.find((t) => t.id === game.homeTeamId);
            const away = leagueTeams.find((t) => t.id === game.awayTeamId);
            if (!home || !away) return;

            const res = simulateMatch(home, away, { pace: getSimPaceFromSettings(settings), userTeamId: franchise.user.id });
            setBoxScore({
              title: 'Playoff Box Score',
              homeTeamName: home.name,
              awayTeamName: away.name,
              score: { home: res.finalScore.user, away: res.finalScore.ai },
              homeLines: res.boxScore.homeLines,
              awayLines: res.boxScore.awayLines,
            });
            const applied = applyLeagueMatchResults(franchise, {
              homeTeamId: game.homeTeamId,
              awayTeamId: game.awayTeamId,
              inGameStatsByEntityId: res.playerStatsByEntityId,
              finalScore: { home: res.finalScore.user, away: res.finalScore.ai },
            });

            const nextSeason = applied.updated.season;
            if (!nextSeason?.playoffs) {
              setFranchise(applied.updated);
              setProgressionNotices(applied.progressionNotices);
              pushStorylines(applied.updated, 2);
              return;
            }

            const homeScore = res.finalScore.user;
            const awayScore = res.finalScore.ai;
            const winnerTeamId =
              homeScore === awayScore ? null : homeScore > awayScore ? game.homeTeamId : game.awayTeamId;

            const nextPoGames = nextSeason.playoffs.games.map((playoffGame) => {
              if (playoffGame.id !== game.id) return playoffGame;
              return {
                ...playoffGame,
                result: {
                  played: true,
                  score: { home: homeScore, away: awayScore },
                  winnerTeamId,
                },
              };
            });

            const playoffsAdvanced = tryAdvancePlayoffs({ ...nextSeason.playoffs, games: nextPoGames });
            const dated = advanceDate(applied.updated, 1);
            const nextFranchise = {
              ...dated,
              season: {
                ...(dated.season ?? nextSeason),
                playoffs: playoffsAdvanced,
                phase: playoffsAdvanced.championTeamId ? 'complete' : nextSeason.phase,
              },
            };
            if (playoffsAdvanced.championTeamId) {
              queueChampionshipCelebration(nextFranchise);
              return;
            }
            setFranchise(nextFranchise);
            setProgressionNotices(applied.progressionNotices);
            pushStorylines(nextFranchise, 2);
          }}
        />
      )}

      {confirmRestartOpen && (
        <Modal
          title="Restart game?"
          tone="danger"
          onClose={() => setConfirmRestartOpen(false)}
        >
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Are you sure you want to restart the game? <b style={{ color: 'var(--text)' }}>All progress will be lost.</b>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btnSoft" onClick={() => setConfirmRestartOpen(false)} style={{ padding: '10px 14px' }}>
              No
            </button>
            <button
              className="btn"
              onClick={() => {
                setConfirmRestartOpen(false);
                // Reset runtime state
                setFranchise(null);
                setNewsPosts([]);
                setProgressionNotices([]);
                setTradeMessage(undefined);
                setAiForNextPick(false);
                setSimResult(null);
                setChampionshipCelebration(null);
                setScheduledPlayGame(null);
                setBoxScore(null);
                // Reset persisted season context (lottery odds)
                try {
                  localStorage.removeItem('combinedAppLastSeasonStandings_v1');
                  localStorage.removeItem('combinedAppAiForNextPick_v1');
                } catch {
                  // ignore
                }
                try {
                  clearFranchise();
                  setHasSave(false);
                } catch {
                  // ignore
                }
                setScreen('start');
              }}
              style={{
                padding: '10px 14px',
                borderColor: 'rgba(220,38,38,0.22)',
                background: 'rgba(220,38,38,0.10)',
                color: 'rgba(220,38,38,0.95)',
                fontWeight: 900,
              }}
              title="Confirm restart"
            >
              Yes, restart
            </button>
          </div>
        </Modal>
      )}

      {confirmSimOpen && franchise && (
        <Modal title="Simulate this game?" onClose={() => setConfirmSimOpen(false)}>
          <div className="muted" style={{ lineHeight: 1.45 }}>
            Do you want to simulate this game? Player stats and results will be calculated automatically.
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button className="btn btnSoft" onClick={() => setConfirmSimOpen(false)} style={{ padding: '10px 14px' }}>
              Cancel
            </button>
            <button
              className="btn btnPrimary"
              style={{ padding: '10px 14px', fontWeight: 900 }}
              onClick={() => {
                setConfirmSimOpen(false);
                const res = simulateMatch(franchise.user, franchise.ai, { pace: getSimPaceFromSettings(settings), userTeamId: franchise.user.id });
                const applied = applyMatchResults(franchise, {
                  inGameStatsByEntityId: res.playerStatsByEntityId,
                  didUserWin: res.winner === 'user',
                  finalScore: res.finalScore,
                });
                const withDate = advanceDate(applied.updated, 1);
                setFranchise(withDate);
                setProgressionNotices(applied.progressionNotices);
                pushStorylines(withDate, 2);

                // Top performers by points
                const nameById: Record<string, string> = {};
                for (const t of [franchise.user, franchise.ai]) {
                  for (const p of t.roster) nameById[p.id] = p.prospect.name;
                }
                const top = Object.entries(res.playerStatsByEntityId)
                  .map(([id, s]) => ({ name: nameById[id] ?? id, pts: s.points ?? 0 }))
                  .sort((a, b) => b.pts - a.pts)
                  .slice(0, 4);
                setSimResult({ score: res.finalScore, top });
              }}
            >
              Simulate
            </button>
          </div>
        </Modal>
      )}

      {simResult && (
        <Modal title="Simulation result" onClose={() => setSimResult(null)}>
          <div className="card" style={{ background: 'rgba(255,255,255,0.78)' }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>
              Final: You {simResult.score.user} - {simResult.score.ai} Rival
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              Top performers
            </div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {simResult.top.map((p) => (
                <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontWeight: 900 }}>{p.name}</span>
                  <span className="muted" style={{ fontWeight: 900 }}>
                    {p.pts} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btnPrimary" style={{ padding: '10px 14px', fontWeight: 900 }} onClick={() => setSimResult(null)}>
              OK
            </button>
          </div>
        </Modal>
      )}

      {championshipCelebration && (
        <Modal
          title="Championship Celebration"
          onClose={() => {
            const next = championshipCelebration.nextFranchise;
            setChampionshipCelebration(null);
            rollIntoNextSeason(next);
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(37,99,235,0.12))',
              border: '1px solid rgba(245,158,11,0.24)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.6, color: 'var(--primary2)', textTransform: 'uppercase' }}>
              Finals Winner
            </div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 1000 }}>
              {championshipCelebration.teamName}
            </div>
            <div className="muted" style={{ marginTop: 10, lineHeight: 1.55 }}>
              {championshipCelebration.message}
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btnPrimary"
              style={{ padding: '10px 14px', fontWeight: 900 }}
              onClick={() => {
                const next = championshipCelebration.nextFranchise;
                setChampionshipCelebration(null);
                rollIntoNextSeason(next);
              }}
            >
              Continue to Free Agency
            </button>
          </div>
        </Modal>
      )}

      {boxScore && (
        <BoxScoreModal
          title={boxScore.title}
          homeTeamName={boxScore.homeTeamName}
          awayTeamName={boxScore.awayTeamName}
          score={boxScore.score}
          homeLines={boxScore.homeLines}
          awayLines={boxScore.awayLines}
          onClose={() => setBoxScore(null)}
        />
      )}

      {screen === 'trade' && franchise && (
        <TradeMenu
          franchise={franchise}
          selectedTeamId={tradePartnerId}
          onSelectTeam={(teamId) => setTradePartnerId(teamId)}
          counterOffer={tradeCounterOffer}
          onAccept={({ fromPlayerIds, toPlayerIds, fromPickIds, toPickIds, toTeamId }) => {
            if (!toTeamId) {
              setTradeMessage('Choose a trade partner first.');
              return;
            }
            const result = requestTrade(franchise, {
              fromTeamId: franchise.user.id,
              toTeamId,
              fromPlayerIds,
              toPlayerIds,
              fromPickIds,
              toPickIds,
              acceptMode: 'auto',
            });
            setTradeCounterOffer(result.counterOffer);
            setTradeMessage(result.accepted ? 'Trade accepted!' : result.counterOffer?.message ?? `Trade declined: ${result.reason ?? 'No reason provided.'}`);
            if (result.accepted) {
              setFranchise(result.updated);
              setTradeCounterOffer(undefined);
              pushStorylines(result.updated, 2);
            }
            if (result.newsPost) {
              setNewsPosts((prev) => [result.newsPost!, ...prev]);
            }
          }}
          resultMessage={tradeMessage}
          onBack={() => {
            setTradePartnerId(null);
            setTradeCounterOffer(undefined);
            setScreen('roster');
          }}
        />
      )}

      {screen === 'game' && franchise && (
        <GameScreen
          user={scheduledGameView?.controlledTeam ?? franchise.user}
          ai={scheduledGameView?.opponentTeam ?? franchise.ai}
          settings={settings}
          userLabel={scheduledGameView?.controlledTeam.name ?? franchise.user.name}
          aiLabel={scheduledGameView?.opponentTeam.name ?? franchise.ai.name}
          matchLabel={scheduledGameView?.matchLabel ?? `${franchise.user.name} vs ${franchise.ai.name}`}
          matchMetaLabel={scheduledGameView?.matchMetaLabel ?? 'Arcade Exhibition'}
          onAbandon={() => {
            if (!scheduledPlayGame) {
              setScreen('roster');
              return;
            }
            const source = scheduledPlayGame.source;
            setScheduledPlayGame(null);
            setFrontOfficeMessage('Live match exited. That matchup was left unplayed.');
            setScreen(source === 'playoffs' ? 'playoffs' : 'seasonSchedule');
          }}
          onExit={(result) => {
            if (!scheduledPlayGame) {
              const applied = applyMatchResults(franchise, {
                inGameStatsByEntityId: result.playerStatsByEntityId,
                didUserWin: result.winner === 'user',
                finalScore: result.finalScore,
              });
              const nextFranchise = advanceDate(applied.updated, 1);
              setFranchise(nextFranchise);
              setProgressionNotices(applied.progressionNotices);
              pushStorylines(nextFranchise, 2);
              setScreen('roster');
              return;
            }

            const game = scheduledPlayGame;
            setScheduledPlayGame(null);
            const controlledTeamIsHome = franchise.user.id === game.homeTeamId;
            const homeScore = controlledTeamIsHome ? result.finalScore.user : result.finalScore.ai;
            const awayScore = controlledTeamIsHome ? result.finalScore.ai : result.finalScore.user;
            const applied = applyLeagueMatchResults(franchise, {
              homeTeamId: game.homeTeamId,
              awayTeamId: game.awayTeamId,
              inGameStatsByEntityId: result.playerStatsByEntityId,
              finalScore: { home: homeScore, away: awayScore },
            });
            const nextSeason = applied.updated.season;
            if (!nextSeason) {
              const nextFranchise = advanceDate(applied.updated, 1);
              setFranchise(nextFranchise);
              setProgressionNotices(applied.progressionNotices);
              pushStorylines(nextFranchise, 2);
              setScreen(game.source === 'playoffs' ? 'playoffs' : 'seasonSchedule');
              return;
            }

            const winnerTeamId =
              homeScore === awayScore ? null : homeScore > awayScore ? game.homeTeamId : game.awayTeamId;
            const dated = advanceDate(applied.updated, 1);

            if (game.source === 'playoffs') {
              const nextPlayoffs = nextSeason.playoffs;
              if (!nextPlayoffs) {
                setFranchise(dated);
                setProgressionNotices(applied.progressionNotices);
                pushStorylines(dated, 2);
                setScreen('playoffs');
                return;
              }

              const nextPoGames = nextPlayoffs.games.map((playoffGame) => {
                if (playoffGame.id !== game.id) return playoffGame;
                return {
                  ...playoffGame,
                  result: {
                    played: true,
                    score: { home: homeScore, away: awayScore },
                    winnerTeamId,
                  },
                };
              });
              const playoffsAdvanced = tryAdvancePlayoffs({ ...nextPlayoffs, games: nextPoGames });
              const nextFranchise = {
                ...dated,
                season: {
                  ...(dated.season ?? nextSeason),
                  playoffs: playoffsAdvanced,
                  phase: playoffsAdvanced.championTeamId ? 'complete' : nextSeason.phase,
                },
              };
              if (playoffsAdvanced.championTeamId) {
                queueChampionshipCelebration(nextFranchise);
                return;
              }
              setFranchise(nextFranchise);
              setProgressionNotices(applied.progressionNotices);
              pushStorylines(nextFranchise, 2);
              setScreen('playoffs');
              return;
            }

            const nextGames = nextSeason.games.map((scheduledGame) => {
              if (scheduledGame.id !== game.id) return scheduledGame;
              return {
                ...scheduledGame,
                result: {
                  played: true,
                  score: { home: homeScore, away: awayScore },
                  winnerTeamId,
                },
              };
            });
            const nextFranchise = {
              ...dated,
              season: { ...(dated.season ?? nextSeason), games: nextGames },
            };
            setFranchise(nextFranchise);
            setProgressionNotices(applied.progressionNotices);
            pushStorylines(nextFranchise, 2);
            setScreen('seasonSchedule');
          }}
        />
      )}

      {screen === 'season' && franchise && (
        <SeasonSimScreen
          franchise={franchise}
          onBackToNews={() => setScreen('news')}
          onFinish={(nextFranchise, seasonPosts) => {
            setFranchise(nextFranchise);
            setNewsPosts((prev) => {
              const base = prev.length ? prev : [];
              return [...buildDynamicStorylinePosts(nextFranchise, { limit: 3 }), ...base, ...seasonPosts].slice(-250);
            });
            setFrontOfficeMessage(nextFranchise.freeAgencyPending ? 'Free agency has opened before the next draft.' : undefined);
            setScreen(nextFranchise.freeAgencyPending ? 'freeAgency' : 'lottery');
          }}
        />
      )}

      {screen === 'updateLog' && (
        <UpdateLogPage
          returnTo={returnTo}
          updateLevel={updateLevel}
          entries={entries}
          onBack={() => setScreen(returnTo)}
          onAdd={({ description, major, delta }) => {
            const nextEntry: UpdateLogEntry = {
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              createdAt: Date.now(),
              description,
              major,
              delta,
            };
            setEntries((prev) => [...prev, nextEntry]);
            setUpdateLevel((lvl) => Math.round((lvl + delta) * 10) / 10);
          }}
        />
      )}

      {screen !== 'updateLog' && (
        <UpdateLogWidget
          updateLevel={updateLevel}
          lastEntry={entries.length ? entries[entries.length - 1] : undefined}
          onClick={() => {
            setReturnTo(screen);
            setScreen('updateLog');
          }}
        />
      )}

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {freeAgencyRecapFranchise && (
        <FreeAgencyRecapModal
          franchise={freeAgencyRecapFranchise}
          onClose={() => {
            setFreeAgencyRecapFranchise(null);
            setScreen('lottery');
          }}
        />
      )}
    </div>
  );
}
