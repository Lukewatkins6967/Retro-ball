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

  const raw = clamp(base + (opts.rankBias ?? 0) + (opts.potentialBias ?? 0), 1, 10);
  const normalized = Math.pow((raw - 1) / 9, 1.18);
  return clamp(Math.round(42 + normalized * 56), 42, 98);
}
