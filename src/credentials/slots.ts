/**
 * What each credential looks like as an object. The marks are typographic wordmarks and abstract emblems set in
 * this file: no institution's logo file is shipped, and nothing here is copy (content.ts holds the real words, rendered
 * as DOM beside the object).
 */
export type BadgeKind = 'hero' | 'stone' | 'cert' | 'paper';

/** The abstract mark drawn on a medallion's face. None of them is a trademark; each is a plain diagram of the subject. */
export type Emblem = 'lattice' | 'cube' | 'gantt' | 'nodes' | 'cloud' | 'shield' | 'orbit' | 'page';

/** Rim metal: `gold` is the amber half of the palette, `steel` the cyan half. Alternates along the shelf. */
export type Metal = 'gold' | 'steel';

export interface BadgeSpec {
  readonly id: string;
  readonly kind: BadgeKind;
  readonly emblem: Emblem;
  readonly metal: Metal;
  /** Small line above the wordmark (monuments), the wordmark itself, and the line under it. */
  readonly top: string;
  readonly word: string;
  readonly sub: string;
  /** Text that runs round a medallion's rim, and what a monument or page reads as a title. */
  readonly ring: string;
}

type Known = Omit<BadgeSpec, 'id' | 'ring'>;

const SPECS: Readonly<Record<string, Known>> = {
  pgp: { kind: 'hero', emblem: 'lattice', metal: 'steel', top: 'PG PROGRAM', word: 'IIIT-B', sub: 'AI · ML' },
  bca: { kind: 'stone', emblem: 'cube', metal: 'gold', top: 'ASB · NOIDA', word: 'BCA', sub: '' },
  'google-pm': { kind: 'cert', emblem: 'gantt', metal: 'gold', top: '', word: 'GOOGLE', sub: 'PROJECT MANAGEMENT' },
  'ibm-python': { kind: 'cert', emblem: 'nodes', metal: 'steel', top: '', word: 'IBM', sub: 'PYTHON · DATA SCIENCE' },
  'niit-cloud': { kind: 'cert', emblem: 'cloud', metal: 'gold', top: '', word: 'NIIT', sub: 'CLOUD COMPUTING' },
  iso27001: { kind: 'cert', emblem: 'shield', metal: 'steel', top: '', word: 'ISO 27001', sub: 'INFORMATION SECURITY' },
  ga360: { kind: 'cert', emblem: 'orbit', metal: 'gold', top: '', word: 'GA360', sub: 'GOOGLE ANALYTICS' },
  'blue-brain': { kind: 'paper', emblem: 'page', metal: 'gold', top: 'ABS JOURNAL', word: 'BLUE BRAIN', sub: 'THE STIMULATION ALGORITHM' },
};

export function specFor(id: string, issuer: string, title = ''): BadgeSpec {
  const ring = `${title} · ${issuer}`.replace(/^ · /, '').toUpperCase();
  const known = SPECS[id];
  if (known) return { id, ring, ...known };
  return {
    id,
    ring,
    kind: 'cert',
    emblem: 'orbit',
    metal: 'gold',
    top: '',
    word: issuer.toUpperCase().slice(0, 10),
    sub: title.toUpperCase().slice(0, 24),
  };
}

/** The room each object needs, in its own units (the centre is the origin): a slot is filled to the tighter of the two. */
export const EXTENT: Readonly<Record<BadgeKind, { readonly w: number; readonly h: number }>> = {
  hero: { w: 3.1, h: 4.5 },
  stone: { w: 2.7, h: 3.5 },
  cert: { w: 2.3, h: 3.2 },
  paper: { w: 2.6, h: 3.5 },
};

/** Share of that room the object may take: leaves air for the halo and the reticle. */
export const FILL: Readonly<Record<BadgeKind, number>> = { hero: 0.98, stone: 0.94, cert: 0.96, paper: 0.94 };
