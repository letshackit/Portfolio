/**
 * Quality tiers for the stage. The adaptive monitor steps down one tier at a time: first pixels (dpr, the mirror pass,
 * shadow size), then particles (drones, packets, sparkles), then the film grain. Anti-aliasing is never off: the last
 * tier keeps 2x MSAA. Framework-free.
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
  /** Size of the key light's shadow map (shadow on the floor). */
  readonly keyRes: number;
  readonly drones: number;
  /** Packets riding each satellite beam (0..4). */
  readonly packets: number;
  /** Multiplier on the sparkle counts. */
  readonly sparkles: number;
  readonly noise: boolean;
}

export const TIERS: readonly Quality[] = [
  { dpr: 2, msaa: 8, reflect: 768, shadowRes: 512, keyRes: 2048, drones: 6, packets: 4, sparkles: 1, noise: true },
  { dpr: 1.5, msaa: 4, reflect: 384, shadowRes: 256, keyRes: 1024, drones: 4, packets: 2, sparkles: 0.5, noise: true },
  { dpr: 1, msaa: 2, reflect: 0, shadowRes: 256, keyRes: 512, drones: 2, packets: 0, sparkles: 0, noise: false },
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
