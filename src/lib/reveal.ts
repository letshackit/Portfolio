/**
 * Reveal contract (architecture B.5 and E.4, ADR-007). This file ships in the entry chunk and contains no GSAP:
 * it names the markup attributes and loads the motion chunk when, and only when, motion is allowed.
 *
 * FR-7: nothing in CSS or markup hides text. `lib/motion.ts` sets the from-state at the moment it animates.
 */
import { useEffect, useRef } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { useUi } from '../app/providers/uiContext';
import { isProgrammaticFocus } from './scroll';
import { afterFirstPaint } from './visibility';

export type RevealKind = 'lines' | 'block';

export const REVEAL_ATTRIBUTE = 'data-reveal';
export const REVEAL_SELECTOR = `[${REVEAL_ATTRIBUTE}]`;

/** Props to spread on an element that should reveal when scrolled into view. */
export function revealProps(kind: RevealKind): { readonly 'data-reveal': RevealKind } {
  return { 'data-reveal': kind };
}

export interface MotionOptions {
  /** Return false to stop the smoother from scrolling a focused element into view (palette open). */
  readonly allowFocusScroll: () => boolean;
  /** Called after every ScrollTrigger refresh: pins and fonts have moved the sections, so a hash landing may need redoing. */
  readonly onLayout?: () => void;
}

export interface MotionHandle {
  dispose(): void;
}

/**
 * Load and start the motion chunk after first paint, and only once `enabled` (the boot screen has ended). Never imports under reduced motion. Re-runs, with a full
 * dispose first, when reduced motion, the desktop breakpoint or the pointer type changes (ADR-007).
 * Failure to load leaves a fully visible static page.
 */
export function useMotion(enabled = true, onLayout?: () => void): void {
  const { reducedMotion, isDesktop, pointerFine } = usePrefs();
  const { paletteOpen } = useUi();
  const paletteOpenRef = useRef(paletteOpen);
  const onLayoutRef = useRef(onLayout);
  useEffect(() => {
    paletteOpenRef.current = paletteOpen;
    onLayoutRef.current = onLayout;
  }, [paletteOpen, onLayout]);

  useEffect(() => {
    if (reducedMotion || !enabled) return;
    let disposed = false;
    let handle: MotionHandle | null = null;
    const cancelPaint = afterFirstPaint(() => {
      import('./motion')
        .then((mod) => {
          if (disposed) return;
          handle = mod.startMotion({
            allowFocusScroll: () => !paletteOpenRef.current && !isProgrammaticFocus(),
            onLayout: () => onLayoutRef.current?.(),
          });
        })
        .catch(() => {
          // The chunk failed to load: the page stays static and readable (FR-7).
        });
    });
    return () => {
      disposed = true;
      cancelPaint();
      handle?.dispose();
    };
  }, [enabled, reducedMotion, isDesktop, pointerFine]);
}
