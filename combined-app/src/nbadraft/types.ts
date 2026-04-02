export interface PlayerStats {
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  turnovers: number;
  // Advanced stats for better accuracy
  trueShootingPercentage?: number; // TS%
  usageRate?: number; // Percentage of possessions
  assistToTurnoverRatio?: number;
  defensiveReboundPercentage?: number;
  offensiveReboundPercentage?: number;
  playerEfficiencyRating?: number; // PER
  gamesPlayed?: number;
}

export interface PhysicalAttributes {
  height: number; // in inches
  wingspan: number; // in inches
  weight: number; // in pounds
  athleticism: number; // 1-10 scouting grade
  position: string;
}

export interface ScoutingGrades {
  shotCreation: number | null;
  shotDifficulty: number | null;
  finishingToughness: number | null;
  handle: number | null;
  decisionMaking: number | null;
  defensiveDiscipline: number | null;
  motor: number | null;
  physicality: number | null;
  competitionRating: number | null;
}

export interface TraditionalScoutRatings {
  athleticism: number | null;
  size: number | null;
  defense: number | null;
  strength: number | null;
  quickness: number | null;
  leadership: number | null;
  jumpShot: number | null;
  nbaReady: number | null;
  ballHandling: number | null;
  potential: number | null;
  passing: number | null;
  intangibles: number | null;
}

export const COMPETITION_LEVELS = [
  'High School',
  'Prep / EYBL',
  'NCAA Low-Major',
  'NCAA Mid-Major',
  'NCAA High-Major',
  'International Pro',
  'International Youth',
  'G League / OTE',
] as const;

export type CompetitionLevel = typeof COMPETITION_LEVELS[number];

export interface Player {
  id: string;
  name: string;
  college: string;
  age: number;
  competitionLevel: CompetitionLevel;
  season: number;
  stats: PlayerStats;
  attributes: PhysicalAttributes;
  scoutingGrades: ScoutingGrades;
  traditionalRatings: TraditionalScoutRatings;
  strengths: string;
  weaknesses: string;
  scoutingNotes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NBAPotential {
  overallRating: number;
  draftRange: 'lottery' | 'first-round' | 'second-round' | 'undrafted';
  archetype: string;
  bestFitPositions: string[];
  strengths: string;
  weaknesses: string;
  readinessScore: number;
  confidenceScore: number;
  dataCompleteness: number;
  draftProjection: {
    projectedPick: number;
    pickRange: [number, number];
  };
  outcomeBand: {
    floor: string;
    median: string;
    ceiling: string;
    variance: 'low' | 'medium' | 'high';
    boomBustScore: number;
  };
  skillRatings: {
    shooting: number;
    defense: number;
    athleticism: number;
    passing: number;
    ballHandling: number;
    rebounding: number;
  };
  projectedStats: {
    points: number;
    rebounds: number;
    assists: number;
  };
  careerTrajectory: CareerYear[];
  similarPlayers: SimilarPlayer[];
}

export interface CareerYear {
  year: number;
  rating: number;
  points: number;
  rebounds: number;
  assists: number;
  efficiency: number;
}

export interface SimilarPlayer {
  name: string;
  era: string;
  similarity: number;
  actualPeakRating: number;
  reason: string;
}

export interface SimulationHighlight {
  label: string;
  value: string;
  detail: string;
  tone: 'blue' | 'green' | 'gold' | 'purple';
  icon: 'draft' | 'peak' | 'ring' | 'star' | 'comp';
}

export interface SimulationMilestone {
  id: string;
  season: number;
  age: number;
  title: string;
  summary: string;
  phase: 'draft' | 'rookie' | 'rise' | 'peak' | 'title' | 'veteran' | 'legacy';
  rating: number;
  statLine: {
    points: number;
    rebounds: number;
    assists: number;
    efficiency: number;
  };
  accolades: string[];
  ringsEarned: number;
}

export interface SimulationFranchise {
  city: string;
  team: string;
  abbreviation: string;
  accentFrom: string;
  accentTo: string;
  spotlight: string;
}

export interface SimulationAccolades {
  draftPick: number;
  championships: number;
  allStarSelections: number;
  allNBASelections: number;
  majorAwards: string[];
  peakSeason: number;
  retirementSeason: number;
}

export interface SimulationResult {
  id: string;
  playerId: string;
  scenarioType: 'draft-pick' | 'trade' | 'lineup';
  description: string;
  projectedOutcome: {
    careerPoints: number;
    careerEfficiency: number;
    peakRating: number;
    allStarSelections: number;
    championships: number;
    allNBASelections: number;
    draftPick: number;
  };
  archetype: string;
  narrative: string;
  highlights: SimulationHighlight[];
  milestones: SimulationMilestone[];
  franchise: SimulationFranchise;
  accolades: SimulationAccolades;
  timestamp: string;
}
