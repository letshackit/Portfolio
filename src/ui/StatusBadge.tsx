import type { ReactNode } from 'react';
import type { BadgeVariant } from './badgeVariant';
import { LiveDot } from './LiveDot';

interface StatusBadgeProps {
  readonly variant: BadgeVariant;
  readonly children: ReactNode;
  readonly size?: 'md' | 'lg';
}

/** Amber with a pulsing dot when the work is live; neutral with a solid or hollow cyan dot otherwise (FR-73). */
export function StatusBadge({ variant, children, size = 'md' }: StatusBadgeProps) {
  const live = variant === 'live';
  return (
    <span className="status-badge" data-variant={variant} data-size={size}>
      <LiveDot tone={live ? 'amber' : 'cyan'} hollow={variant === 'hollow'} live={live} />
      {children}
    </span>
  );
}
