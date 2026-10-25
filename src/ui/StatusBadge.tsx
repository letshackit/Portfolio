import type { ReactNode } from 'react';
import type { BadgeVariant } from './badgeVariant';
import { LiveDot } from './LiveDot';

interface StatusBadgeProps {
  readonly variant: BadgeVariant;
  readonly children: ReactNode;
  readonly size?: 'md' | 'lg';
}

export function StatusBadge({ variant, children, size = 'md' }: StatusBadgeProps) {
  return (
    <span className="status-badge" data-variant={variant} data-size={size}>
      <LiveDot tone={variant === 'live' ? 'amber' : 'cyan'} hollow={variant === 'hollow'} />
      {children}
    </span>
  );
}
