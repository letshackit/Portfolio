import { Color } from 'three';

export { clamp01, smoothstep } from './timeline';

/** Deterministic pseudo-random numbers: the scene must look the same on every load, and in every screenshot. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export function easeOutBack(t: number, overshoot = 1.6): number {
  const c3 = overshoot + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + overshoot * u * u;
}

/** Window of a 0..1 value: 0 before `a`, 1 after `b`. */
export const range = (v: number, a: number, b: number): number => Math.min(1, Math.max(0, (v - a) / (b - a)));

/** Palette. HDR multipliers above 1 are what the bloom picks up. */
export const COLORS = {
  cyan: new Color('#22d3ee'),
  cyanHi: new Color('#67e8f9'),
  cyanDeep: new Color('#0891b2'),
  amber: new Color('#f59e0b'),
  amberHi: new Color('#fbbf24'),
  white: new Color('#ffffff'),
  ink: new Color('#0b1a20'),
  graphite: new Color('#191c20'),
} as const;

export const BG = '#07080a';

export interface Density {
  /** Multiplier on instance counts. */
  readonly k: number;
}
