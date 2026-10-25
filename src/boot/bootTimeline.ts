import { TIMING } from '../config';
import type { BootTag } from '../data/content.types';

/** Gap between lines appearing (architecture E.1). */
export const LINE_INTERVAL_MS = 150;
/** Delay before a line's pending tag flips to its final tag and shows its value. */
export const LINE_RESOLVE_MS = 100;
/** Fade-out length once the boot ends, by timeout or by skip. */
export const FADE_MS = 200;

export const TAG_TEXT: Record<BootTag | 'pending', string> = {
  boot: '[boot]',
  ok: '[ ok ]',
  run: '[ run]',
  pending: '[ .. ]',
};

export interface BootSchedule {
  /** When line i appears, in ms from mount. */
  readonly appear: readonly number[];
  /** When line i resolves. */
  readonly resolve: readonly number[];
  readonly headline: number;
  /** When the fade starts (state `ending`). */
  readonly ending: number;
  /** When the screen unmounts; at most 2000 ms (FR-16). */
  readonly done: number;
}

export function bootSchedule(lineCount: number): BootSchedule {
  const appear = Array.from({ length: lineCount }, (_, i) => i * LINE_INTERVAL_MS);
  return {
    appear,
    resolve: appear.map((t) => t + LINE_RESOLVE_MS),
    headline: TIMING.bootHeadlinePrint,
    ending: TIMING.bootTotal - FADE_MS,
    done: TIMING.bootTotal,
  };
}

/** Keys that alone do not count as "any key" (FR-17). */
export function isModifierOnly(key: string): boolean {
  return key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta';
}
