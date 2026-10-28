/**
 * How each capability domain is drawn, shared by the 3D stage and the stacked variant so both speak one visual language:
 * four Platonic solids (tetra, octa, cube, icosa), cyan for structure, amber for the AI-native domain (agent activity).
 * Framework-free. Domain ids come from the content file; an unknown id falls back to the first look.
 */
import type { CapabilityGroup } from '../data/content.types';

export type Shape = 'tetra' | 'octa' | 'cube' | 'icosa';
export type Tone = 'cyan' | 'amber';

export interface DomainLook {
  readonly shape: Shape;
  readonly tone: Tone;
}

const LOOKS: Readonly<Record<string, DomainLook>> = {
  product: { shape: 'octa', tone: 'cyan' },
  technical: { shape: 'cube', tone: 'cyan' },
  'ai-native-build': { shape: 'icosa', tone: 'amber' },
  delivery: { shape: 'tetra', tone: 'cyan' },
};

const FALLBACK: DomainLook = { shape: 'octa', tone: 'cyan' };

export function lookFor(group: Pick<CapabilityGroup, 'id'>): DomainLook {
  return LOOKS[group.id] ?? FALLBACK;
}

export function totalSkills(groups: readonly CapabilityGroup[]): number {
  return groups.reduce((sum, g) => sum + g.skills.length, 0);
}
