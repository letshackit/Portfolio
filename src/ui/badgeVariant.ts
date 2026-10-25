import type { DeploymentStatus } from '../data/content.types';

export type BadgeVariant = 'live' | 'solid' | 'hollow';

export function badgeVariantFor(status: DeploymentStatus): BadgeVariant {
  switch (status) {
    case 'UAT':
    case 'In development':
      return 'live';
    case 'Prototype delivered':
      return 'solid';
    case 'Scoping':
      return 'hollow';
  }
}
