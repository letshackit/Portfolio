/**
 * Quality tiers for the capability stage. The adaptive monitor steps down one tier at a time (pixels, then the star
 * field and grain, then the bloom) and never back up. Framework-free.
 */
export type Tier = 0 | 1 | 2;

export interface Quality {
  readonly dpr: number;
  readonly msaa: number;
  readonly bloom: boolean;
  readonly noise: boolean;
  readonly stars: number;
  readonly sphereSegments: number;
}

export const TIERS: readonly Quality[] = [
  { dpr: 2, msaa: 4, bloom: true, noise: true, stars: 520, sphereSegments: 20 },
  { dpr: 1.5, msaa: 2, bloom: true, noise: false, stars: 300, sphereSegments: 14 },
  { dpr: 1, msaa: 0, bloom: false, noise: false, stars: 140, sphereSegments: 10 },
];

export const LAST_TIER: Tier = 2;

export function startTier(coarse: boolean): Tier {
  return coarse ? 1 : 0;
}

export function stepDown(tier: Tier): Tier {
  return tier >= LAST_TIER ? LAST_TIER : ((tier + 1) as Tier);
}

export function dprFor(tier: Tier, deviceRatio: number): number {
  return Math.max(1, Math.min(deviceRatio, TIERS[tier].dpr));
}

/** `?quality=high|mid|low` pins a tier (QA, screenshots); anything else adapts. */
export function pinnedTier(search: string): Tier | null {
  const value = new URLSearchParams(search).get('quality');
  return value === 'high' ? 0 : value === 'mid' ? 1 : value === 'low' ? LAST_TIER : null;
}
