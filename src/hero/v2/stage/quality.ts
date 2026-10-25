/**
 * Quality tiers for the stage. The adaptive monitor steps down one tier at a time: first pixels (dpr, antialiasing, the
 * mirror pass), then particles (drones, packets, sparkles), then the film effects. Framework-free.
 */
export type Tier = 0 | 1 | 2;

export interface Quality {
  /** Upper bound on the device pixel ratio. */
  readonly dpr: number;
  /** Multisampling samples for the effect composer. */
  readonly msaa: number;
  /** Reflective floor render-target size; 0 = a plain glossy floor, no mirror pass. */
  readonly reflect: number;
  readonly shadowRes: number;
  readonly drones: number;
  /** Packets riding each satellite beam (0..4). */
  readonly packets: number;
  /** Multiplier on the sparkle counts. */
  readonly sparkles: number;
  readonly chroma: boolean;
  readonly noise: boolean;
}

export const TIERS: readonly Quality[] = [
  { dpr: 1.75, msaa: 4, reflect: 768, shadowRes: 512, drones: 6, packets: 4, sparkles: 1, chroma: true, noise: true },
  { dpr: 1.25, msaa: 0, reflect: 384, shadowRes: 256, drones: 4, packets: 2, sparkles: 0.5, chroma: true, noise: true },
  { dpr: 1, msaa: 0, reflect: 0, shadowRes: 256, drones: 2, packets: 0, sparkles: 0, chroma: false, noise: false },
];

export const LAST_TIER: Tier = 2;

/** Phones and coarse pointers start one tier down: a 3x display with a mirror pass is the expensive case. */
export function startTier(narrow: boolean, coarse: boolean): Tier {
  return narrow || coarse ? 1 : 0;
}

export function stepDown(tier: Tier): Tier {
  return tier >= LAST_TIER ? LAST_TIER : ((tier + 1) as Tier);
}

/** Device pixel ratio the canvas should use at this tier. */
export function dprFor(tier: Tier, deviceRatio: number): number {
  return Math.max(1, Math.min(deviceRatio, TIERS[tier].dpr));
}
