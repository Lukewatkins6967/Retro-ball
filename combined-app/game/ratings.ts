import type { ProspectCategories } from './types';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function overallToTenScale(overall: number) {
  return clamp(overall / 10, 1, 10);
}

export function isStarOverall(overall: number) {
  return overall >= 90;
}

export function isImpactOverall(overall: number) {
  return overall >= 84;
}

export function deriveOverall100(opts: {
  categories: ProspectCategories;
  rankBias?: number;
  potentialBias?: number;
}) {
  const base =
    0.38 * opts.categories.shooting +
    0.24 * opts.categories.playmaking +
    0.14 * opts.categories.speed +
    0.24 * opts.categories.defense;
  const sortedSkills = [
    opts.categories.shooting,
    opts.categories.playmaking,
    opts.categories.speed,
    opts.categories.defense,
  ].sort((a, b) => b - a);
  const peakSkillBoost = clamp((sortedSkills[0] - 7) * 0.18 + (sortedSkills[1] - 6.5) * 0.1, 0, 0.7);
  const twoWayBoost = clamp(Math.min(opts.categories.shooting, opts.categories.defense) - 5.5, 0, 3) * 0.06;
  const weaknessPenalty = clamp(5 - Math.min(...sortedSkills), 0, 4) * 0.08;
  const talent = clamp(
    base + (opts.rankBias ?? 0) * 1.35 + (opts.potentialBias ?? 0) * 0.9 + peakSkillBoost + twoWayBoost - weaknessPenalty,
    1,
    10.8,
  );

  if (talent >= 8.8) {
    const starNorm = clamp((talent - 8.8) / 2, 0, 1);
    return clamp(Math.round(85 + starNorm * 13), 85, 98);
  }

  if (talent >= 7.2) {
    const starterNorm = clamp((talent - 7.2) / 1.6, 0, 1);
    return clamp(Math.round(75 + starterNorm * 9), 75, 84);
  }

  if (talent >= 5.6) {
    const benchNorm = clamp((talent - 5.6) / 1.6, 0, 1);
    return clamp(Math.round(65 + benchNorm * 9), 65, 74);
  }

  const projectNorm = clamp((talent - 1) / 4.6, 0, 1);
  return clamp(Math.round(50 + projectNorm * 14), 50, 64);
}
