import type { Player, PlayerStats } from '../nbadraft/types';

type DraftClassPlayerSeed = Omit<Player, 'id' | 'createdAt' | 'updatedAt'>;
type DraftClassInputStats =
  Pick<PlayerStats, 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks'> &
  Partial<Omit<PlayerStats, 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks'>>;

type DraftClassPlayerConfig = {
  rank: number;
  name: string;
  college: string;
  age: number;
  competitionLevel: Player['competitionLevel'];
  position: Player['attributes']['position'];
  height: number;
  wingspan: number;
  weight: number;
  athleticism: number;
  stats: DraftClassInputStats;
  scoutingNotes: string;
};

type NormalizedDraftClassPlayerConfig = Omit<DraftClassPlayerConfig, 'stats'> & {
  stats: DraftClassPlayerSeed['stats'];
};

type DraftClassRatingsOverride = {
  scoutingGrades?: Partial<DraftClassPlayerSeed['scoutingGrades']>;
  traditionalRatings?: Partial<DraftClassPlayerSeed['traditionalRatings']>;
};

const EMPTY_SCOUTING_GRADES: DraftClassPlayerSeed['scoutingGrades'] = {
  shotCreation: null,
  shotDifficulty: null,
  finishingToughness: null,
  handle: null,
  decisionMaking: null,
  defensiveDiscipline: null,
  motor: null,
  physicality: null,
  competitionRating: null,
};

const EMPTY_TRADITIONAL_RATINGS: DraftClassPlayerSeed['traditionalRatings'] = {
  athleticism: null,
  size: null,
  defense: null,
  strength: null,
  quickness: null,
  leadership: null,
  jumpShot: null,
  nbaReady: null,
  ballHandling: null,
  potential: null,
  passing: null,
  intangibles: null,
};

function clampRating(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function clampStat(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function countPhraseHits(text: string, patterns: string[]): number {
  return patterns.reduce((count, pattern) => count + (text.includes(pattern) ? 1 : 0), 0);
}

function inferKeywordGrade(
  text: string,
  options: {
    strong: string[];
    positive?: string[];
    negative?: string[];
    base?: number;
  }
): number | null {
  const strongHits = countPhraseHits(text, options.strong);
  const positiveHits = countPhraseHits(text, options.positive ?? []);
  const negativeHits = countPhraseHits(text, options.negative ?? []);

  if (strongHits === 0 && positiveHits === 0 && negativeHits === 0) return null;

  const baseScore = options.base ?? 6;
  return clampRating(baseScore + strongHits * 1.1 + positiveHits * 0.65 - negativeHits * 1.05);
}

function getCompetitionLevelSuggestion(level: Player['competitionLevel']): number {
  switch (level) {
    case 'International Pro':
      return 9;
    case 'G League / OTE':
      return 8;
    case 'NCAA High-Major':
      return 8;
    case 'NCAA Mid-Major':
      return 6;
    case 'International Youth':
      return 6;
    case 'Prep / EYBL':
      return 5;
    case 'NCAA Low-Major':
      return 5;
    case 'High School':
    default:
      return 4;
  }
}

function blendGrade(noteDriven: number | null, heuristic: number): number {
  if (noteDriven === null) return clampRating(heuristic);
  return clampRating(noteDriven * 0.55 + heuristic * 0.45);
}

function getPotentialFloorByRank(rank: number): number {
  if (rank <= 3) return 10;
  if (rank <= 10) return 9;
  if (rank <= 20) return 8;
  if (rank <= 40) return 7;
  return 6;
}

function getReadinessFloor(config: NormalizedDraftClassPlayerConfig): number {
  if (config.rank <= 10) return config.age <= 20.5 ? 7 : 8;
  if (config.rank <= 20) return config.age <= 20.5 ? 6 : 7;
  if (config.rank <= 40) return config.age >= 22 ? 8 : 6;
  return config.age >= 22 ? 8 : 5;
}

function mergeRatings<T extends object>(
  generated: T,
  overrides?: Partial<T>
): T {
  return overrides ? ({ ...generated, ...overrides } as T) : generated;
}

const MANUAL_DRAFT_CLASS_RATING_OVERRIDES: Record<string, DraftClassRatingsOverride> = {
  'Cameron Boozer': {
    scoutingGrades: {
      shotDifficulty: 7,
      handle: 6,
      decisionMaking: 8,
      motor: 8,
      physicality: 9,
    },
    traditionalRatings: {
      leadership: 9,
      jumpShot: 8,
      nbaReady: 8,
      ballHandling: 6,
      potential: 10,
      passing: 8,
    },
  },
  'Darryn Peterson': {
    scoutingGrades: {
      handle: 8,
      decisionMaking: 7,
      physicality: 7,
    },
    traditionalRatings: {
      strength: 8,
      jumpShot: 8,
      nbaReady: 8,
      ballHandling: 8,
      passing: 7,
    },
  },
  'AJ Dybantsa': {
    scoutingGrades: {
      finishingToughness: 8,
      handle: 8,
      motor: 9,
      physicality: 7,
    },
    traditionalRatings: {
      athleticism: 9,
      strength: 8,
      leadership: 9,
      jumpShot: 8,
      nbaReady: 8,
      ballHandling: 8,
      passing: 8,
    },
  },
  'Caleb Wilson': {
    scoutingGrades: {
      shotDifficulty: 6,
      finishingToughness: 8,
      handle: 6,
      motor: 8,
    },
    traditionalRatings: {
      defense: 9,
      jumpShot: 6,
      ballHandling: 6,
      passing: 7,
    },
  },
  'Kingston Flemings': {
    scoutingGrades: {
      shotDifficulty: 7,
      handle: 8,
      decisionMaking: 9,
      motor: 8,
      physicality: 6,
    },
    traditionalRatings: {
      leadership: 8,
      jumpShot: 8,
      nbaReady: 8,
      ballHandling: 8,
      passing: 8,
    },
  },
  'Darius Acuff Jr.': {
    scoutingGrades: {
      shotCreation: 9,
      shotDifficulty: 8,
      decisionMaking: 7,
      motor: 8,
      physicality: 8,
    },
    traditionalRatings: {
      strength: 8,
      jumpShot: 8,
      ballHandling: 8,
      potential: 9,
      intangibles: 8,
    },
  },
  'Keaton Wagler': {
    traditionalRatings: {
      jumpShot: 9,
      nbaReady: 8,
      ballHandling: 8,
      passing: 8,
    },
  },
  'Mikel Brown Jr.': {
    scoutingGrades: {
      shotDifficulty: 8,
      handle: 9,
      decisionMaking: 7,
      motor: 7,
    },
    traditionalRatings: {
      jumpShot: 8,
      ballHandling: 9,
      passing: 8,
      potential: 9,
    },
  },
  'Nate Ament': {
    scoutingGrades: {
      shotCreation: 8,
      shotDifficulty: 7,
      handle: 7,
      decisionMaking: 7,
      motor: 8,
    },
    traditionalRatings: {
      jumpShot: 8,
      ballHandling: 7,
      passing: 7,
      potential: 10,
    },
  },
  'Labaron Philon': {
    scoutingGrades: {
      handle: 8,
      motor: 7,
      physicality: 6,
    },
    traditionalRatings: {
      jumpShot: 8,
      ballHandling: 8,
      potential: 9,
    },
  },
  'Christian Anderson': {
    scoutingGrades: {
      shotCreation: 8,
      shotDifficulty: 8,
      handle: 8,
      decisionMaking: 6,
      defensiveDiscipline: 4,
      physicality: 4,
    },
    traditionalRatings: {
      defense: 6,
      jumpShot: 8,
      ballHandling: 9,
      potential: 8,
      passing: 9,
    },
  },
  'Dailyn Swain': {
    scoutingGrades: {
      finishingToughness: 8,
      handle: 6,
      decisionMaking: 7,
      defensiveDiscipline: 8,
      motor: 8,
      physicality: 8,
    },
    traditionalRatings: {
      defense: 8,
      jumpShot: 7,
      potential: 8,
    },
  },
  'Isaiah Evans': {
    scoutingGrades: {
      shotDifficulty: 8,
      physicality: 4,
    },
    traditionalRatings: {
      jumpShot: 9,
      potential: 8,
    },
  },
  'Henri Veesaar': {
    scoutingGrades: {
      shotCreation: 4,
      shotDifficulty: 4,
      handle: 4,
      decisionMaking: 7,
    },
    traditionalRatings: {
      jumpShot: 8,
      passing: 7,
      nbaReady: 8,
    },
  },
  'Yaxel Lendeborg': {
    scoutingGrades: {
      decisionMaking: 8,
      defensiveDiscipline: 8,
      motor: 8,
      physicality: 8,
    },
    traditionalRatings: {
      passing: 8,
      nbaReady: 9,
      intangibles: 9,
    },
  },
  'JT Toppin': {
    scoutingGrades: {
      finishingToughness: 9,
      physicality: 9,
      motor: 8,
    },
    traditionalRatings: {
      strength: 9,
      jumpShot: 5,
      nbaReady: 8,
      potential: 8,
    },
  },
  'Jayden Quaintance': {
    scoutingGrades: {
      shotCreation: 5,
      shotDifficulty: 5,
      finishingToughness: 9,
      handle: 4,
      defensiveDiscipline: 8,
      motor: 8,
      physicality: 9,
    },
    traditionalRatings: {
      athleticism: 10,
      size: 10,
      defense: 9,
      strength: 10,
      quickness: 9,
      jumpShot: 3,
      ballHandling: 3,
      intangibles: 9,
    },
  },
  'Aday Mara': {
    scoutingGrades: {
      decisionMaking: 7,
      physicality: 7,
    },
    traditionalRatings: {
      size: 10,
      quickness: 4,
      jumpShot: 4,
      passing: 7,
    },
  },
  'Alex Karaban': {
    scoutingGrades: {
      decisionMaking: 8,
      defensiveDiscipline: 7,
    },
    traditionalRatings: {
      jumpShot: 9,
      nbaReady: 9,
      potential: 6,
    },
  },
  'Bruce Thornton': {
    scoutingGrades: {
      shotCreation: 7,
      shotDifficulty: 7,
      decisionMaking: 8,
    },
    traditionalRatings: {
      jumpShot: 8,
      nbaReady: 9,
      potential: 6,
    },
  },
  'Braden Smith': {
    scoutingGrades: {
      handle: 9,
      decisionMaking: 10,
      motor: 8,
      physicality: 3,
    },
    traditionalRatings: {
      jumpShot: 8,
      ballHandling: 9,
      passing: 10,
      nbaReady: 9,
      potential: 6,
    },
  },
  'Miles Byrd': {
    scoutingGrades: {
      defensiveDiscipline: 8,
      motor: 8,
    },
    traditionalRatings: {
      defense: 8,
      potential: 8,
    },
  },
  'Braylon Mullins': {
    scoutingGrades: {
      shotCreation: 7,
      shotDifficulty: 7,
      motor: 7,
    },
    traditionalRatings: {
      jumpShot: 9,
      potential: 9,
    },
  },
};

function estimateSizeRating(config: DraftClassPlayerConfig): number {
  const isGuard = config.position.includes('Guard') || config.position === 'Guard';
  const isBig = config.position.includes('Center') || config.position.includes('Power Forward');
  const lengthDiff = config.wingspan - config.height;
  let score = 5;

  if (isGuard) {
    if (config.height >= 77) score += 2;
    else if (config.height >= 75) score += 1;
    if (config.weight >= 190) score += 1;
  } else if (isBig) {
    if (config.height >= 85) score += 4;
    else if (config.height >= 83) score += 3;
    else if (config.height >= 81) score += 2;
    if (config.weight >= 235) score += 1;
  } else {
    if (config.height >= 82) score += 3;
    else if (config.height >= 80) score += 2;
    else if (config.height >= 78) score += 1;
    if (config.weight >= 210) score += 1;
  }

  if (lengthDiff >= 4) score += 2;
  else if (lengthDiff >= 2) score += 1;

  return clampRating(score);
}

function estimateTraditionalJumpShot(config: NormalizedDraftClassPlayerConfig, normalizedNotes: string): number {
  let score =
    5.3 +
    (config.stats.threePointPercentage - 0.325) * 14 +
    (config.stats.freeThrowPercentage - 0.75) * 10;

  if (config.stats.freeThrowPercentage >= 0.8 && config.stats.points >= 18) {
    score += 0.6;
  }

  if (
    (normalizedNotes.includes('shot-creation') || normalizedNotes.includes('primary option') || normalizedNotes.includes('scoring upside')) &&
    config.stats.freeThrowPercentage >= 0.78
  ) {
    score += 0.4;
  }

  if (countPhraseHits(normalizedNotes, ['shooting touch', 'deep range', 'perimeter touch', 'movement shooter', 'shotmaking']) > 0) {
    score += 0.9;
  }

  if (
    (config.stats.usageRate ?? 0) >= 27 &&
    config.stats.freeThrowPercentage >= 0.78 &&
    countPhraseHits(normalizedNotes, ['shotmaking', 'pull-up', 'deep range', 'primary option', 'scoring upside']) > 0
  ) {
    score += 0.6;
  }

  if (
    config.rank <= 12 &&
    config.stats.freeThrowPercentage >= 0.79 &&
    countPhraseHits(normalizedNotes, ['shotmaking', 'shooting touch', 'deep range', 'pull-up']) > 0
  ) {
    score = Math.max(score, 7.2);
  }

  if (countPhraseHits(normalizedNotes, ['questions', 'still improving', 'swing skill']) > 0 && config.stats.threePointPercentage < 0.34) {
    score -= 0.5;
  }

  return clampRating(score);
}

function completeDraftClassStats(config: DraftClassPlayerConfig): DraftClassPlayerSeed['stats'] {
  const normalizedNotes = config.scoutingNotes.toLowerCase();
  const isGuard = config.position.includes('Guard') || config.position === 'Guard';
  const isBig = config.position.includes('Center') || config.position.includes('Power Forward');
  const creatorSignals = countPhraseHits(normalizedNotes, ['lead guard', 'pick-and-roll', 'creator', 'shot-creation', 'live-dribble']);
  const shootingSignals = countPhraseHits(normalizedNotes, ['shooting', 'movement shooter', 'perimeter touch', 'deep range', 'shotmaking', 'spacing']);
  const interiorSignals = countPhraseHits(normalizedNotes, ['rim pressure', 'interior', 'paint', 'through contact', 'lob', 'screen-and-roll']);
  const feelSignals = countPhraseHits(normalizedNotes, ['feel', 'poised', 'decision', 'connective', 'winning-player', 'passing']);
  const trueShootingPercentage = clampStat(
    config.stats.trueShootingPercentage ?? (isBig ? 0.59 : isGuard ? 0.565 : 0.57),
    0.44,
    0.72
  );
  const usageRate = clampStat(
    config.stats.usageRate ??
      17 +
        config.stats.points * 0.42 +
        config.stats.assists * 0.55 +
        creatorSignals * 0.9 +
        (isBig ? -1.6 : 0),
    14,
    34
  );

  const freeThrowPercentage = clampStat(
    config.stats.freeThrowPercentage ??
      (isBig ? 0.66 : isGuard ? 0.75 : 0.72) +
        shootingSignals * 0.012 +
        creatorSignals * 0.008 +
        (trueShootingPercentage - 0.57) * 0.55,
    0.52,
    0.92
  );

  const threePointPercentage = clampStat(
    config.stats.threePointPercentage ??
      (isBig ? 0.305 : isGuard ? 0.338 : 0.332) +
        shootingSignals * 0.01 +
        (freeThrowPercentage - 0.74) * 0.28 -
        interiorSignals * 0.005,
    0.21,
    0.46
  );

  const fieldGoalPercentage = clampStat(
    config.stats.fieldGoalPercentage ??
      (isBig ? 0.52 : isGuard ? 0.435 : 0.46) +
        (trueShootingPercentage - 0.57) * 0.75 +
        interiorSignals * 0.008 -
        creatorSignals * 0.006,
    0.36,
    0.67
  );

  const turnovers = clampStat(
    config.stats.turnovers ??
      0.9 +
        config.stats.assists * 0.2 +
        Math.max(0, usageRate - 20) * 0.045 +
        creatorSignals * 0.12 -
        feelSignals * 0.05,
    0.7,
    4.5
  );

  return {
    points: config.stats.points,
    rebounds: config.stats.rebounds,
    assists: config.stats.assists,
    steals: config.stats.steals,
    blocks: config.stats.blocks,
    fieldGoalPercentage,
    threePointPercentage,
    freeThrowPercentage,
    turnovers,
    trueShootingPercentage,
    usageRate,
    assistToTurnoverRatio:
      config.stats.assistToTurnoverRatio ?? (turnovers > 0 ? config.stats.assists / turnovers : config.stats.assists),
    defensiveReboundPercentage: config.stats.defensiveReboundPercentage,
    offensiveReboundPercentage: config.stats.offensiveReboundPercentage,
    playerEfficiencyRating: config.stats.playerEfficiencyRating,
    gamesPlayed: config.stats.gamesPlayed,
  };
}

function estimateDraftClassScoutingGrades(config: NormalizedDraftClassPlayerConfig): DraftClassPlayerSeed['scoutingGrades'] {
  const normalized = config.scoutingNotes.toLowerCase();
  const assistsToTurnovers = config.stats.turnovers > 0 ? config.stats.assists / config.stats.turnovers : config.stats.assists;
  const stocks = config.stats.steals + config.stats.blocks;
  const isGuard = config.position.includes('Guard') || config.position === 'Guard';
  const isBig = config.position.includes('Center') || config.position.includes('Power Forward');
  const isWing = !isGuard && !isBig;
  const bodyMass = config.weight / config.height;
  const rankCreationBoost = config.rank <= 5 ? 0.55 : config.rank <= 12 ? 0.35 : config.rank <= 25 ? 0.15 : 0;
  const rankMotorBoost = config.rank <= 10 ? 0.3 : config.rank <= 30 ? 0.15 : 0;

  const shotCreationHeuristic =
    3.4 +
    config.stats.points * 0.14 +
    config.stats.assists * 0.22 +
    (isGuard ? 0.9 : isWing ? 0.5 : -0.4) +
    (config.stats.points >= 18 ? 0.5 : 0) +
    (normalized.includes('self-creation') || normalized.includes('shot-creation') || normalized.includes('lead guard') ? 0.8 : 0) +
    rankCreationBoost;
  const shotDifficultyHeuristic =
    2.5 +
    clampRating(shotCreationHeuristic) * 0.42 +
    (config.stats.points >= 18 ? 0.6 : 0) +
    ((isGuard || isWing) ? 0.2 : 0) +
    (config.stats.threePointPercentage <= 0.32 && config.stats.points >= 18 ? 0.4 : 0);
  const finishingToughnessHeuristic =
    4 +
    config.stats.fieldGoalPercentage * 5 +
    Math.max(0, bodyMass - 2.4) * 2 +
    (isBig ? 0.5 : 0) +
    (normalized.includes('through contact') || normalized.includes('strong frame') ? 0.8 : 0);
  const handleHeuristic =
    3 +
    config.stats.assists * 0.28 +
    assistsToTurnovers * 0.6 +
    (isGuard ? 1.3 : isWing ? 0.5 : -0.7) +
    (config.stats.points >= 18 && !isBig ? 0.4 : 0) +
    (config.stats.assists >= 4 ? 0.4 : 0) +
    (normalized.includes('feel') || normalized.includes('passing value') ? 0.4 : 0);
  const decisionHeuristic =
    4.1 +
    assistsToTurnovers * 1.35 +
    config.stats.assists * 0.1 +
    (config.stats.turnovers <= 2 ? 0.6 : 0) -
    (config.stats.turnovers >= 3 ? 0.6 : 0) +
    (normalized.includes('feel') || normalized.includes('poised') || normalized.includes('decision') ? 0.7 : 0) +
    (config.rank <= 12 && (normalized.includes('poised') || normalized.includes('feel')) ? 0.2 : 0);
  const defensiveDisciplineHeuristic =
    4 +
    stocks * 0.85 +
    (isBig && config.stats.blocks >= 1 ? 0.5 : 0) +
    (isWing && stocks >= 2 ? 0.4 : 0) +
    (normalized.includes('two-way') || normalized.includes('defensive') || normalized.includes('rim protection') ? 0.7 : 0) -
    (normalized.includes('questions') && config.stats.steals < 1 && config.stats.blocks < 1 ? 0.4 : 0);
  const motorHeuristic =
    4.8 +
    config.stats.rebounds * 0.16 +
    stocks * 0.35 +
    (config.age <= 20 ? 0.2 : 0) +
    (normalized.includes('competitive') || normalized.includes('winning-player') || normalized.includes('hard-playing') ? 0.8 : 0) +
    rankMotorBoost;
  const physicalityHeuristic =
    4 +
    Math.max(0, bodyMass - 2.35) * 2.4 +
    config.stats.fieldGoalPercentage * 2 +
    (isBig ? 0.5 : 0) +
    (normalized.includes('physical') || normalized.includes('strong frame') || normalized.includes('sturdy') ? 0.7 : 0);

  return {
    shotCreation: blendGrade(
      inferKeywordGrade(normalized, {
        strong: ['self creator', 'shot-creation', 'primary option', 'lead guard', 'late-clock value'],
        positive: ['shotmaking', 'live-dribble', 'pick-and-roll', 'three-level', 'scoring guard'],
        negative: ['complementary scorer', 'role-player versatility'],
        base: 6,
      }),
      shotCreationHeuristic
    ),
    shotDifficulty: blendGrade(
      inferKeywordGrade(normalized, {
        strong: ['tough-shot', 'late-clock', 'shotmaking', 'pull-up'],
        positive: ['three-level', 'perimeter shotmaking', 'deep range'],
        negative: ['connective', 'simple role'],
        base: 6,
      }),
      shotDifficultyHeuristic
    ),
    finishingToughness: blendGrade(
      inferKeywordGrade(normalized, {
        strong: ['through contact', 'interior scoring', 'rim pressure', 'paint'],
        positive: ['strong frame', 'downhill', 'physical'],
        negative: ['finesse', 'perimeter'],
        base: 6,
      }),
      finishingToughnessHeuristic
    ),
    handle: blendGrade(
      inferKeywordGrade(normalized, {
        strong: ['lead guard', 'pick-and-roll', 'live-dribble', 'crafty handle'],
        positive: ['pace game', 'creator', 'organize point-guard play', 'secondary offense'],
        negative: ['connective forward', 'interior big', 'narrower role'],
        base: 6,
      }),
      handleHeuristic
    ),
    decisionMaking: blendGrade(
      inferKeywordGrade(normalized, {
        strong: ['feel for the game', 'decision making', 'reads', 'poised', 'organized'],
        positive: ['connective', 'winning-player', 'calm offensive style', 'keep the game moving'],
        negative: ['questions', 'turnover control', 'decision making to feel stable'],
        base: 6,
      }),
      decisionHeuristic
    ),
    defensiveDiscipline: blendGrade(
      inferKeywordGrade(normalized, {
        strong: ['two-way', 'defensive playmaking', 'rim protection', 'team defense'],
        positive: ['defensive', 'stocks', 'role versatility', 'multi-positional'],
        negative: ['size and defensive translation', 'speed and defensive scheme fit'],
        base: 6,
      }),
      defensiveDisciplineHeuristic
    ),
    motor: blendGrade(
      inferKeywordGrade(normalized, {
        strong: ['competitive edge', 'hard-playing', 'winning-player', 'alpha'],
        positive: ['poised', 'toughness', 'motor', 'calm offensive style'],
        negative: ['raw'],
        base: 6,
      }),
      motorHeuristic
    ),
    physicality: blendGrade(
      inferKeywordGrade(normalized, {
        strong: ['strong frame', 'physical', 'sturdy', 'through contact', 'power'],
        positive: ['interior scoring', 'paint', 'rim pressure'],
        negative: ['frame', 'developmental', 'speed'],
        base: 6,
      }),
      physicalityHeuristic
    ),
    competitionRating: getCompetitionLevelSuggestion(config.competitionLevel),
  };
}

function estimateDraftClassTraditionalRatings(
  config: NormalizedDraftClassPlayerConfig,
  scoutingGrades: DraftClassPlayerSeed['scoutingGrades']
): DraftClassPlayerSeed['traditionalRatings'] {
  const normalized = config.scoutingNotes.toLowerCase();
  const assistsToTurnovers = config.stats.turnovers > 0 ? config.stats.assists / config.stats.turnovers : config.stats.assists;
  const sizeRating = estimateSizeRating(config);
  const isGuard = config.position.includes('Guard') || config.position === 'Guard';
  const isBig = config.position.includes('Center') || config.position.includes('Power Forward');
  const productionSignal = config.stats.points * 0.18 + config.stats.rebounds * 0.12 + config.stats.assists * 0.15;

  const defenseRating = clampRating(
    3.4 +
      (scoutingGrades.defensiveDiscipline ?? 6) * 0.5 +
      (config.stats.steals + config.stats.blocks) * 0.6 +
      (normalized.includes('two-way') || normalized.includes('rim protection') ? 0.7 : 0)
  );
  const strengthRating = clampRating(
    3.8 +
      (scoutingGrades.physicality ?? 6) * 0.52 +
      (config.weight / config.height - 2.35) * 2 +
      (isBig ? 0.5 : 0)
  );
  const quicknessRating = clampRating(
    config.athleticism +
      (isGuard ? 0.8 : 0) +
      (!isBig ? 0.3 : -0.4) +
      (normalized.includes('speed') || normalized.includes('fluidity') ? 0.6 : 0)
  );
  const leadershipRating = clampRating(
    4.8 +
      (scoutingGrades.motor ?? 6) * 0.35 +
      (config.age >= 22 ? 0.6 : 0) +
      (normalized.includes('poised') || normalized.includes('winning-player') || normalized.includes('feel') ? 0.7 : 0)
  );
  const jumpShotRating = estimateTraditionalJumpShot(config, normalized);
  const nbaReadyRating = clampRating(
    4.2 +
      (config.age - 19) * 0.65 +
      getCompetitionLevelSuggestion(config.competitionLevel) * 0.26 +
      productionSignal * 0.12 -
      (normalized.includes('raw') || normalized.includes('developmental') ? 0.9 : 0)
  );
  const ballHandlingRating = clampRating((scoutingGrades.handle ?? 6) * 0.9 + (isGuard ? 1 : !isBig ? 0.4 : -0.6));
  const refinedBallHandlingRating = clampRating(
    ballHandlingRating +
      Math.min(1.2, config.stats.assists * 0.12) +
      (normalized.includes('pick-and-roll') || normalized.includes('creator') || normalized.includes('pace game') ? 0.4 : 0)
  );
  const potentialRating = clampRating(
    4.8 +
      Math.max(0, 21 - config.age) * 0.55 +
      config.athleticism * 0.22 +
      sizeRating * 0.14 +
      (normalized.includes('upside') || normalized.includes('ceiling') ? 0.8 : 0) -
      (config.age >= 22 ? 1.2 : 0)
  );
  const passingRating = clampRating(
    3.8 +
      config.stats.assists * 0.45 +
      assistsToTurnovers * 0.55 +
      (normalized.includes('passing') || normalized.includes('connective') || normalized.includes('playmaking') ? 0.8 : 0)
  );
  const intangiblesRating = clampRating(
    4.8 +
      (scoutingGrades.motor ?? 6) * 0.34 +
      leadershipRating * 0.22 +
      (normalized.includes('winning-player') || normalized.includes('poised') || normalized.includes('feel') ? 0.5 : 0)
  );

  const athleticismRating = clampRating(config.athleticism + (normalized.includes('explosive') || normalized.includes('tools') ? 0.6 : 0));
  const jumpShotFloor =
    config.rank <= 12 && config.stats.freeThrowPercentage >= 0.79 && (config.stats.usageRate ?? 0) >= 24
      ? 7
      : countPhraseHits(normalized, ['movement shooter', 'shooting touch', 'deep range']) > 0 &&
          config.stats.freeThrowPercentage >= 0.82
        ? 8
        : 0;

  return {
    athleticism: athleticismRating,
    size: sizeRating,
    defense: defenseRating,
    strength: strengthRating,
    quickness: quicknessRating,
    leadership: leadershipRating,
    jumpShot: Math.max(jumpShotRating, jumpShotFloor),
    nbaReady: Math.max(nbaReadyRating, getReadinessFloor(config)),
    ballHandling: refinedBallHandlingRating,
    potential: Math.max(potentialRating, getPotentialFloorByRank(config.rank)),
    passing: passingRating,
    intangibles: intangiblesRating,
  };
}

function buildDraftClassPlayer(config: DraftClassPlayerConfig): DraftClassPlayerSeed {
  const normalizedConfig: NormalizedDraftClassPlayerConfig = {
    ...config,
    stats: completeDraftClassStats(config),
  };
  const ratingOverrides = MANUAL_DRAFT_CLASS_RATING_OVERRIDES[normalizedConfig.name];
  const scoutingGrades = mergeRatings(
    estimateDraftClassScoutingGrades(normalizedConfig),
    ratingOverrides?.scoutingGrades
  );
  const traditionalRatings = mergeRatings(
    estimateDraftClassTraditionalRatings(normalizedConfig, scoutingGrades),
    ratingOverrides?.traditionalRatings
  );

  return {
    name: normalizedConfig.name,
    college: normalizedConfig.college,
    age: normalizedConfig.age,
    competitionLevel: normalizedConfig.competitionLevel,
    season: 2026,
    stats: normalizedConfig.stats,
    attributes: {
      height: normalizedConfig.height,
      wingspan: normalizedConfig.wingspan,
      weight: normalizedConfig.weight,
      athleticism: normalizedConfig.athleticism,
      position: normalizedConfig.position,
    },
    scoutingGrades,
    traditionalRatings,
    strengths: '',
    weaknesses: '',
    scoutingNotes: normalizedConfig.scoutingNotes,
    tags: ['2026 draft', 'top 30', `rank ${normalizedConfig.rank}`],
  };
}

export const DRAFT_CLASS_2026_SNAPSHOT = {
  label: '2026 Top 30 Draft Class Snapshot',
  snapshotDate: '2026-03-25',
  primarySource: 'Tankathon 2026 Big Board',
  crossChecks: ['ESPN 2026 mock draft coverage', 'NBA Draft Room position rankings'],
  notes: [
    'This is a March 25, 2026 snapshot of the upcoming class, not a permanent consensus board.',
    'Player ordering and core box-score data are anchored to Tankathon and cross-checked against other public draft coverage.',
    'Wingspans are estimated for some prospects when broadly published verified measurements were not easy to confirm in accessible public sources.',
  ],
} as const;

export const TOP_2026_DRAFT_CLASS: DraftClassPlayerSeed[] = [
  buildDraftClassPlayer({
    rank: 1,
    name: 'Cameron Boozer',
    college: 'Duke',
    age: 18.9,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 81,
    wingspan: 84,
    weight: 250,
    athleticism: 7,
    stats: {
      points: 22.4,
      rebounds: 10.3,
      assists: 4.2,
      steals: 1.5,
      blocks: 0.6,
      fieldGoalPercentage: 0.563,
      threePointPercentage: 0.398,
      freeThrowPercentage: 0.787,
      turnovers: 2.5,
    },
    scoutingNotes:
      'Polished scoring forward with an advanced feel for the game, strong frame, and real passing value. High-floor offensive engine type who can play through contact, punish mismatches, and still has room to sharpen vertical pop and defensive range.',
  }),
  buildDraftClassPlayer({
    rank: 2,
    name: 'Darryn Peterson',
    college: 'Kansas',
    age: 19.4,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 78,
    wingspan: 80,
    weight: 205,
    athleticism: 8,
    stats: {
      points: 20.2,
      rebounds: 4.2,
      assists: 1.6,
      steals: 1.4,
      blocks: 0.6,
      fieldGoalPercentage: 0.438,
      threePointPercentage: 0.382,
      freeThrowPercentage: 0.826,
      turnovers: 1.6,
    },
    scoutingNotes:
      'Big scoring guard with three-level shotmaking ability, real self-creation upside, and strong late-clock value. The appeal is star-caliber scoring talent, while the swing question is how much high-end playmaking and defensive consistency come with it.',
  }),
  buildDraftClassPlayer({
    rank: 3,
    name: 'AJ Dybantsa',
    college: 'BYU',
    age: 19.4,
    competitionLevel: 'NCAA High-Major',
    position: 'Small Forward',
    height: 81,
    wingspan: 83,
    weight: 210,
    athleticism: 9,
    stats: {
      points: 25.5,
      rebounds: 6.8,
      assists: 3.7,
      steals: 1.1,
      blocks: 0.3,
      fieldGoalPercentage: 0.54,
      threePointPercentage: 0.304,
      freeThrowPercentage: 0.821,
      turnovers: 2.4,
    },
    scoutingNotes:
      'Explosive two-way wing with premium shot-creation tools, transition force, and real alpha scoring upside. He already looks like a future primary option type, with three-point consistency still the main swing skill.',
  }),
  buildDraftClassPlayer({
    rank: 4,
    name: 'Caleb Wilson',
    college: 'North Carolina',
    age: 19.9,
    competitionLevel: 'NCAA High-Major',
    position: 'Forward',
    height: 82,
    wingspan: 84,
    weight: 215,
    athleticism: 8,
    stats: {
      points: 19.8,
      rebounds: 9.4,
      assists: 2.7,
      steals: 1.5,
      blocks: 1.4,
      fieldGoalPercentage: 0.502,
      threePointPercentage: 0.272,
      freeThrowPercentage: 0.74,
      turnovers: 2.1,
    },
    scoutingNotes:
      'Long combo forward with open-floor fluidity, defensive playmaking tools, and multi-positional upside. The long-term bet is on the physical tools and versatility, with half-court shotmaking and added strength determining how high he climbs.',
  }),
  buildDraftClassPlayer({
    rank: 5,
    name: 'Kingston Flemings',
    college: 'Houston',
    age: 19.5,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 76,
    wingspan: 78,
    weight: 190,
    athleticism: 8,
    stats: {
      points: 16.2,
      rebounds: 4.0,
      assists: 5.2,
      steals: 1.6,
      blocks: 0.3,
      fieldGoalPercentage: 0.478,
      threePointPercentage: 0.388,
      freeThrowPercentage: 0.843,
      turnovers: 1.8,
    },
    scoutingNotes:
      'Poised lead guard who changes pace well, makes efficient reads, and brings real shooting touch. His value comes from organized point-guard play, decision making, and scalable offense rather than pure flash.',
  }),
  buildDraftClassPlayer({
    rank: 6,
    name: 'Darius Acuff Jr.',
    college: 'Arkansas',
    age: 19.6,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 75,
    wingspan: 78,
    weight: 190,
    athleticism: 8,
    stats: {
      points: 23.3,
      rebounds: 3.1,
      assists: 6.5,
      steals: 0.8,
      blocks: 0.3,
      fieldGoalPercentage: 0.494,
      threePointPercentage: 0.4,
      freeThrowPercentage: 0.771,
      turnovers: 2.8,
    },
    scoutingNotes:
      'Three-level scoring point guard with advanced pick-and-roll feel, deep range, and a polished pace game. He looks comfortable carrying offense, though defensive consistency and true lead-guard balance remain the key development points.',
  }),
  buildDraftClassPlayer({
    rank: 7,
    name: 'Keaton Wagler',
    college: 'Illinois',
    age: 19.4,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 78,
    wingspan: 80,
    weight: 185,
    athleticism: 7,
    stats: {
      points: 17.8,
      rebounds: 4.9,
      assists: 4.4,
      steals: 0.9,
      blocks: 0.4,
      fieldGoalPercentage: 0.5,
      threePointPercentage: 0.415,
      freeThrowPercentage: 0.779,
      turnovers: 1.8,
    },
    scoutingNotes:
      'Efficient big guard with shooting, secondary playmaking, and a calm offensive style. The blend of size, feel, and perimeter touch gives him real value even if he is more methodical than explosive.',
  }),
  buildDraftClassPlayer({
    rank: 8,
    name: 'Mikel Brown Jr.',
    college: 'Louisville',
    age: 20.2,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 77,
    wingspan: 78,
    weight: 190,
    athleticism: 8,
    stats: {
      points: 18.2,
      rebounds: 3.3,
      assists: 4.7,
      steals: 1.2,
      blocks: 0.1,
      fieldGoalPercentage: 0.451,
      threePointPercentage: 0.379,
      freeThrowPercentage: 0.827,
      turnovers: 2.7,
    },
    scoutingNotes:
      'Polished pick-and-roll guard with pull-up shooting, crafty handle, and real offensive poise. The questions are more about frame, rim finishing, and whether he becomes a steady starter or more of a high-level rotation creator.',
  }),
  buildDraftClassPlayer({
    rank: 9,
    name: 'Nate Ament',
    college: 'Tennessee',
    age: 19.5,
    competitionLevel: 'NCAA High-Major',
    position: 'Forward',
    height: 82,
    wingspan: 84,
    weight: 207,
    athleticism: 8,
    stats: {
      points: 16.9,
      rebounds: 6.4,
      assists: 2.3,
      steals: 1.0,
      blocks: 0.6,
      fieldGoalPercentage: 0.468,
      threePointPercentage: 0.327,
      freeThrowPercentage: 0.74,
      turnovers: 2.8,
    },
    scoutingNotes:
      'Huge wing-forward prospect with fluid movement, shotmaking flashes, and long-term two-way upside. His profile is built on size, perimeter skill, and developmental ceiling, with strength and consistency still catching up.',
  }),
  buildDraftClassPlayer({
    rank: 10,
    name: 'Hannes Steinbach',
    college: 'Washington',
    age: 20.1,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 83,
    wingspan: 85,
    weight: 220,
    athleticism: 6,
    stats: {
      points: 18.5,
      rebounds: 11.8,
      assists: 1.6,
      steals: 1.1,
      blocks: 1.2,
      fieldGoalPercentage: 0.633,
      threePointPercentage: 0.308,
      freeThrowPercentage: 0.661,
      turnovers: 1.4,
    },
    scoutingNotes:
      'Productive skilled big with touch around the rim, strong rebounding numbers, and functional interior scoring. He wins with feel and efficiency, while the long-term questions center on mobility, spacing consistency, and NBA defensive fit.',
  }),
  buildDraftClassPlayer({
    rank: 11,
    name: 'Braylon Mullins',
    college: 'UConn',
    age: 20.2,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 78,
    wingspan: 79,
    weight: 196,
    athleticism: 7,
    stats: {
      points: 12.1,
      rebounds: 3.5,
      assists: 1.5,
      steals: 1.1,
      blocks: 0.7,
      fieldGoalPercentage: 0.435,
      threePointPercentage: 0.345,
      freeThrowPercentage: 0.852,
      turnovers: 1.1,
    },
    scoutingNotes:
      'Movement shooter with off-ball scoring value and strong touch indicators at the line. He projects best if the jumper scales cleanly and the rest of the game holds up well enough for a rotation wing role.',
  }),
  buildDraftClassPlayer({
    rank: 12,
    name: 'Labaron Philon',
    college: 'Alabama',
    age: 20.6,
    competitionLevel: 'NCAA High-Major',
    position: 'Guard',
    height: 76,
    wingspan: 78,
    weight: 175,
    athleticism: 8,
    stats: {
      points: 21.6,
      rebounds: 3.4,
      assists: 5.0,
      steals: 1.2,
      blocks: 0.2,
      fieldGoalPercentage: 0.511,
      threePointPercentage: 0.403,
      freeThrowPercentage: 0.789,
      turnovers: 2.5,
    },
    scoutingNotes:
      'Crafty scoring guard with live-dribble creation, pace, and enough passing to stress defenses on or off the ball. The offensive toolkit is clear, while size and defensive translation will shape how big the NBA role becomes.',
  }),
  buildDraftClassPlayer({
    rank: 13,
    name: 'Yaxel Lendeborg',
    college: 'Michigan',
    age: 23.7,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 82,
    wingspan: 84,
    weight: 235,
    athleticism: 8,
    stats: {
      points: 14.7,
      rebounds: 6.9,
      assists: 3.2,
      steals: 1.1,
      blocks: 1.3,
      fieldGoalPercentage: 0.515,
      threePointPercentage: 0.361,
      freeThrowPercentage: 0.83,
      turnovers: 1.1,
    },
    scoutingNotes:
      'Older versatile forward who stuffs the stat sheet, rebounds, passes, and makes winning plays on both ends. Teams will like the floor, toughness, and role versatility, even if the age caps the long-term upside.',
  }),
  buildDraftClassPlayer({
    rank: 14,
    name: 'Brayden Burries',
    college: 'Arizona',
    age: 20.8,
    competitionLevel: 'NCAA High-Major',
    position: 'Guard',
    height: 76,
    wingspan: 79,
    weight: 205,
    athleticism: 7,
    stats: {
      points: 16.0,
      rebounds: 4.8,
      assists: 2.5,
      steals: 1.5,
      blocks: 0.2,
      fieldGoalPercentage: 0.492,
      threePointPercentage: 0.367,
      freeThrowPercentage: 0.804,
      turnovers: 1.3,
    },
    scoutingNotes:
      'Strong combo guard with downhill intent, shotmaking flashes, and a competitive edge. He projects as a scorer who can help secondary offense, with pure lead-guard certainty and top-end burst still up for debate.',
  }),
  buildDraftClassPlayer({
    rank: 15,
    name: 'Thomas Haugh',
    college: 'Florida',
    age: 22.9,
    competitionLevel: 'NCAA High-Major',
    position: 'Forward',
    height: 81,
    wingspan: 83,
    weight: 215,
    athleticism: 7,
    stats: {
      points: 17.1,
      rebounds: 6.1,
      assists: 2.1,
      steals: 1.1,
      blocks: 1.0,
      fieldGoalPercentage: 0.461,
      threePointPercentage: 0.331,
      freeThrowPercentage: 0.766,
      turnovers: 1.5,
    },
    scoutingNotes:
      'Versatile forward who offers connective passing, solid team defense, and enough perimeter touch to fit a modern frontcourt. He reads like a winning-player bet more than a pure upside swing.',
  }),
  buildDraftClassPlayer({
    rank: 16,
    name: 'Koa Peat',
    college: 'Arizona',
    age: 19.4,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 80,
    wingspan: 82,
    weight: 235,
    athleticism: 7,
    stats: {
      points: 13.7,
      rebounds: 5.5,
      assists: 2.7,
      steals: 0.7,
      blocks: 0.7,
      fieldGoalPercentage: 0.533,
      threePointPercentage: 0.316,
      freeThrowPercentage: 0.611,
      turnovers: 1.7,
    },
    scoutingNotes:
      'Sturdy forward with strength, interior scoring instincts, and some connective feel as a passer. His role becomes clearer if the jumper and defensive flexibility continue to improve against NBA spacing.',
  }),
  buildDraftClassPlayer({
    rank: 17,
    name: 'Tounde Yessoufou',
    college: 'Baylor',
    age: 20.1,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 77,
    wingspan: 79,
    weight: 215,
    athleticism: 8,
    stats: {
      points: 17.8,
      rebounds: 5.8,
      assists: 1.6,
      steals: 2.0,
      blocks: 0.5,
      fieldGoalPercentage: 0.469,
      threePointPercentage: 0.302,
      freeThrowPercentage: 0.744,
      turnovers: 1.9,
    },
    scoutingNotes:
      'Explosive scoring wing with rim pressure, physicality, and a hard-playing style that shows up in stocks. The pressure game is real, while perimeter shooting and decision-making polish will determine how stable the role is.',
  }),
  buildDraftClassPlayer({
    rank: 18,
    name: 'Jayden Quaintance',
    college: 'Kentucky',
    age: 18.9,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 82.5,
    wingspan: 84.5,
    weight: 255,
    athleticism: 8,
    stats: {
      points: 5.0,
      rebounds: 5.0,
      assists: 0.5,
      steals: 0.5,
      blocks: 0.8,
      fieldGoalPercentage: 0.571,
      threePointPercentage: 0,
      freeThrowPercentage: 0.308,
      turnovers: 1.5,
    },
    scoutingNotes:
      'Extremely young frontcourt prospect with major physical tools, rim protection upside, and long-term defensive ceiling. The offense is still raw, but the age-and-tools combination makes him a real upside bet.',
  }),
  buildDraftClassPlayer({
    rank: 19,
    name: 'Bennett Stirtz',
    college: 'Iowa',
    age: 22.7,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 76,
    wingspan: 77,
    weight: 190,
    athleticism: 6,
    stats: {
      points: 19.7,
      rebounds: 2.7,
      assists: 4.5,
      steals: 1.5,
      blocks: 0.3,
      fieldGoalPercentage: 0.483,
      threePointPercentage: 0.373,
      freeThrowPercentage: 0.844,
      turnovers: 1.9,
    },
    scoutingNotes:
      'Older smart guard whose value comes from decision making, shooting touch, and offensive efficiency. He reads like a ready-made backup or connector guard if the physical tools hold up well enough.',
  }),
  buildDraftClassPlayer({
    rank: 20,
    name: 'Patrick Ngongba II',
    college: 'Duke',
    age: 20.3,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 83,
    wingspan: 85,
    weight: 250,
    athleticism: 7,
    stats: {
      points: 10.5,
      rebounds: 6.0,
      assists: 2.0,
      steals: 0.6,
      blocks: 1.1,
      fieldGoalPercentage: 0.607,
      threePointPercentage: 0.276,
      freeThrowPercentage: 0.694,
      turnovers: 1.4,
    },
    scoutingNotes:
      'Efficient interior big with touch, size, and some passing feel for his position. He offers a blend of ready-now role value and upside if the jumper and conditioning continue to move forward.',
  }),
  buildDraftClassPlayer({
    rank: 21,
    name: 'Chris Cenac Jr.',
    college: 'Houston',
    age: 19.4,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 83,
    wingspan: 85,
    weight: 240,
    athleticism: 7,
    stats: {
      points: 9.6,
      rebounds: 7.8,
      assists: 0.7,
      steals: 0.8,
      blocks: 0.5,
      fieldGoalPercentage: 0.495,
      threePointPercentage: 0.345,
      freeThrowPercentage: 0.621,
      turnovers: 0.9,
    },
    scoutingNotes:
      'Long mobile big with intriguing two-way tools, rebounding production, and emerging shooting signs. He is still building out strength and polish, but the archetype is easy to see.',
  }),
  buildDraftClassPlayer({
    rank: 22,
    name: 'Christian Anderson',
    college: 'Texas Tech',
    age: 20.2,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 75,
    wingspan: 76,
    weight: 178,
    athleticism: 7,
    stats: {
      points: 18.5,
      rebounds: 3.6,
      assists: 7.4,
      steals: 1.5,
      blocks: 0.2,
      fieldGoalPercentage: 0.472,
      threePointPercentage: 0.415,
      freeThrowPercentage: 0.805,
      turnovers: 3.3,
    },
    scoutingNotes:
      'Small lead guard with serious shooting and passing juice who can run offense and create tempo. The appeal is obvious skill, while the pressure points are size, turnover control, and defensive survivability.',
  }),
  buildDraftClassPlayer({
    rank: 23,
    name: 'Karim Lopez',
    college: 'New Zealand Breakers',
    age: 19.2,
    competitionLevel: 'International Pro',
    position: 'Small Forward',
    height: 80,
    wingspan: 82,
    weight: 220,
    athleticism: 7,
    stats: {
      points: 11.9,
      rebounds: 6.1,
      assists: 1.9,
      steals: 1.2,
      blocks: 1.0,
      fieldGoalPercentage: 0.494,
      threePointPercentage: 0.322,
      freeThrowPercentage: 0.739,
      turnovers: 1.5,
    },
    scoutingNotes:
      'Big wing playing against pros with a useful blend of size, feel, and two-way tools. He is more developmental than finished, but the age and competition context make the profile interesting.',
  }),
  buildDraftClassPlayer({
    rank: 24,
    name: 'Cameron Carr',
    college: 'Baylor',
    age: 21.6,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 77,
    wingspan: 79,
    weight: 175,
    athleticism: 7,
    stats: {
      points: 19.2,
      rebounds: 5.5,
      assists: 2.7,
      steals: 0.9,
      blocks: 1.3,
      fieldGoalPercentage: 0.51,
      threePointPercentage: 0.394,
      freeThrowPercentage: 0.804,
      turnovers: 2.4,
    },
    scoutingNotes:
      'Scoring wing with perimeter shotmaking, transition value, and enough length to make plays defensively. He looks more like a complementary scorer than a primary creator, but the offensive fit is workable.',
  }),
  buildDraftClassPlayer({
    rank: 25,
    name: 'Joshua Jefferson',
    college: 'Iowa State',
    age: 22.6,
    competitionLevel: 'NCAA High-Major',
    position: 'Forward',
    height: 81,
    wingspan: 83,
    weight: 240,
    athleticism: 7,
    stats: {
      points: 16.4,
      rebounds: 7.4,
      assists: 4.8,
      steals: 1.6,
      blocks: 0.8,
      fieldGoalPercentage: 0.471,
      threePointPercentage: 0.345,
      freeThrowPercentage: 0.7,
      turnovers: 1.8,
    },
    scoutingNotes:
      'Older connective forward who rebounds, passes, defends, and plays within team concepts. He brings clear winning-player indicators, even if the upside is more about fit than star-level creation.',
  }),
  buildDraftClassPlayer({
    rank: 26,
    name: 'Tyler Tanner',
    college: 'Vanderbilt',
    age: 20.4,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 72,
    wingspan: 74,
    weight: 175,
    athleticism: 7,
    stats: {
      points: 19.5,
      rebounds: 3.6,
      assists: 5.1,
      steals: 2.4,
      blocks: 0.3,
      fieldGoalPercentage: 0.455,
      threePointPercentage: 0.397,
      freeThrowPercentage: 0.881,
      turnovers: 1.9,
    },
    scoutingNotes:
      'Small scoring and playmaking guard with deep shooting range, live-dribble offense, and disruptive hands. The skill base is strong, but the size puts real pressure on efficiency and defensive translation.',
  }),
  buildDraftClassPlayer({
    rank: 27,
    name: 'Amari Allen',
    college: 'Alabama',
    age: 20.4,
    competitionLevel: 'NCAA High-Major',
    position: 'Forward',
    height: 80,
    wingspan: 82,
    weight: 205,
    athleticism: 7,
    stats: {
      points: 11.6,
      rebounds: 7.0,
      assists: 3.1,
      steals: 1.1,
      blocks: 0.7,
      fieldGoalPercentage: 0.477,
      threePointPercentage: 0.365,
      freeThrowPercentage: 0.812,
      turnovers: 1.4,
    },
    scoutingNotes:
      'Versatile forward who rebounds, passes, and keeps the game moving without forcing offense. The attraction is role-player versatility and team fit, with on-ball scoring upside still somewhat limited.',
  }),
  buildDraftClassPlayer({
    rank: 28,
    name: 'Morez Johnson Jr.',
    college: 'Michigan',
    age: 20.4,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 81,
    wingspan: 83,
    weight: 250,
    athleticism: 7,
    stats: {
      points: 13.4,
      rebounds: 7.3,
      assists: 1.1,
      steals: 0.7,
      blocks: 1.1,
      fieldGoalPercentage: 0.581,
      threePointPercentage: 0.313,
      freeThrowPercentage: 0.665,
      turnovers: 1.3,
    },
    scoutingNotes:
      'Physical interior big who rebounds hard, finishes efficiently, and brings a strong motor around the paint. He projects best in a narrower role unless the jumper and perimeter mobility keep improving.',
  }),
  buildDraftClassPlayer({
    rank: 29,
    name: 'Aday Mara',
    college: 'Michigan',
    age: 21.2,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 87,
    wingspan: 89,
    weight: 255,
    athleticism: 6,
    stats: {
      points: 12.0,
      rebounds: 6.9,
      assists: 2.5,
      steals: 0.3,
      blocks: 2.7,
      fieldGoalPercentage: 0.575,
      threePointPercentage: 0,
      freeThrowPercentage: 0.617,
      turnovers: 1.9,
    },
    scoutingNotes:
      'Massive center with real rim protection, touch around the basket, and some passing feel uncommon for his size. The upside comes from the size and skill blend, while NBA speed and defensive scheme fit remain the clear questions.',
  }),
  buildDraftClassPlayer({
    rank: 30,
    name: 'Ebuka Okorie',
    college: 'Stanford',
    age: 19.2,
    competitionLevel: 'NCAA High-Major',
    position: 'Guard',
    height: 74,
    wingspan: 77,
    weight: 185,
    athleticism: 8,
    stats: {
      points: 22.8,
      rebounds: 3.7,
      assists: 3.5,
      steals: 1.6,
      blocks: 0.3,
      fieldGoalPercentage: 0.417,
      threePointPercentage: 0.361,
      freeThrowPercentage: 0.793,
      turnovers: 2.5,
    },
    scoutingNotes:
      'Young scoring combo guard with speed, live-dribble pressure, and real shot-creation ambition. The production is intriguing, but the profile still needs cleaner efficiency and decision making to feel stable.',
  }),
];

export const SECOND_ROUND_2026_SNAPSHOT = {
  label: '2026 Second Round Snapshot (Ranks 31-60)',
  snapshotDate: '2026-03-25',
  primarySource: 'Tankathon 2026 Big Board and player profile pages',
  crossChecks: ['NBA Draft Room 2026 second round board', 'current school and prospect coverage for selected sleepers'],
  notes: [
    'This is a March 25, 2026 snapshot of the current ranks 31-60 range, not a permanent consensus board.',
    'Core stats, age, team, and board position were pulled from current Tankathon player profile pages whenever available.',
    'Wingspans are still estimated for several prospects when a broadly published verified measurement was not easy to confirm in accessible public sources.',
  ],
} as const;

export const SECOND_ROUND_2026_DRAFT_CLASS: DraftClassPlayerSeed[] = [
  buildDraftClassPlayer({
    rank: 31,
    name: 'Dailyn Swain',
    college: 'Texas',
    age: 20.93,
    competitionLevel: 'NCAA High-Major',
    position: 'Small Forward',
    height: 80,
    wingspan: 82,
    weight: 225,
    athleticism: 8,
    stats: {
      points: 17.8,
      rebounds: 7.6,
      assists: 3.4,
      steals: 1.7,
      blocks: 0.3,
      fieldGoalPercentage: 0.551,
      threePointPercentage: 0.345,
      freeThrowPercentage: 0.816,
      turnovers: 2.7,
      trueShootingPercentage: 0.645,
      usageRate: 25.2,
    },
    scoutingNotes:
      'Physical slashing wing with real downhill force, defensive event creation, and enough connective passing to fit multiple lineup types. The swing skill is whether the jumper becomes strong enough to let the athletic tools scale into a clean two-way wing role.',
  }),
  buildDraftClassPlayer({
    rank: 32,
    name: 'Isaiah Evans',
    college: 'Duke',
    age: 20.54,
    competitionLevel: 'NCAA High-Major',
    position: 'Small Forward',
    height: 78,
    wingspan: 81,
    weight: 180,
    athleticism: 7,
    stats: {
      points: 14.5,
      rebounds: 2.8,
      assists: 1.3,
      steals: 0.8,
      blocks: 0.7,
      fieldGoalPercentage: 0.426,
      threePointPercentage: 0.367,
      freeThrowPercentage: 0.868,
      turnovers: 1.1,
      trueShootingPercentage: 0.588,
    },
    scoutingNotes:
      'Long shotmaking wing whose main value comes from movement shooting, touch, and difficult-shot confidence. He needs more strength and all-around impact outside the jumper, but the shooting indicators are the kind NBA teams keep betting on.',
  }),
  buildDraftClassPlayer({
    rank: 33,
    name: 'Alijah Arenas',
    college: 'USC',
    age: 19.26,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 78,
    wingspan: 80,
    weight: 197,
    athleticism: 7,
    stats: {
      points: 14.8,
      rebounds: 2.8,
      assists: 1.9,
      steals: 0.9,
      blocks: 0.5,
      fieldGoalPercentage: 0.343,
      threePointPercentage: 0.224,
      freeThrowPercentage: 0.792,
      turnovers: 2.2,
      trueShootingPercentage: 0.46,
      usageRate: 32.1,
    },
    scoutingNotes:
      'Young scoring guard with real creation ambition, foul-drawing instincts, and room to grow into a bigger offensive role. The talent is obvious, but efficiency, shot selection, and overall polish still make him more of an upside bet than a stable rotation projection today.',
  }),
  buildDraftClassPlayer({
    rank: 34,
    name: 'Malachi Moreno',
    college: 'Kentucky',
    age: 19.65,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 84,
    wingspan: 87,
    weight: 250,
    athleticism: 6,
    stats: {
      points: 8.3,
      rebounds: 6.6,
      assists: 1.8,
      steals: 0.6,
      blocks: 1.6,
      fieldGoalPercentage: 0.587,
      threePointPercentage: 0,
      freeThrowPercentage: 0.685,
      turnovers: 1.3,
    },
    scoutingNotes:
      'Coordinated seven-footer with touch, passing feel, and real rim protection utility for his age. He projects as a developmental interior big whose value rises if the body, mobility, and jumper continue to move in the right direction.',
  }),
  buildDraftClassPlayer({
    rank: 35,
    name: 'Flory Bidunga',
    college: 'Kansas',
    age: 21.08,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 82,
    wingspan: 85,
    weight: 235,
    athleticism: 8,
    stats: {
      points: 14.9,
      rebounds: 9.0,
      assists: 1.7,
      steals: 0.7,
      blocks: 2.9,
      fieldGoalPercentage: 0.686,
      threePointPercentage: 0,
      freeThrowPercentage: 0.675,
      turnovers: 1.5,
      trueShootingPercentage: 0.69,
      usageRate: 20.3,
    },
    scoutingNotes:
      'Rim-running, shot-blocking center with major vertical tools and strong interior efficiency. The defensive ceiling is what sells him, while the offensive role still looks fairly narrow unless skill growth opens up more than dunker-spot and rim-pressure value.',
  }),
  buildDraftClassPlayer({
    rank: 36,
    name: 'Sergio de Larrea',
    college: 'Valencia',
    age: 20.54,
    competitionLevel: 'International Pro',
    position: 'Point Guard',
    height: 78,
    wingspan: 80,
    weight: 198,
    athleticism: 6,
    stats: {
      points: 6.5,
      rebounds: 2.0,
      assists: 2.9,
      steals: 0.5,
      blocks: 0.2,
      fieldGoalPercentage: 0.456,
      threePointPercentage: 0.407,
      freeThrowPercentage: 0.796,
      turnovers: 1.5,
      trueShootingPercentage: 0.607,
      usageRate: 22,
    },
    scoutingNotes:
      'Tall Spanish guard with real passing craft, pull-up shooting value, and comfort running offense against pros. The NBA appeal is a skill-and-feel backcourt piece, with burst and physical upside deciding whether he is a connector or something more.',
  }),
  buildDraftClassPlayer({
    rank: 37,
    name: 'Meleek Thomas',
    college: 'Arkansas',
    age: 19.87,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 77,
    wingspan: 79,
    weight: 185,
    athleticism: 7,
    stats: {
      points: 15.0,
      rebounds: 3.7,
      assists: 2.7,
      steals: 1.5,
      blocks: 0.1,
      fieldGoalPercentage: 0.421,
      threePointPercentage: 0.385,
      freeThrowPercentage: 0.826,
      turnovers: 0.9,
    },
    scoutingNotes:
      'Scoring combo guard with shotmaking, pace, and strong touch indicators who already keeps mistakes relatively low. The offensive profile is promising, but he still has to prove whether he is more natural lead initiator or bucket-getting secondary guard long term.',
  }),
  buildDraftClassPlayer({
    rank: 38,
    name: 'Henri Veesaar',
    college: 'North Carolina',
    age: 22.23,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 84,
    wingspan: 86,
    weight: 225,
    athleticism: 7,
    stats: {
      points: 16.3,
      rebounds: 8.4,
      assists: 2.0,
      steals: 0.6,
      blocks: 1.2,
      fieldGoalPercentage: 0.614,
      threePointPercentage: 0.415,
      freeThrowPercentage: 0.614,
      turnovers: 1.5,
    },
    scoutingNotes:
      'Mobile stretch big with real pick-and-pop value, smart offensive feel, and enough shot blocking to project as a modern frontcourt piece. He still needs strength and more consistency finishing through contact, but the role fit is easy to picture.',
  }),
  buildDraftClassPlayer({
    rank: 39,
    name: 'Zuby Ejiofor',
    college: "St. John's",
    age: 22.17,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 81,
    wingspan: 84,
    weight: 245,
    athleticism: 7,
    stats: {
      points: 16.0,
      rebounds: 7.1,
      assists: 3.5,
      steals: 1.2,
      blocks: 2.0,
      fieldGoalPercentage: 0.546,
      threePointPercentage: 0.317,
      freeThrowPercentage: 0.706,
      turnovers: 2.2,
      trueShootingPercentage: 0.616,
      usageRate: 24.3,
    },
    scoutingNotes:
      'Powerful, productive frontcourt player who rebounds, protects the rim, and brings more passing feel than most interior scorers. He has a real winning-player profile, though teams will still sort out whether his defensive role translates cleanly enough against NBA spacing.',
  }),
  buildDraftClassPlayer({
    rank: 40,
    name: 'Braden Smith',
    college: 'Purdue',
    age: 22.9,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 72,
    wingspan: 74,
    weight: 170,
    athleticism: 6,
    stats: {
      points: 15.1,
      rebounds: 3.8,
      assists: 8.8,
      steals: 1.8,
      blocks: 0.2,
      fieldGoalPercentage: 0.487,
      threePointPercentage: 0.419,
      freeThrowPercentage: 0.769,
      turnovers: 3.0,
    },
    scoutingNotes:
      'Ultra-skilled lead guard with elite passing volume, real shooting touch, and the kind of decision-making that can organize an offense. Size and defensive matchup issues cap the upside, but the offensive IQ is strong enough to keep him in the draft mix.',
  }),
  buildDraftClassPlayer({
    rank: 41,
    name: 'JT Toppin',
    college: 'Texas Tech',
    age: 21.02,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 81,
    wingspan: 83,
    weight: 230,
    athleticism: 7,
    stats: {
      points: 21.8,
      rebounds: 10.8,
      assists: 2.1,
      steals: 1.4,
      blocks: 1.7,
      fieldGoalPercentage: 0.548,
      threePointPercentage: 0.281,
      freeThrowPercentage: 0.579,
      turnovers: 2.5,
      trueShootingPercentage: 0.571,
      usageRate: 31.2,
    },
    scoutingNotes:
      'Relentlessly productive scoring four who overwhelms college matchups with energy, rebounding, and interior touch. The stat line is loud, but the NBA question is how well the game scales if the jumper and defensive versatility never quite catch up.',
  }),
  buildDraftClassPlayer({
    rank: 42,
    name: 'Juke Harris',
    college: 'Wake Forest',
    age: 20.91,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 79,
    wingspan: 81,
    weight: 200,
    athleticism: 8,
    stats: {
      points: 21.3,
      rebounds: 6.7,
      assists: 1.7,
      steals: 1.3,
      blocks: 0.2,
      fieldGoalPercentage: 0.441,
      threePointPercentage: 0.329,
      freeThrowPercentage: 0.78,
      turnovers: 1.7,
    },
    scoutingNotes:
      'Big scoring wing with real foul-drawing juice, midrange comfort, and enough size to keep developing as a two-way perimeter player. The upside case is driven by the shotmaking package, while passing feel and efficiency determine whether he becomes more than a scorer-first bet.',
  }),
  buildDraftClassPlayer({
    rank: 43,
    name: 'Richie Saunders',
    college: 'BYU',
    age: 24.75,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 77,
    wingspan: 79,
    weight: 200,
    athleticism: 6,
    stats: {
      points: 18.0,
      rebounds: 5.8,
      assists: 2.1,
      steals: 1.7,
      blocks: 0.3,
      fieldGoalPercentage: 0.489,
      threePointPercentage: 0.376,
      freeThrowPercentage: 0.817,
      turnovers: 1.6,
      trueShootingPercentage: 0.632,
      usageRate: 24.4,
    },
    scoutingNotes:
      'Older wing who scores efficiently, shoots it well enough, and makes enough hustle plays to project as a role-ready option. The age limits upside, but the offensive efficiency and low-maintenance role fit are exactly what some teams want late.',
  }),
  buildDraftClassPlayer({
    rank: 44,
    name: 'Alex Karaban',
    college: 'UConn',
    age: 23.61,
    competitionLevel: 'NCAA High-Major',
    position: 'Forward',
    height: 79.75,
    wingspan: 83,
    weight: 219,
    athleticism: 6,
    stats: {
      points: 12.9,
      rebounds: 5.3,
      assists: 2.2,
      steals: 0.9,
      blocks: 0.9,
      fieldGoalPercentage: 0.479,
      threePointPercentage: 0.4,
      freeThrowPercentage: 0.846,
      turnovers: 1.0,
      trueShootingPercentage: 0.601,
      usageRate: 17.9,
    },
    scoutingNotes:
      'Smart stretch forward whose calling card is shooting, feel, and clean role-player translatability on good teams. He is not a high-end tools bet, but the floor as a connective frontcourt spacer is easy to see.',
  }),
  buildDraftClassPlayer({
    rank: 45,
    name: 'Dash Daniels',
    college: 'Melbourne United',
    age: 18.5,
    competitionLevel: 'International Pro',
    position: 'Shooting Guard',
    height: 78,
    wingspan: 80,
    weight: 199,
    athleticism: 8,
    stats: {
      points: 5.6,
      rebounds: 3.1,
      assists: 1.3,
      steals: 1.1,
      blocks: 0.1,
      fieldGoalPercentage: 0.455,
      threePointPercentage: 0.333,
      freeThrowPercentage: 0.4,
      turnovers: 0.8,
      trueShootingPercentage: 0.499,
      usageRate: 15.8,
    },
    scoutingNotes:
      'Young Australian guard-wing with defensive instincts, good size, and long-term two-way upside that matters more than the current counting stats. He is a pure tools-and-development swing right now, but the age and archetype will keep teams interested.',
  }),
  buildDraftClassPlayer({
    rank: 46,
    name: 'JoJo Tugler',
    college: 'Houston',
    age: 21.1,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 80,
    wingspan: 84,
    weight: 230,
    athleticism: 8,
    stats: {
      points: 8.0,
      rebounds: 5.2,
      assists: 1.1,
      steals: 1.3,
      blocks: 1.5,
      fieldGoalPercentage: 0.599,
      threePointPercentage: 0,
      freeThrowPercentage: 0.689,
      turnovers: 1.2,
      trueShootingPercentage: 0.619,
      usageRate: 17.2,
    },
    scoutingNotes:
      'Defensive playmaker in the frontcourt who flies around, creates stocks, and fits the kind of hard-playing energy role coaches trust. The offense remains limited, but he has a real path if the defensive impact is as loud against pro athletes as it is in college.',
  }),
  buildDraftClassPlayer({
    rank: 47,
    name: 'Alex Condon',
    college: 'Florida',
    age: 21.9,
    competitionLevel: 'NCAA High-Major',
    position: 'Power Forward',
    height: 84.5,
    wingspan: 84.75,
    weight: 222,
    athleticism: 7,
    stats: {
      points: 14.8,
      rebounds: 7.6,
      assists: 3.6,
      steals: 0.7,
      blocks: 1.4,
      fieldGoalPercentage: 0.545,
      threePointPercentage: 0.157,
      freeThrowPercentage: 0.651,
      turnovers: 2.4,
    },
    scoutingNotes:
      'Tall, mobile big with real passing value and enough defensive activity to fit a modern frontcourt. He does a lot of the connective stuff NBA teams like, but the jumper and overall scoring efficiency still have to stabilize for the ceiling to rise.',
  }),
  buildDraftClassPlayer({
    rank: 48,
    name: 'Ryan Conwell',
    college: 'Louisville',
    age: 22.01,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 76,
    wingspan: 78,
    weight: 215,
    athleticism: 6,
    stats: {
      points: 18.6,
      rebounds: 4.7,
      assists: 2.5,
      steals: 1.2,
      blocks: 0.2,
      fieldGoalPercentage: 0.408,
      threePointPercentage: 0.35,
      freeThrowPercentage: 0.854,
      turnovers: 2.1,
      trueShootingPercentage: 0.57,
      usageRate: 29.3,
    },
    scoutingNotes:
      'High-volume perimeter scorer whose role is built on shotmaking, deep range, and the ability to bend defenses with movement or pull-up threes. He looks like a bench-scoring archetype unless he adds more across-the-board value than just buckets.',
  }),
  buildDraftClassPlayer({
    rank: 49,
    name: 'Paul McNeil Jr.',
    college: 'NC State',
    age: 20.17,
    competitionLevel: 'NCAA High-Major',
    position: 'Shooting Guard',
    height: 77,
    wingspan: 79,
    weight: 190,
    athleticism: 7,
    stats: {
      points: 13.5,
      rebounds: 3.6,
      assists: 0.8,
      steals: 0.6,
      blocks: 0.4,
      fieldGoalPercentage: 0.429,
      threePointPercentage: 0.419,
      freeThrowPercentage: 0.823,
      turnovers: 0.5,
      trueShootingPercentage: 0.628,
      usageRate: 19.9,
    },
    scoutingNotes:
      'Pure shooting specialist with real gravity, clean touch indicators, and the kind of low-turnover off-ball value that keeps wings draftable. The question is whether the rest of the profile is robust enough for him to stay on the floor when the jumper is not carrying the night.',
  }),
  buildDraftClassPlayer({
    rank: 50,
    name: 'Tarris Reed Jr.',
    college: 'UConn',
    age: 22.87,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 83,
    wingspan: 86,
    weight: 265,
    athleticism: 6,
    stats: {
      points: 13.8,
      rebounds: 8.0,
      assists: 2.2,
      steals: 1.0,
      blocks: 2.1,
      fieldGoalPercentage: 0.638,
      threePointPercentage: 0,
      freeThrowPercentage: 0.559,
      turnovers: 1.9,
      trueShootingPercentage: 0.629,
      usageRate: 25.4,
    },
    scoutingNotes:
      'Power center with real rim protection, interior efficiency, and enough touch to punish switches or seals. He projects more as a role-specific backup big than a modern offensive hub, but the size and defensive utility are real.',
  }),
  buildDraftClassPlayer({
    rank: 51,
    name: 'Motiejus Krivas',
    college: 'Arizona',
    age: 21.55,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 86,
    wingspan: 89,
    weight: 260,
    athleticism: 5,
    stats: {
      points: 10.8,
      rebounds: 8.2,
      assists: 1.0,
      steals: 0.7,
      blocks: 1.8,
      fieldGoalPercentage: 0.588,
      threePointPercentage: 0.364,
      freeThrowPercentage: 0.797,
      turnovers: 1.4,
      trueShootingPercentage: 0.655,
      usageRate: 18.3,
    },
    scoutingNotes:
      'Huge interior big with touch, strong foul-drawing numbers, and enough shooting promise to keep him from being a pure throwback center. The main concern is how much mobility and defensive range he can offer when the game speeds up.',
  }),
  buildDraftClassPlayer({
    rank: 52,
    name: 'Rueben Chinyelu',
    college: 'Florida',
    age: 22.72,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 82,
    wingspan: 85,
    weight: 265,
    athleticism: 6,
    stats: {
      points: 11.5,
      rebounds: 11.8,
      assists: 0.7,
      steals: 0.7,
      blocks: 1.0,
      fieldGoalPercentage: 0.603,
      threePointPercentage: 0,
      freeThrowPercentage: 0.684,
      turnovers: 1.5,
      trueShootingPercentage: 0.624,
      usageRate: 19.8,
    },
    scoutingNotes:
      'Glass-cleaning interior big who runs, finishes, and rebounds at a rate that always gets attention in the second round. The role is narrow, but he brings enough strength and motor to project as a situational energy center.',
  }),
  buildDraftClassPlayer({
    rank: 53,
    name: 'Milan Momcilovic',
    college: 'Iowa State',
    age: 21.74,
    competitionLevel: 'NCAA High-Major',
    position: 'Forward',
    height: 80,
    wingspan: 82,
    weight: 225,
    athleticism: 6,
    stats: {
      points: 17.1,
      rebounds: 3.1,
      assists: 1.0,
      steals: 0.8,
      blocks: 0.2,
      fieldGoalPercentage: 0.516,
      threePointPercentage: 0.5,
      freeThrowPercentage: 0.88,
      turnovers: 0.8,
      trueShootingPercentage: 0.705,
    },
    scoutingNotes:
      'One of the better pure shooting bets in this range, with real volume, elite efficiency, and frontcourt size. The question is how much he gives you outside of spacing, but the jumper is good enough to make him a real draftable specialist.',
  }),
  buildDraftClassPlayer({
    rank: 54,
    name: 'Bruce Thornton',
    college: 'Ohio State',
    age: 22.76,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 74,
    wingspan: 76,
    weight: 215,
    athleticism: 6,
    stats: {
      points: 20.1,
      rebounds: 5.2,
      assists: 3.9,
      steals: 1.2,
      blocks: 0.2,
      fieldGoalPercentage: 0.558,
      threePointPercentage: 0.397,
      freeThrowPercentage: 0.819,
      turnovers: 1.2,
      trueShootingPercentage: 0.667,
    },
    scoutingNotes:
      'Strong, polished scoring guard who plays at his own pace and checks a lot of the efficiency boxes teams want from older backcourt prospects. He feels more like an NBA-ready reserve guard than a long-run upside swing, but that archetype has value.',
  }),
  buildDraftClassPlayer({
    rank: 55,
    name: 'Jaden Bradley',
    college: 'Arizona',
    age: 22.76,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 75,
    wingspan: 77,
    weight: 205,
    athleticism: 7,
    stats: {
      points: 13.3,
      rebounds: 3.6,
      assists: 4.5,
      steals: 1.6,
      blocks: 0.1,
      fieldGoalPercentage: 0.46,
      threePointPercentage: 0.382,
      freeThrowPercentage: 0.801,
      turnovers: 1.8,
      trueShootingPercentage: 0.564,
      usageRate: 21.2,
    },
    scoutingNotes:
      'Two-way point guard with good pace, strong foul pressure, and defensive instincts that give him a cleaner role path than some other older guards. The offense is more steady than dynamic, but he has the profile of a useful backup if the jumper holds.',
  }),
  buildDraftClassPlayer({
    rank: 56,
    name: 'Tamin Lipsey',
    college: 'Iowa State',
    age: 22.99,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 73,
    wingspan: 74,
    weight: 200,
    athleticism: 6,
    stats: {
      points: 13.2,
      rebounds: 4.0,
      assists: 5.0,
      steals: 2.2,
      blocks: 0,
      fieldGoalPercentage: 0.463,
      threePointPercentage: 0.3,
      freeThrowPercentage: 0.66,
      turnovers: 1.4,
      trueShootingPercentage: 0.539,
      usageRate: 21.6,
    },
    scoutingNotes:
      'Defense-first lead guard with disruptive hands, great care for the ball, and enough passing feel to run a second unit. His NBA case is built on winning plays and point-of-attack pressure more than scoring upside.',
  }),
  buildDraftClassPlayer({
    rank: 57,
    name: 'Miles Byrd',
    college: 'San Diego State',
    age: 21.78,
    competitionLevel: 'NCAA Mid-Major',
    position: 'Shooting Guard',
    height: 78,
    wingspan: 82,
    weight: 182,
    athleticism: 7,
    stats: {
      points: 10.6,
      rebounds: 4.5,
      assists: 2.7,
      steals: 1.9,
      blocks: 1.2,
      fieldGoalPercentage: 0.409,
      threePointPercentage: 0.333,
      freeThrowPercentage: 0.805,
      turnovers: 1.9,
      trueShootingPercentage: 0.537,
      usageRate: 21.3,
    },
    scoutingNotes:
      'Long, disruptive wing whose stocks, feel, and toolsy defensive profile stand out more than the raw scoring numbers. He is the kind of lower-usage upside wing teams talk themselves into because the role versatility is easy to imagine.',
  }),
  buildDraftClassPlayer({
    rank: 58,
    name: 'Keyshawn Hall',
    college: 'Auburn',
    age: 23.2,
    competitionLevel: 'NCAA High-Major',
    position: 'Small Forward',
    height: 79,
    wingspan: 81,
    weight: 225,
    athleticism: 6,
    stats: {
      points: 19.8,
      rebounds: 6.7,
      assists: 2.6,
      steals: 0.7,
      blocks: 0.6,
      fieldGoalPercentage: 0.447,
      threePointPercentage: 0.382,
      freeThrowPercentage: 0.857,
      turnovers: 2.5,
      trueShootingPercentage: 0.609,
      usageRate: 27.2,
    },
    scoutingNotes:
      'Older scoring wing with real foul-drawing skill, solid shotmaking, and enough size to slot into bench-offense roles. The age and defense keep the ceiling modest, but the scoring package is real enough to make him a live second-round name.',
  }),
  buildDraftClassPlayer({
    rank: 59,
    name: 'Nate Bittle',
    college: 'Oregon',
    age: 23.05,
    competitionLevel: 'NCAA High-Major',
    position: 'Center',
    height: 84,
    wingspan: 86,
    weight: 250,
    athleticism: 6,
    stats: {
      points: 16.9,
      rebounds: 6.7,
      assists: 2.4,
      steals: 0.6,
      blocks: 2.1,
      fieldGoalPercentage: 0.458,
      threePointPercentage: 0.346,
      freeThrowPercentage: 0.741,
      turnovers: 2.0,
      trueShootingPercentage: 0.575,
      usageRate: 29.3,
    },
    scoutingNotes:
      'Skilled seven-footer with floor-spacing flashes, real rim protection, and enough passing to fit modern offensive concepts. Health, physicality, and whether the efficiency can hold against better athletes are the biggest swing factors.',
  }),
  buildDraftClassPlayer({
    rank: 60,
    name: 'Milos Uzan',
    college: 'Houston',
    age: 23.48,
    competitionLevel: 'NCAA High-Major',
    position: 'Point Guard',
    height: 76.5,
    wingspan: 77.25,
    weight: 186,
    athleticism: 6,
    stats: {
      points: 11.5,
      rebounds: 2.5,
      assists: 4.1,
      steals: 1.0,
      blocks: 0.1,
      fieldGoalPercentage: 0.393,
      threePointPercentage: 0.352,
      freeThrowPercentage: 0.759,
      turnovers: 1.3,
      trueShootingPercentage: 0.512,
      usageRate: 19.5,
    },
    scoutingNotes:
      'Steady veteran guard with low-turnover pick-and-roll management, enough shooting to keep defenses honest, and a generally clean floor-game profile. He feels more like a system backup than a high-ceiling creator, but there is a path to usefulness.',
  }),
].map((player, index) => ({
  ...player,
  tags: ['2026 draft', 'top 60', 'second round snapshot', `rank ${index + 31}`],
}));

export const TOP_60_2026_DRAFT_CLASS: DraftClassPlayerSeed[] = [
  ...TOP_2026_DRAFT_CLASS.map((player) => ({
    ...player,
    tags: Array.from(new Set([...player.tags, 'top 60'])),
  })),
  ...SECOND_ROUND_2026_DRAFT_CLASS,
];
