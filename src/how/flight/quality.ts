/**
 * Quality tiers for the flight. A performance monitor steps down one tier at a time: pixels first (dpr, MSAA), then
 * density (instances, dust, points), then the film grain. It never steps back up, so a struggling GPU settles
 * instead of oscillating. Framework-free.
 */
export type Tier = 0 | 1 | 2;

export interface Quality {
  readonly dpr: number;
  readonly msaa: number;
  /** Multiplier on instance counts (research points, pages, cards, rings). */
  readonly density: number;
  readonly dust: number;
  readonly noise: boolean;
}

export const TIERS: readonly Quality[] = [
  { dpr: 2, msaa: 4, density: 1, dust: 900, noise: true },
  { dpr: 1.5, msaa: 2, density: 0.65, dust: 520, noise: true },
  { dpr: 1, msaa: 2, density: 0.4, dust: 260, noise: false },
];

export const LAST_TIER: Tier = 2;

/** Phones and coarse pointers start one tier down. */
export function startTier(narrow: boolean, coarse: boolean): Tier {
  return narrow || coarse ? 1 : 0;
}

export function stepDown(tier: Tier): Tier {
  return tier >= LAST_TIER ? LAST_TIER : ((tier + 1) as Tier);
}

export function dprFor(tier: Tier, deviceRatio: number): number {
  return Math.max(1, Math.min(deviceRatio, TIERS[tier].dpr));
}

/** `?quality=high|mid|low` pins the tier (QA, screenshots); null adapts. */
export function pinnedQuality(search: string): Tier | null {
  const value = new URLSearchParams(search).get('quality');
  return value === 'high' ? 0 : value === 'mid' ? 1 : value === 'low' ? LAST_TIER : null;
}
