/**
 * What each credential looks like as an object. Text on the badges is a short mark derived from the credential's own
 * title and issuer (content.ts holds the real words, rendered as DOM beside the badge); nothing here is copy.
 */
export type BadgeKind = 'hero' | 'stone' | 'cert' | 'paper';

export type Motif = 'lattice' | 'cube' | 'gantt' | 'knot' | 'cloud' | 'shield' | 'orbit' | 'page';

export interface BadgeSpec {
  readonly id: string;
  readonly kind: BadgeKind;
  readonly motif: Motif;
  /** Small line above the mark, and the mark itself. Empty for the publication, which carries none. */
  readonly top: string;
  readonly main: string;
}

const SPECS: Readonly<Record<string, Omit<BadgeSpec, 'id'>>> = {
  pgp: { kind: 'hero', motif: 'lattice', top: 'IIIT-B', main: 'AI · ML' },
  bca: { kind: 'stone', motif: 'cube', top: 'ASB', main: 'BCA' },
  'google-pm': { kind: 'cert', motif: 'gantt', top: 'GOOGLE', main: 'PM' },
  'ibm-python': { kind: 'cert', motif: 'knot', top: 'IBM', main: 'PYTHON' },
  'niit-cloud': { kind: 'cert', motif: 'cloud', top: 'NIIT', main: 'CLOUD' },
  iso27001: { kind: 'cert', motif: 'shield', top: 'ISO/IEC', main: '27001' },
  ga360: { kind: 'cert', motif: 'orbit', top: 'GOOGLE', main: 'GA360' },
  'blue-brain': { kind: 'paper', motif: 'page', top: '', main: '' },
};

export function specFor(id: string, issuer: string): BadgeSpec {
  const known = SPECS[id];
  if (known) return { id, ...known };
  return { id, kind: 'cert', motif: 'orbit', top: issuer.toUpperCase().slice(0, 8), main: id.toUpperCase().slice(0, 6) };
}

/** Longest side of the object, as a fraction of the slot's shorter side: leaves air for the reticle ring around it. */
export const FILL: Readonly<Record<BadgeKind, number>> = { hero: 0.86, stone: 0.8, cert: 0.78, paper: 0.8 };
