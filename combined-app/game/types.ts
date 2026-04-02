export type Rating10 = number; // expected range: 1..10

export type ProspectCategories = {
  shooting: Rating10;
  speed: Rating10;
  playmaking: Rating10;
  defense: Rating10;
};

export type CompetitionLevel =
  | 'High School'
  | 'Prep / EYBL'
  | 'NCAA Low-Major'
  | 'NCAA Mid-Major'
  | 'NCAA High-Major'
  | 'International Pro'
  | 'International Youth'
  | 'G League / OTE';

export type ProspectPosition =
  | 'Point Guard'
  | 'Shooting Guard'
  | 'Small Forward'
  | 'Power Forward'
  | 'Center'
  | string;

export type Prospect = {
  id: string;
  name: string;
  college: string;
  competitionLevel: CompetitionLevel;
  position: ProspectPosition;
  age: number;
  rank: number;
  athleticism: number; // raw 1..10 from source
  height: number;
  wingspan: number;
  weight: number;
  categories: ProspectCategories;
  // Growth potential stays on the scouting 1..10 scale.
  potential: Rating10;
  overall: number; // player overall on a 42..98 style 100-point scale
  tags: string[];
  scoutingNotes?: string;
};

export type Contract = {
  seasonsLeft: number;
  salary: number;
};

export type FreeAgencyRole = 'starter' | 'rotation' | 'bench';
export type PlayerMoodStatus = 'happy' | 'neutral' | 'unhappy';
export type LockerRoomStatus = 'elite' | 'steady' | 'tense' | 'volatile';

export type PlayerPersonality = {
  ego: Rating10;
  loyalty: Rating10;
  workEthic: Rating10;
  clutchFactor: Rating10;
  temperament: Rating10;
};

export type FreeAgencyOffer = {
  teamId: string;
  teamName: string;
  salary: number;
  years: number;
  happiness: number;
  role: FreeAgencyRole;
  day: number;
  acceptanceOdds?: number;
  fromOriginalTeam?: boolean;
};

export type FreeAgencyDaySummary = {
  day: number;
  signings: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    salary: number;
    years: number;
    role: FreeAgencyRole;
  }>;
  newOffers: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
    salary: number;
    years: number;
    role: FreeAgencyRole;
    acceptanceOdds: number;
  }>;
  biggestContracts: Array<{
    playerName: string;
    teamName: string;
    salary: number;
    years: number;
  }>;
  feed: string[];
};

export type FreeAgencyState = {
  currentDay: number;
  totalDays: number;
  dailySummaries: FreeAgencyDaySummary[];
};

export type TeamPlayer = {
  id: string; // stable unique per team
  prospect: Prospect;
  contract: Contract;
  acquiredRound: number;
  yearsWithTeam: number;
  personality: PlayerPersonality;
  loyalty: Rating10;
  happiness: Rating10;
  desireToLeave: Rating10;
  morale: number; // 0..100
  status: PlayerMoodStatus;
  recentTradeAdjustment: number; // -20..20 short-term mood swing from recent moves
  recentTradeReaction?: string;
  stamina: number; // 0..100 current freshness / game energy
  formerTeamId?: string;
  formerTeamName?: string;
  marketOffers?: FreeAgencyOffer[];
  seasonStats: PlayerSeasonStats;
  playoffStats: PlayerSeasonStats;
};

export type PlayerSeasonStats = {
  matchesPlayed: number;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
};

export type PlayerInGameStats = Omit<PlayerSeasonStats, 'matchesPlayed'>;

export type DraftPickAsset = {
  id: string;
  fromTeamId: string; // original/source team that determines draft slot
  ownerTeamId: string; // team currently controlling the pick
  round: number;
  pickPosition: number; // projected overall pick number in the draft
  value: number; // derived from round/pick
};

export type TeamState = {
  id: string;
  name: string;
  managerName: string;
  // UI-only placeholders for logos/branding.
  logoText: string;
  logoColor: string;
  roster: TeamPlayer[];
  draftPicks: DraftPickAsset[]; // tradable draft assets
  salaryCap: number;
  cash: number;
  activePlayerIds: [string, string]; // 2v2: [ballHandlerId, offBallId]
  rotationMode: 'tight' | 'balanced' | 'deep';
  contractSeason: number;
  teamRating: Rating10;
  chemistry: number; // 0..100
  lockerRoomStatus: LockerRoomStatus;
};

export type DraftPickEvent = {
  id: string;
  pickNumber: number;
  teamId: string;
  teamName: string;
  managerName: string;
  teamLogoText: string;
  teamLogoColor: string;

  prospectId: string;
  prospectName: string;
  position: ProspectPosition;
  overall: number;
  potential: Rating10;
  categories: ProspectCategories;

  surpriseLabel: string;
  pressRelease: string;
  createdAtMs: number;
};

export type DraftStandingRow = {
  teamId: string;
  teamName: string;
  managerName: string;
  logoText: string;
  logoColor: string;

  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: 'W' | 'L' | '—';
  streakCount: number;
};

export type PowerRankingRow = {
  teamId: string;
  teamName: string;
  managerName: string;
  logoText: string;
  logoColor: string;
  rank: number;
  score: number;
};

export type LeagueNewsPost = {
  id: string;
  createdAtMs: number;
  type: 'highlight' | 'reaction' | 'breaking' | 'draft' | 'award' | 'trade' | 'storyline';
  icon?: string;
  badge?: string;
  badgeTone?: 'primary' | 'accent' | 'info' | 'good' | 'bad';
  text: string;
};

export type DraftState = {
  round: number;
  maxRounds: number;
  availableProspects: Prospect[];

  // Teams pick in this order; length = total picks in the season.
  draftOrderTeamIds: string[];
  currentPickIndex: number; // 0-based

  // Pick feed (TV-style broadcast log).
  draftFeed: DraftPickEvent[];

  // Team rosters are updated as they pick.
  draftedByTeamId: Record<string, string[]>; // teamId -> drafted prospectIds
};

export type SeasonPhase = 'regular' | 'playoffs' | 'complete';

export type SeasonGameResult = {
  played: boolean;
  score: { home: number; away: number };
  winnerTeamId: string | null;
};

export type SeasonGame = {
  id: string;
  weekIndex: number; // 0-based
  homeTeamId: string;
  awayTeamId: string;
  result?: SeasonGameResult;
};

export type SeasonState = {
  seasonId: string;
  phase: SeasonPhase;
  weeksTotal: number;
  weekIndex: number;
  games: SeasonGame[];

  playoffs?: PlayoffsState;
};

export type PlayoffRound = 'semi' | 'final';

export type PlayoffGame = {
  id: string;
  round: PlayoffRound;
  homeTeamId: string;
  awayTeamId: string;
  result?: SeasonGameResult;
};

export type PlayoffsState = {
  qualifiedTeamIds: string[]; // seeded order (best -> worst)
  games: PlayoffGame[];
  championTeamId?: string;
};

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

export type TradeLogEntry = {
  id: string;
  createdAtMs: number;
  fromTeamId: string;
  toTeamId: string;
  outgoingPlayerIds: string[];
  incomingPlayerIds: string[];
  outgoingPickIds: string[];
  incomingPickIds: string[];
  ratingDelta: number;
  description: string;
};

export type FranchiseState = {
  user: TeamState;
  ai: TeamState;
  otherTeams: TeamState[];
  freeAgents: TeamPlayer[];
  freeAgencyPending: boolean;
  freeAgencyState: FreeAgencyState | null;
  draft: DraftState;
  draftCompleted: boolean;

  // Season meta (standings + power rankings).
  seasonIndex: number;
  seasonStandings: DraftStandingRow[];
  powerRankings: PowerRankingRow[];

  season: SeasonState | null;

  currentDate: CalendarDate; // live calendar tracking
  tradeHistory: TradeLogEntry[];
};
