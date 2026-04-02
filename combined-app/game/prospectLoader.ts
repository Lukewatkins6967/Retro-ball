import { TOP_2026_DRAFT_CLASS } from '../src/lib/draft-class-2026';
import type { CompetitionLevel, Prospect, ProspectCategories, ProspectPosition, Rating10 } from './types';
import { deriveOverall100 } from './ratings';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function scaleTo10(value: number, min: number, max: number): Rating10 {
  if (!Number.isFinite(value)) return 5;
  const t = (value - min) / (max - min);
  return clamp(Math.round(1 + t * 9), 1, 10);
}

function avg(...values: Array<number | null | undefined>) {
  const cleaned = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (cleaned.length === 0) return null;
  return cleaned.reduce((a, b) => a + b, 0) / cleaned.length;
}

function to10OrNull(value: number | null | undefined): Rating10 | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return clamp(Math.round(value), 1, 10) as Rating10;
}

function roundTo(value: number, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function deriveCategoriesFromRaw(raw: any): ProspectCategories {
  const stats = raw?.stats ?? {};
  const traditionalRatings = raw?.traditionalRatings ?? {};
  const scoutingGrades = raw?.scoutingGrades ?? {};

  const fg = typeof stats.fieldGoalPercentage === 'number' ? stats.fieldGoalPercentage : 0.45;
  const three = typeof stats.threePointPercentage === 'number' ? stats.threePointPercentage : 0.33;
  const ft = typeof stats.freeThrowPercentage === 'number' ? stats.freeThrowPercentage : 0.75;
  const shotPctGrade = avg(
    scaleTo10(fg, 0.35, 0.62),
    scaleTo10(three, 0.22, 0.48),
    scaleTo10(ft, 0.65, 0.9),
  );

  const jumpShotGrade = to10OrNull(traditionalRatings.jumpShot);
  const shotCreationGrade = to10OrNull(scoutingGrades.shotCreation);
  const shotDifficultyGrade = to10OrNull(scoutingGrades.shotDifficulty);
  const finishingToughnessGrade = to10OrNull(scoutingGrades.finishingToughness);
  const shooting = clamp(
    Math.round(avg(shotPctGrade, jumpShotGrade, shotCreationGrade, shotDifficultyGrade, finishingToughnessGrade) ?? 5),
    1,
    10,
  ) as Rating10;

  const athleticismGrade = clamp(
    Math.round(typeof raw?.athleticism === 'number' ? raw.athleticism : 5),
    1,
    10,
  ) as Rating10;
  const quicknessGrade = to10OrNull(traditionalRatings.quickness);
  const motorGrade = to10OrNull(scoutingGrades.motor);
  const physicalityGrade = to10OrNull(scoutingGrades.physicality);
  const speed = clamp(
    Math.round(avg(athleticismGrade, quicknessGrade, motorGrade, physicalityGrade) ?? 5),
    1,
    10,
  ) as Rating10;

  const assists = typeof stats.assists === 'number' ? stats.assists : 2;
  const assistsGrade = scaleTo10(assists, 0.8, 6.5);

  const passingGrade = to10OrNull(traditionalRatings.passing);
  const ballHandlingGrade = to10OrNull(traditionalRatings.ballHandling);
  const handleGrade = to10OrNull(scoutingGrades.handle);
  const decisionMakingGrade = to10OrNull(scoutingGrades.decisionMaking);

  const playmaking = clamp(
    Math.round(
      avg(
        assistsGrade,
        passingGrade,
        ballHandlingGrade,
        handleGrade,
        decisionMakingGrade,
        shotCreationGrade,
      ) ?? 5,
    ),
    1,
    10,
  ) as Rating10;

  const steals = typeof stats.steals === 'number' ? stats.steals : 0.6;
  const blocks = typeof stats.blocks === 'number' ? stats.blocks : 0.4;
  const stealsGrade = scaleTo10(steals, 0, 2.0);
  const blocksGrade = scaleTo10(blocks, 0, 2.0);

  const defensiveDisciplineGrade = to10OrNull(scoutingGrades.defensiveDiscipline);
  const defenseGrade = to10OrNull(traditionalRatings.defense);
  const motorGrade2 = to10OrNull(scoutingGrades.motor);
  const physicalityGrade2 = to10OrNull(scoutingGrades.physicality);
  const competitionRatingGrade = to10OrNull(scoutingGrades.competitionRating);
  const strengthGrade = to10OrNull(traditionalRatings.strength);
  const quicknessGrade2 = to10OrNull(traditionalRatings.quickness);

  const defense = clamp(
    Math.round(
      avg(
        stealsGrade,
        blocksGrade,
        defensiveDisciplineGrade,
        defenseGrade,
        strengthGrade,
        quicknessGrade2,
        motorGrade2,
        physicalityGrade2,
        competitionRatingGrade,
      ) ?? 5,
    ),
    1,
    10,
  ) as Rating10;

  return { shooting, speed, playmaking, defense };
}

function deriveOverall(opts: { categories: ProspectCategories; rank: number; datasetPotential: Rating10 | null }): number {
  const { categories, rank, datasetPotential } = opts;
  return deriveOverall100({
    categories,
    rankBias: clamp((34 - rank) / 34, 0, 1) * 0.95,
    potentialBias: datasetPotential ? (datasetPotential - 5.5) * 0.16 : 0,
  });
}

function derivePotential(opts: { categories: ProspectCategories; age: number; datasetPotential: Rating10 | null }): Rating10 {
  const { categories, age, datasetPotential } = opts;
  const ageGrowth = clamp((24 - age) / 6, 0, 1);

  const current =
    0.35 * categories.shooting +
    0.25 * categories.playmaking +
    0.2 * categories.speed +
    0.2 * categories.defense;

  let potential = current * 0.7 + ageGrowth * 10 * 0.3;
  if (datasetPotential) potential = potential * 0.6 + datasetPotential * 0.4;

  return clamp(Math.round(potential), 1, 10) as Rating10;
}

const GENERATED_FIRST_NAMES = [
  'Jalen', 'Malik', 'Darius', 'Cam', 'Elijah', 'Zion', 'Trey', 'Nico', 'Jayden', 'Kobe',
  'Andre', 'Micah', 'Tyrese', 'Isaiah', 'Devin', 'Khalil', 'Jordan', 'Xavier', 'Myles', 'Noah',
  'Caden', 'Bryce', 'Jabari', 'Keon', 'RJ', 'Emoni', 'Tariq', 'Desmond', 'Avery', 'Omari',
  'Luca', 'Sincere', 'Terrance', 'Nasir', 'Quinton', 'Aidan', 'Javon', 'Cory', 'Roman', 'Kylan',
  'Sterling', 'Donovan', 'Ezekiel', 'Parker', 'Tobias', 'Dante', 'Jeremiah', 'Keenan', 'Amari', 'Collin',
];

const GENERATED_LAST_NAMES = [
  'Holloway', 'Vaughn', 'Mercer', 'Ellison', 'Boone', 'Carter', 'Simmons', 'Hale', 'Bishop', 'Winters',
  'Dalton', 'Cross', 'Gaines', 'Foster', 'Sharpe', 'Madden', 'Rivers', 'Monroe', 'Sutton', 'Keaton',
  'Whitaker', 'Temple', 'Rowe', 'Morrison', 'Bennett', 'Coleman', 'Dennis', 'Pryor', 'Tate', 'Hampton',
  'Mathis', 'Caldwell', 'Love', 'Branch', 'Merritt', 'Beck', 'Parker', 'Sampson', 'Thornton', 'Dunlap',
  'Rutherford', 'Hines', 'Goodwin', 'Nash', 'Benton', 'Bradford', 'Conley', 'Prince', 'Keller', 'Bynum',
];

const GENERATED_SCHOOLS = [
  'Westlake', 'Summit State', 'Metro Tech', 'Coastal A&M', 'Ridgeview', 'Bay City', 'Redwood', 'Prairie State',
  'Crescent', 'Northern Union', 'Canyon', 'Capitol', 'Stonebridge', 'Lakeside', 'Liberty Prep', 'Eastfield',
  'Blue Harbor', 'Sun Valley', 'Cedar Tech', 'Mason State', 'Great Plains', 'Oakridge', 'Southport', 'Highland Prep',
  'North Coast', 'River City', 'Atlantic Union', 'Twin Pines', 'Frontier State', 'Desert Valley', 'Kingsport', 'Evergreen',
];

type GeneratedArchetype = {
  key: string;
  label: string;
  positions: ProspectPosition[];
  competitionLevels: CompetitionLevel[];
  skillRanges: {
    shooting: [number, number];
    speed: [number, number];
    playmaking: [number, number];
    defense: [number, number];
  };
  athleticism: [number, number];
  age: [number, number];
  height: [number, number];
  weight: [number, number];
  wingspanBonus: [number, number];
  statRanges: {
    assists: [number, number];
    steals: [number, number];
    blocks: [number, number];
    fieldGoalPercentage: [number, number];
    threePointPercentage: [number, number];
    freeThrowPercentage: [number, number];
  };
  tags: string[];
  notes: string[];
};

const GENERATED_ARCHETYPES: GeneratedArchetype[] = [
  {
    key: 'shot-creator',
    label: 'Shot Creator',
    positions: ['Point Guard', 'Shooting Guard'],
    competitionLevels: ['NCAA High-Major', 'International Pro', 'G League / OTE'],
    skillRanges: { shooting: [7, 10], speed: [6, 9], playmaking: [6, 9], defense: [3, 7] },
    athleticism: [6, 9],
    age: [18, 22],
    height: [74, 78],
    weight: [180, 210],
    wingspanBonus: [3, 7],
    statRanges: {
      assists: [3.2, 6.8],
      steals: [0.7, 1.8],
      blocks: [0.1, 0.8],
      fieldGoalPercentage: [0.42, 0.56],
      threePointPercentage: [0.33, 0.44],
      freeThrowPercentage: [0.74, 0.9],
    },
    tags: ['creator', 'scorer'],
    notes: ['can get to his pull-up whenever he wants', 'warps coverages with downhill pressure', 'already looks comfortable carrying offense'],
  },
  {
    key: 'floor-general',
    label: 'Floor General',
    positions: ['Point Guard'],
    competitionLevels: ['NCAA High-Major', 'NCAA Mid-Major', 'International Pro'],
    skillRanges: { shooting: [5, 8], speed: [5, 8], playmaking: [8, 10], defense: [4, 7] },
    athleticism: [5, 8],
    age: [19, 23],
    height: [72, 77],
    weight: [175, 205],
    wingspanBonus: [2, 5],
    statRanges: {
      assists: [5.4, 8.7],
      steals: [0.8, 1.9],
      blocks: [0.0, 0.5],
      fieldGoalPercentage: [0.43, 0.53],
      threePointPercentage: [0.3, 0.4],
      freeThrowPercentage: [0.72, 0.88],
    },
    tags: ['playmaker', 'lead-guard'],
    notes: ['controls tempo like a veteran', 'sees early windows other guards miss', 'keeps an offense organized under pressure'],
  },
  {
    key: 'three-and-d-wing',
    label: '3-and-D Wing',
    positions: ['Shooting Guard', 'Small Forward'],
    competitionLevels: ['NCAA High-Major', 'Prep / EYBL', 'International Pro'],
    skillRanges: { shooting: [6, 9], speed: [6, 9], playmaking: [3, 6], defense: [7, 10] },
    athleticism: [6, 9],
    age: [18, 22],
    height: [76, 81],
    weight: [190, 225],
    wingspanBonus: [5, 9],
    statRanges: {
      assists: [1.2, 3.6],
      steals: [1.0, 2.1],
      blocks: [0.4, 1.3],
      fieldGoalPercentage: [0.44, 0.58],
      threePointPercentage: [0.34, 0.43],
      freeThrowPercentage: [0.72, 0.87],
    },
    tags: ['wing', 'two-way'],
    notes: ['projects as a clean fit around stars', 'flies around passing lanes and closes hard', 'already brings pro wing measurements'],
  },
  {
    key: 'slasher',
    label: 'Slasher',
    positions: ['Shooting Guard', 'Small Forward'],
    competitionLevels: ['Prep / EYBL', 'NCAA High-Major', 'G League / OTE'],
    skillRanges: { shooting: [3, 7], speed: [8, 10], playmaking: [4, 7], defense: [4, 8] },
    athleticism: [8, 10],
    age: [18, 21],
    height: [75, 80],
    weight: [185, 220],
    wingspanBonus: [4, 8],
    statRanges: {
      assists: [2.0, 4.5],
      steals: [0.7, 1.7],
      blocks: [0.2, 0.8],
      fieldGoalPercentage: [0.46, 0.6],
      threePointPercentage: [0.24, 0.36],
      freeThrowPercentage: [0.65, 0.82],
    },
    tags: ['slasher', 'athlete'],
    notes: ['puts relentless rim pressure on a defense', 'wins with burst and body control', 'changes games when the pace opens up'],
  },
  {
    key: 'two-way-forward',
    label: 'Two-Way Forward',
    positions: ['Small Forward', 'Power Forward'],
    competitionLevels: ['NCAA High-Major', 'International Pro', 'NCAA Mid-Major'],
    skillRanges: { shooting: [5, 8], speed: [5, 8], playmaking: [4, 7], defense: [7, 10] },
    athleticism: [5, 8],
    age: [19, 23],
    height: [78, 82],
    weight: [205, 235],
    wingspanBonus: [5, 9],
    statRanges: {
      assists: [1.8, 4.1],
      steals: [0.8, 1.8],
      blocks: [0.5, 1.5],
      fieldGoalPercentage: [0.45, 0.57],
      threePointPercentage: [0.29, 0.39],
      freeThrowPercentage: [0.68, 0.84],
    },
    tags: ['forward', 'two-way'],
    notes: ['covers multiple frontcourt matchups comfortably', 'stacks winning plays without needing the ball', 'brings real lineup flexibility on both ends'],
  },
  {
    key: 'stretch-big',
    label: 'Stretch Big',
    positions: ['Power Forward', 'Center'],
    competitionLevels: ['NCAA High-Major', 'International Pro', 'NCAA Mid-Major'],
    skillRanges: { shooting: [6, 9], speed: [3, 6], playmaking: [3, 6], defense: [5, 8] },
    athleticism: [3, 6],
    age: [19, 23],
    height: [80, 85],
    weight: [220, 255],
    wingspanBonus: [4, 9],
    statRanges: {
      assists: [1.0, 3.2],
      steals: [0.4, 1.2],
      blocks: [0.8, 2.0],
      fieldGoalPercentage: [0.46, 0.59],
      threePointPercentage: [0.32, 0.42],
      freeThrowPercentage: [0.7, 0.88],
    },
    tags: ['big', 'stretch'],
    notes: ['opens the floor with real pick-and-pop gravity', 'forces centers to defend in space', 'has modern size-and-skill appeal'],
  },
  {
    key: 'rim-protector',
    label: 'Rim Protector',
    positions: ['Center'],
    competitionLevels: ['NCAA High-Major', 'International Youth', 'International Pro'],
    skillRanges: { shooting: [2, 5], speed: [3, 7], playmaking: [2, 5], defense: [8, 10] },
    athleticism: [4, 8],
    age: [18, 22],
    height: [82, 87],
    weight: [225, 270],
    wingspanBonus: [7, 12],
    statRanges: {
      assists: [0.5, 2.1],
      steals: [0.3, 1.0],
      blocks: [1.8, 3.6],
      fieldGoalPercentage: [0.51, 0.66],
      threePointPercentage: [0.18, 0.32],
      freeThrowPercentage: [0.56, 0.76],
    },
    tags: ['big', 'defense'],
    notes: ['changes shots just by being around the rim', 'owns standout length and timing', 'profiles as a paint anchor early'],
  },
  {
    key: 'point-forward',
    label: 'Point Forward',
    positions: ['Small Forward', 'Power Forward'],
    competitionLevels: ['NCAA High-Major', 'International Pro', 'Prep / EYBL'],
    skillRanges: { shooting: [4, 8], speed: [5, 8], playmaking: [7, 10], defense: [4, 8] },
    athleticism: [5, 8],
    age: [18, 22],
    height: [78, 83],
    weight: [205, 240],
    wingspanBonus: [4, 8],
    statRanges: {
      assists: [4.0, 7.2],
      steals: [0.8, 1.7],
      blocks: [0.3, 1.1],
      fieldGoalPercentage: [0.43, 0.56],
      threePointPercentage: [0.28, 0.39],
      freeThrowPercentage: [0.68, 0.86],
    },
    tags: ['forward', 'connector'],
    notes: ['creates from the elbows and short roll', 'sees the floor like a jumbo guard', 'can shift lineup construction around his passing'],
  },
];

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: string) {
  return hashSeed(seed) / 4294967295;
}

function seededInt(seed: string, min: number, max: number) {
  return Math.floor(seededUnit(seed) * (max - min + 1)) + min;
}

function seededFloat(seed: string, min: number, max: number) {
  return min + seededUnit(seed) * (max - min);
}

function seededPick<T>(seed: string, items: T[]): T {
  return items[seededInt(seed, 0, items.length - 1)];
}

function buildGeneratedName(index: number, seasonIndex: number) {
  const first = GENERATED_FIRST_NAMES[(index * 7 + seasonIndex * 11) % GENERATED_FIRST_NAMES.length];
  const last = GENERATED_LAST_NAMES[(index * 13 + seasonIndex * 17) % GENERATED_LAST_NAMES.length];
  return `${first} ${last}`;
}

function buildGeneratedSchool(index: number, seasonIndex: number) {
  return GENERATED_SCHOOLS[(index * 3 + seasonIndex * 7) % GENERATED_SCHOOLS.length];
}

function buildGeneratedSkill(seed: string, range: [number, number], quality: number, volatility = 1) {
  const base = seededInt(seed, range[0], range[1]);
  const qualityBoost = Math.round(quality * 2);
  const swing = seededInt(`${seed}:swing`, -volatility, volatility);
  return clamp(base + qualityBoost + swing, 1, 10) as Rating10;
}

function strongestSkillLabel(categories: ProspectCategories) {
  const entries: Array<[keyof ProspectCategories, number]> = [
    ['shooting', categories.shooting],
    ['speed', categories.speed],
    ['playmaking', categories.playmaking],
    ['defense', categories.defense],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? 'shooting';
}

function buildGeneratedProspect(base: any, seasonIndex: number, classSize: number) {
  const rank = Number(base.rank ?? 0);
  const seedBase = `${seasonIndex}:${rank}:${String(base.name)}`;
  const quality = clamp((classSize - Math.max(rank, 1)) / Math.max(classSize - 1, 1), 0, 1);
  const archetype = seededPick(`${seedBase}:archetype`, GENERATED_ARCHETYPES);

  const name = buildGeneratedName(rank || 0, seasonIndex);
  const college = buildGeneratedSchool(rank || 0, seasonIndex);
  const position = seededPick(`${seedBase}:position`, archetype.positions);
  const competitionLevel = seededPick(`${seedBase}:competition`, archetype.competitionLevels);
  const age = seededInt(`${seedBase}:age`, archetype.age[0], archetype.age[1]);
  const height = seededInt(`${seedBase}:height`, archetype.height[0], archetype.height[1]);
  const wingspan = height + seededInt(`${seedBase}:wingspan`, archetype.wingspanBonus[0], archetype.wingspanBonus[1]);
  const weight = seededInt(`${seedBase}:weight`, archetype.weight[0], archetype.weight[1]);

  const categories: ProspectCategories = {
    shooting: buildGeneratedSkill(`${seedBase}:shooting`, archetype.skillRanges.shooting, quality),
    speed: buildGeneratedSkill(`${seedBase}:speed`, archetype.skillRanges.speed, quality),
    playmaking: buildGeneratedSkill(`${seedBase}:playmaking`, archetype.skillRanges.playmaking, quality),
    defense: buildGeneratedSkill(`${seedBase}:defense`, archetype.skillRanges.defense, quality),
  };

  const athleticism = clamp(
    Math.round(avg(categories.speed, seededInt(`${seedBase}:athleticism`, archetype.athleticism[0], archetype.athleticism[1])) ?? 6),
    1,
    10,
  );

  const finishingToughness = clamp(Math.round(avg(categories.speed, categories.shooting, categories.defense) ?? 6), 1, 10);
  const handle = clamp(Math.round(avg(categories.playmaking, categories.speed) ?? 6), 1, 10);
  const decisionMaking = clamp(Math.round(avg(categories.playmaking, categories.defense, 6) ?? 6), 1, 10);
  const motor = clamp(Math.round(avg(categories.defense, categories.speed, seededInt(`${seedBase}:motor`, 5, 9)) ?? 6), 1, 10);
  const physicality = clamp(
    Math.round(avg(categories.defense, height >= 80 ? 7 : 5, weight >= 225 ? 7 : 5) ?? 6),
    1,
    10,
  );
  const upsideBias = clamp(
    Math.round(
      avg(
        Math.max(categories.shooting, categories.speed, categories.playmaking, categories.defense),
        age <= 19 ? 9 : age <= 21 ? 7 : 5,
        seededInt(`${seedBase}:upside`, 5, 10),
      ) ?? 7,
    ),
    1,
    10,
  ) as Rating10;

  const raw = {
    ...base,
    name,
    college,
    competitionLevel,
    position,
    age,
    athleticism,
    height,
    wingspan,
    weight,
    stats: {
      assists: roundTo(
        seededFloat(`${seedBase}:assists`, archetype.statRanges.assists[0], archetype.statRanges.assists[1]) +
          Math.max(0, categories.playmaking - 6) * 0.25,
      ),
      steals: roundTo(
        seededFloat(`${seedBase}:steals`, archetype.statRanges.steals[0], archetype.statRanges.steals[1]) +
          Math.max(0, categories.defense - 7) * 0.08,
      ),
      blocks: roundTo(
        seededFloat(`${seedBase}:blocks`, archetype.statRanges.blocks[0], archetype.statRanges.blocks[1]) +
          Math.max(0, categories.defense - 7) * (height >= 80 ? 0.12 : 0.04),
      ),
      fieldGoalPercentage: clamp(
        roundTo(
          seededFloat(`${seedBase}:fg`, archetype.statRanges.fieldGoalPercentage[0], archetype.statRanges.fieldGoalPercentage[1]) +
            (finishingToughness - 6) * 0.01,
          3,
        ),
        0.35,
        0.68,
      ),
      threePointPercentage: clamp(
        roundTo(
          seededFloat(`${seedBase}:three`, archetype.statRanges.threePointPercentage[0], archetype.statRanges.threePointPercentage[1]) +
            (categories.shooting - 6) * 0.01,
          3,
        ),
        0.2,
        0.48,
      ),
      freeThrowPercentage: clamp(
        roundTo(
          seededFloat(`${seedBase}:ft`, archetype.statRanges.freeThrowPercentage[0], archetype.statRanges.freeThrowPercentage[1]) +
            (categories.shooting - 6) * 0.008,
          3,
        ),
        0.58,
        0.94,
      ),
    },
    traditionalRatings: {
      jumpShot: categories.shooting,
      quickness: categories.speed,
      passing: categories.playmaking,
      ballHandling: handle,
      defense: categories.defense,
      strength: physicality,
      potential: upsideBias,
    },
    scoutingGrades: {
      shotCreation: clamp(Math.round(avg(categories.shooting, categories.playmaking, categories.speed) ?? 6), 1, 10),
      shotDifficulty: clamp(Math.round(avg(categories.shooting, categories.speed) ?? 6), 1, 10),
      finishingToughness,
      motor,
      physicality,
      handle,
      decisionMaking,
      defensiveDiscipline: clamp(Math.round(avg(categories.defense, decisionMaking) ?? 6), 1, 10),
      competitionRating: clamp(
        Math.round(
          avg(
            competitionLevel === 'NCAA High-Major' || competitionLevel === 'International Pro' ? 8 : 6,
            quality * 10,
            categories.defense,
          ) ?? 7,
        ),
        1,
        10,
      ),
    },
    tags: [
      'draft',
      archetype.key,
      ...archetype.tags,
      ...(quality >= 0.78 ? ['blue-chip'] : []),
      ...(upsideBias >= 9 ? ['high-upside'] : []),
    ],
    scoutingNotes: `${name} is a ${archetype.label.toLowerCase()} ${position.toLowerCase()} from ${college} who ${seededPick(
      `${seedBase}:note`,
      archetype.notes,
    )}. Scouts feel best about the ${strongestSkillLabel(categories)} translating early.`,
  };

  return raw;
}

export function loadDraftProspects(seasonIndex = 1): Prospect[] {
  const raw = TOP_2026_DRAFT_CLASS as any[];

  return raw.map((p) => {
    const rank = Number(p.rank ?? 0);
    const rawWithSeasonFlavor = seasonIndex > 1 ? buildGeneratedProspect(p, seasonIndex, raw.length) : p;

    const categories = deriveCategoriesFromRaw(rawWithSeasonFlavor);
    const datasetPotential = to10OrNull(rawWithSeasonFlavor?.traditionalRatings?.potential);

    const prospect: Prospect = {
      id: `${seasonIndex}-${String(rawWithSeasonFlavor.name)}-${rank}`,
      name: String(rawWithSeasonFlavor.name),
      college: String(rawWithSeasonFlavor.college ?? ''),
      competitionLevel: (rawWithSeasonFlavor.competitionLevel as CompetitionLevel) ?? 'NCAA Mid-Major',
      position: String(rawWithSeasonFlavor.position ?? ''),
      age: Number(rawWithSeasonFlavor.age ?? 0),
      rank,
      athleticism: Number(rawWithSeasonFlavor.athleticism ?? 5),
      height: Number(rawWithSeasonFlavor.height ?? 0),
      wingspan: Number(rawWithSeasonFlavor.wingspan ?? 0),
      weight: Number(rawWithSeasonFlavor.weight ?? 0),
      categories,
      overall: deriveOverall({ categories, rank, datasetPotential }),
      potential: derivePotential({
        categories,
        age: Number(rawWithSeasonFlavor.age ?? 0),
        datasetPotential,
      }),
      tags: Array.isArray(rawWithSeasonFlavor.tags) ? rawWithSeasonFlavor.tags.map(String) : ['draft'],
      scoutingNotes: typeof rawWithSeasonFlavor.scoutingNotes === 'string' ? rawWithSeasonFlavor.scoutingNotes : undefined,
    };

    return prospect;
  });
}
