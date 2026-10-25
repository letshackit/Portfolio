import { useRef } from 'react';
import { content } from '../data/content';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import { LiveDot } from '../ui/LiveDot';
import './PilotBadge.css';

interface PilotBadgeProps {
  /** Rendered diameter in CSS px. The source image is 320 px, so up to 2x on a 160 px badge stays sharp. */
  readonly size?: number;
  readonly className?: string;
}

/** The circular duotone portrait for the HUD: a cyan ring that slowly sweeps, and an amber live dot. */
export function PilotBadge({ size = 56, className }: PilotBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const paused = useOffscreenPause(ref);
  return (
    <span
      ref={ref}
      className={className ? `pilot-badge ${className}` : 'pilot-badge'}
      style={{ width: size, height: size }}
      data-paused={paused ? '' : undefined}
    >
      <span className="pilot-badge__ring" aria-hidden="true" />
      <img
        className="pilot-badge__img"
        src="/portrait/harshal-badge.webp"
        width={320}
        height={320}
        alt={content.meta.name}
        decoding="async"
        draggable={false}
      />
      <span className="pilot-badge__live">
        <LiveDot tone="amber" live />
      </span>
    </span>
  );
}
