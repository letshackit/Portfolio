import { Color, MathUtils } from 'three';
import { smoothstep, store } from '../../store';
import { BLOCKS, RISE_DURATION, type BlockDef } from './layout';
import { clamp01, easeOutBack, easeOutCubic, easeOutQuad } from './ease';

/** Distance below the floor a block starts from. */
export const START_RISE = -9;
export const BASE_Y = -0.05;

/** Scene-clock second a drone docked on each block, or -1. The only per-block mutable state; everything else is a function of time. */
export const dockedAt: number[] = BLOCKS.map(() => -1);
/** Whether each block has been counted as assembled (the status bar). */
const counted: boolean[] = BLOCKS.map(() => false);

export function resetBlockStates(): void {
  dockedAt.fill(-1);
  counted.fill(false);
}

/** Scene-clock second at which a block is far enough up to be docked on. */
export function readyAt(b: BlockDef): number {
  return b.delay + RISE_DURATION * 0.8;
}

export const COLORS = {
  cyan: new Color('#22D3EE'),
  cyanDim: new Color('#0a3c48'),
  amber: new Color('#F59E0B'),
  amberHot: new Color('#FFB020'),
  white: new Color('#d8fbff'),
};

/**
 * How bright the city is allowed to get. The hero is about the person in front of it, so the skyline sits well below
 * the avatar's rim light: edges and cores are scaled by this, amber docking flashes by the second value.
 */
export const GLOW = { city: 0.55, amber: 0.8 };

/**
 * Wall-clock start of the city (set once the scene content has mounted). The assembly is a pure function of wall time,
 * not of rendered frames and not of GSAP's ticker, so a slow frame or a long stall never stretches or freezes it.
 */
export const clock = { start: 0 };
export function sceneNow(): number {
  return clock.start ? (performance.now() - clock.start) / 1000 : 0;
}

/** Values of one block at scene time `t`. */
export interface BlockLook {
  /** Vertical offset from the resting position. */
  rise: number;
  /** Bright flash when the block snaps into place. */
  flash: number;
  /** Amber glow while, and just after, a drone docked on it. */
  amber: number;
  /** 0 = scaffold, 1 = built (rests at a brighter cyan). */
  built: number;
}

const BUILT_FALLBACK = 3.5;

/** Time-based look of a block. Reduced motion is the finished city: risen, built, no flash, no amber. */
export function blockLook(b: BlockDef, t: number, out: BlockLook): BlockLook {
  if (store.reduced) {
    out.rise = 0;
    out.flash = 0;
    out.amber = 0;
    out.built = 1;
    if (!counted[b.id]) {
      counted[b.id] = true;
      store.assembled += 1;
    }
    return out;
  }
  const up = clamp01((t - b.delay) / RISE_DURATION);
  out.rise = START_RISE * (1 - easeOutBack(up));
  if (up >= 1 && !counted[b.id]) {
    counted[b.id] = true;
    store.assembled += 1;
  }
  const landed = b.delay + RISE_DURATION;
  out.flash = up >= 1 ? 1 - easeOutCubic(clamp01((t - landed) / 0.9)) : 0;
  const docked = dockedAt[b.id];
  out.amber = docked >= 0 ? 1 - easeOutQuad(clamp01((t - docked) / 1.7)) : 0;
  // Built once a drone has docked, or a few seconds after landing for a block no drone has visited.
  const since = docked >= 0 ? t - docked : t - landed - BUILT_FALLBACK;
  out.built = easeOutQuad(clamp01(since / 0.8));
  return out;
}

/** Line-up amount 0..1 for the scroll beat: heights tidy to one level and the rows open up. */
export function lineUpAmount(): number {
  return smoothstep(0.5, 0.92, store.progress);
}

/** Current height of a block, which the drones dock on top of. */
export function blockHeight(b: BlockDef): number {
  return MathUtils.lerp(b.h, b.tidyH, lineUpAmount());
}
