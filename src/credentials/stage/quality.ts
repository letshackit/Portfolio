/**
 * Quality tiers for the vault. The adaptive monitor steps down one at a time and never back up: first pixels, then the
 * anti-aliasing and particles, last the glass itself (transmission becomes a cheap translucent shell). Framework-free.
 */
export type Tier = 0 | 1 | 2;

export interface Quality {
  readonly dpr: number;
  readonly msaa: number;
  /** Real refraction of what is behind the glass. Off on the last tier. */
  readonly transmission: boolean;
  readonly noise: boolean;
  /** Multiplier on the particle count. */
  readonly particles: number;
}

export const TIERS: readonly Quality[] = [
  { dpr: 2, msaa: 4, transmission: true, noise: true, particles: 1 },
  { dpr: 1.5, msaa: 2, transmission: true, noise: true, particles: 0.5 },
  { dpr: 1, msaa: 0, transmission: false, noise: false, particles: 0.25 },
];

export const LAST_TIER: Tier = 2;

/** The vault is tall (it holds every credential), so the pixel count, not the ratio alone, is what has to be bounded. */
export const PIXEL_BUDGET = 4_200_000;

export function startTier(narrow: boolean, coarse: boolean): Tier {
  return narrow || coarse ? 1 : 0;
}

export function stepDown(tier: Tier): Tier {
  return tier >= LAST_TIER ? LAST_TIER : ((tier + 1) as Tier);
}

/** Device pixel ratio for the canvas at this tier: the tier's cap, the device's, and what the pixel budget allows. */
export function dprFor(tier: Tier, deviceRatio: number, width: number, height: number): number {
  const area = Math.max(1, width * height);
  const budget = Math.sqrt(PIXEL_BUDGET / area);
  return Math.max(1, Math.min(deviceRatio, TIERS[tier].dpr, budget));
}
