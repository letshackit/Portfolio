/**
 * What each credential looks like as an object. Text on the badges is a short mark derived from the credential's own
 * title and issuer (content.ts holds the real words, rendered as DOM beside the badge); nothing here is copy.
 */
export type BadgeKind = 'hero' | 'stone' | 'cert' | 'paper';

/** The silhouette of the glass. `hex` is the default certification; the others keep five certifications from looking alike. */
export type BodyKey = 'hero' | 'stone' | 'paper' | 'hex' | 'octa' | 'shield' | 'disc' | 'square';

export type Motif = 'lattice' | 'cube' | 'gantt' | 'knot' | 'cloud' | 'shield' | 'orbit' | 'page';

export interface BadgeSpec {
  readonly id: string;
  readonly kind: BadgeKind;
  readonly body: BodyKey;
  readonly motif: Motif;
  /** Small line above the mark, and the mark itself. Empty for the publication, which carries none. */
  readonly top: string;
  readonly main: string;
}

const SPECS: Readonly<Record<string, Omit<BadgeSpec, 'id'>>> = {
  pgp: { kind: 'hero', body: 'hero', motif: 'lattice', top: 'IIIT-B', main: 'AI · ML' },
  bca: { kind: 'stone', body: 'stone', motif: 'cube', top: 'ASB', main: 'BCA' },
  'google-pm': { kind: 'cert', body: 'square', motif: 'gantt', top: 'GOOGLE', main: 'PM' },
  'ibm-python': { kind: 'cert', body: 'hex', motif: 'knot', top: 'IBM', main: 'PYTHON' },
  'niit-cloud': { kind: 'cert', body: 'octa', motif: 'cloud', top: 'NIIT', main: 'CLOUD' },
  iso27001: { kind: 'cert', body: 'shield', motif: 'shield', top: 'ISO/IEC', main: '27001' },
  ga360: { kind: 'cert', body: 'disc', motif: 'orbit', top: 'GOOGLE', main: 'GA360' },
  'blue-brain': { kind: 'paper', body: 'paper', motif: 'page', top: '', main: '' },
};

export function specFor(id: string, issuer: string): BadgeSpec {
  const known = SPECS[id];
  if (known) return { id, ...known };
  return { id, kind: 'cert', body: 'hex', motif: 'orbit', top: issuer.toUpperCase().slice(0, 8), main: id.toUpperCase().slice(0, 6) };
}

/** Longest side of the object, as a fraction of the slot's shorter side: leaves air for the reticle ring around it. */
export const FILL: Readonly<Record<BadgeKind, number>> = { hero: 0.86, stone: 0.78, cert: 0.78, paper: 0.86 };
