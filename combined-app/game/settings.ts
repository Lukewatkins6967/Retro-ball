export type AppTheme = 'modern' | 'retroArcade' | 'darkMode' | 'neonCyber' | 'classicSports' | 'minimalist';
export type DifficultyPreset = 'easy' | 'normal' | 'hard' | 'extreme';
export type GameSpeedPreset = 'slow' | 'normal' | 'fast';
export type StaminaImpactPreset = 'low' | 'medium' | 'high';
export type SalaryCapPreset = 'soft' | 'hard';
export type InjuryFrequencyPreset = 'off' | 'low' | 'high';
export type AiAggressivenessPreset = 'low' | 'medium' | 'high';

export type GameSettings = {
  theme: AppTheme;
  difficulty: DifficultyPreset;
  gameSpeed: GameSpeedPreset;
  autoSubstitutions: boolean;
  arcadeBalance: number;
  staminaImpact: StaminaImpactPreset;
  salaryCapStrictness: SalaryCapPreset;
  injuryFrequency: InjuryFrequencyPreset;
  aiAggressiveness: AiAggressivenessPreset;
  sfxVolume: number;
  musicVolume: number;
};

export const SETTINGS_STORAGE_KEY = 'combinedAppSettings_v1';

export const defaultGameSettings: GameSettings = {
  theme: 'modern',
  difficulty: 'normal',
  gameSpeed: 'normal',
  autoSubstitutions: true,
  arcadeBalance: 58,
  staminaImpact: 'medium',
  salaryCapStrictness: 'hard',
  injuryFrequency: 'low',
  aiAggressiveness: 'medium',
  sfxVolume: 72,
  musicVolume: 48,
};

let cachedSettings: GameSettings = { ...defaultGameSettings };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function asEnum<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

export function normalizeGameSettings(raw: unknown): GameSettings {
  const candidate = (raw && typeof raw === 'object' ? raw : {}) as Partial<GameSettings>;
  return {
    theme: asEnum(candidate.theme, defaultGameSettings.theme, ['modern', 'retroArcade', 'darkMode', 'neonCyber', 'classicSports', 'minimalist']),
    difficulty: asEnum(candidate.difficulty, defaultGameSettings.difficulty, ['easy', 'normal', 'hard', 'extreme']),
    gameSpeed: asEnum(candidate.gameSpeed, defaultGameSettings.gameSpeed, ['slow', 'normal', 'fast']),
    autoSubstitutions: typeof candidate.autoSubstitutions === 'boolean' ? candidate.autoSubstitutions : defaultGameSettings.autoSubstitutions,
    arcadeBalance: clamp(Number.isFinite(candidate.arcadeBalance) ? Number(candidate.arcadeBalance) : defaultGameSettings.arcadeBalance, 0, 100),
    staminaImpact: asEnum(candidate.staminaImpact, defaultGameSettings.staminaImpact, ['low', 'medium', 'high']),
    salaryCapStrictness: asEnum(candidate.salaryCapStrictness, defaultGameSettings.salaryCapStrictness, ['soft', 'hard']),
    injuryFrequency: asEnum(candidate.injuryFrequency, defaultGameSettings.injuryFrequency, ['off', 'low', 'high']),
    aiAggressiveness: asEnum(candidate.aiAggressiveness, defaultGameSettings.aiAggressiveness, ['low', 'medium', 'high']),
    sfxVolume: clamp(Number.isFinite(candidate.sfxVolume) ? Number(candidate.sfxVolume) : defaultGameSettings.sfxVolume, 0, 100),
    musicVolume: clamp(Number.isFinite(candidate.musicVolume) ? Number(candidate.musicVolume) : defaultGameSettings.musicVolume, 0, 100),
  };
}

export function loadGameSettings(): GameSettings {
  if (typeof window === 'undefined') return cachedSettings;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    cachedSettings = normalizeGameSettings(raw ? JSON.parse(raw) : defaultGameSettings);
  } catch {
    cachedSettings = { ...defaultGameSettings };
  }
  return cachedSettings;
}

export function saveGameSettings(settings: GameSettings) {
  cachedSettings = normalizeGameSettings(settings);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cachedSettings));
  } catch {
    // Ignore storage issues.
  }
}

export function setCurrentSettings(settings: GameSettings) {
  cachedSettings = normalizeGameSettings(settings);
}

export function getCurrentSettings(): GameSettings {
  return cachedSettings;
}

export function applySettingsToDocument(settings: GameSettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
}

export function getDifficultyTuning(settings = getCurrentSettings()) {
  switch (settings.difficulty) {
    case 'easy':
      return {
        tradeAcceptanceBias: 0.08,
        negotiationBias: 0.09,
        userSimScoreBoost: 4,
        aiSimScoreBoost: -1,
        userShotBoost: 0.06,
        aiShotBoost: -0.03,
        userStealBoost: 0.08,
        aiStealBoost: -0.03,
        aiAggressionBoost: -0.08,
        performanceSpread: 0.05,
      };
    case 'hard':
      return {
        tradeAcceptanceBias: -0.06,
        negotiationBias: -0.08,
        userSimScoreBoost: -2,
        aiSimScoreBoost: 3,
        userShotBoost: -0.03,
        aiShotBoost: 0.04,
        userStealBoost: -0.04,
        aiStealBoost: 0.05,
        aiAggressionBoost: 0.08,
        performanceSpread: -0.04,
      };
    case 'extreme':
      return {
        tradeAcceptanceBias: -0.12,
        negotiationBias: -0.13,
        userSimScoreBoost: -4,
        aiSimScoreBoost: 5,
        userShotBoost: -0.06,
        aiShotBoost: 0.08,
        userStealBoost: -0.07,
        aiStealBoost: 0.1,
        aiAggressionBoost: 0.16,
        performanceSpread: -0.08,
      };
    default:
      return {
        tradeAcceptanceBias: 0,
        negotiationBias: 0,
        userSimScoreBoost: 0,
        aiSimScoreBoost: 0,
        userShotBoost: 0,
        aiShotBoost: 0,
        userStealBoost: 0,
        aiStealBoost: 0,
        aiAggressionBoost: 0,
        performanceSpread: 0,
      };
  }
}

export function getGameSpeedMultiplier(settings = getCurrentSettings()) {
  if (settings.gameSpeed === 'fast') return 1.28;
  if (settings.gameSpeed === 'slow') return 0.84;
  return 1;
}

export function getSimPaceFromSettings(settings = getCurrentSettings()): GameSpeedPreset {
  return settings.gameSpeed;
}

export function getArcadeBalanceBias(settings = getCurrentSettings()) {
  return (settings.arcadeBalance - 50) / 50;
}

export function getStaminaImpactMultiplier(settings = getCurrentSettings()) {
  if (settings.staminaImpact === 'low') return 0.82;
  if (settings.staminaImpact === 'high') return 1.18;
  return 1;
}

export function getCapAllowance(settings = getCurrentSettings()) {
  return settings.salaryCapStrictness === 'soft' ? 16_000 : 0;
}

export function getAiAggressionMultiplier(settings = getCurrentSettings()) {
  if (settings.aiAggressiveness === 'low') return 0.86;
  if (settings.aiAggressiveness === 'high') return 1.18;
  return 1;
}

export function getVolumeScale(kind: 'sfx' | 'music', settings = getCurrentSettings()) {
  return (kind === 'sfx' ? settings.sfxVolume : settings.musicVolume) / 100;
}
