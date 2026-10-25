import { useRef } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { useOffscreenPause } from '../lib/useOffscreenPause';

export type DotTone = 'amber' | 'cyan';

interface LiveDotProps {
  readonly tone: DotTone;
  readonly hollow?: boolean;
  /** Work is running: adds the pulse ring, unless reduced motion is on (FR-79, FR-118). */
  readonly live?: boolean;
}

/** Status dot (B.4). The ring only exists when live and motion is allowed; it pauses while the tab is hidden or the dot is off screen (NFR-10). */
export function LiveDot({ tone, hollow = false, live = false }: LiveDotProps) {
  const { reducedMotion } = usePrefs();
  const ref = useRef<HTMLSpanElement>(null);
  const paused = useOffscreenPause(ref);
  const pulsing = live && !reducedMotion;
  return (
    <span
      ref={ref}
      className="live-dot"
      data-tone={tone}
      data-hollow={hollow || undefined}
      data-live={pulsing || undefined}
      data-paused={pulsing && paused ? '' : undefined}
      aria-hidden="true"
    />
  );
}
