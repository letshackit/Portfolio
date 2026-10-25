/**
 * Weak-GPU watchdog (architecture C.3, assumption A-2). Framework-free. Feed it every rendered frame's delta in
 * seconds. After a warm-up it averages frame time; a slow mean degrades quality once (dpr 1, fewer packets), and a
 * mean that is still too slow after that fails, so the hero falls back to the SVG.
 */

export interface WatchdogOptions {
  readonly warmupFrames: number;
  readonly windowFrames: number;
  /** Frames to ignore after a degrade, so the dpr change itself is not measured. */
  readonly settleFrames: number;
  /** Mean frame time (ms) above which quality is degraded. */
  readonly degradeMs: number;
  /** Mean frame time (ms) above which, after degrading, the 3D is abandoned. */
  readonly failMs: number;
  /** Deltas longer than this (ms) are a paused loop resuming, not a slow frame; they are ignored. */
  readonly maxDeltaMs: number;
  readonly onDegrade: () => void;
  readonly onFail: () => void;
}

export const WATCHDOG_DEFAULTS = {
  warmupFrames: 30,
  windowFrames: 180,
  settleFrames: 10,
  degradeMs: 33,
  failMs: 40,
  maxDeltaMs: 250,
} as const;

export interface FrameWatchdog {
  tick(deltaSeconds: number): void;
}

type Phase = 'first' | 'second' | 'done';

export function createWatchdog(options: Pick<WatchdogOptions, 'onDegrade' | 'onFail'> & Partial<WatchdogOptions>): FrameWatchdog {
  const o: WatchdogOptions = { ...WATCHDOG_DEFAULTS, ...options };
  let phase: Phase = 'first';
  let skip = o.warmupFrames;
  let frames = 0;
  let total = 0;

  return {
    tick(deltaSeconds) {
      if (phase === 'done') return;
      const ms = deltaSeconds * 1000;
      if (ms > o.maxDeltaMs) return;
      if (skip > 0) {
        skip -= 1;
        return;
      }
      total += ms;
      frames += 1;
      if (frames < o.windowFrames) return;
      const mean = total / frames;
      frames = 0;
      total = 0;
      if (phase === 'first') {
        if (mean <= o.degradeMs) {
          phase = 'done';
          return;
        }
        phase = 'second';
        skip = o.settleFrames;
        o.onDegrade();
      } else {
        phase = 'done';
        if (mean > o.failMs) o.onFail();
      }
    },
  };
}
