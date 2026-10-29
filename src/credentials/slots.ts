/**
 * What each credential looks like as an object. The marks are typographic wordmarks and abstract emblems set in
 * this file: no institution's logo file is shipped, and nothing here is copy (content.ts holds the real words, rendered
 * as DOM beside the object).
 */
export type BadgeKind = 'hero' | 'stone' | 'cert' | 'paper';

/** The abstract mark drawn on a medallion's face. None of them is a trademark; each is a plain diagram of the subject. */
export type Emblem = 'lattice' | 'cube' | 'gantt' | 'nodes' | 'cloud' | 'shield' | 'orbit' | 'page';

/** Accent family: `gold` is a slab with amber structure lines, `steel` one with cyan. Alternates along the row of chips. */
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
  pgp: { kind: 'hero', emblem: 'lattice', metal: 'steel', top: 'PG PROGRAM · AI / ML', word: 'IIIT-B', sub: 'IIIT BANGALORE' },
  bca: { kind: 'stone', emblem: 'cube', metal: 'steel', top: 'DEGREE · NOIDA', word: 'BCA', sub: 'COMPUTER APPLICATIONS' },
  'google-pm': { kind: 'cert', emblem: 'gantt', metal: 'gold', top: 'CERTIFICATE', word: 'GOOGLE', sub: 'PROJECT MGMT' },
  'ibm-python': { kind: 'cert', emblem: 'nodes', metal: 'steel', top: 'CERTIFICATE', word: 'IBM', sub: 'PYTHON · DATA SCI' },
  'niit-cloud': { kind: 'cert', emblem: 'cloud', metal: 'gold', top: 'CERTIFICATE', word: 'NIIT', sub: 'CLOUD COMPUTING' },
  iso27001: { kind: 'cert', emblem: 'shield', metal: 'steel', top: 'CERTIFICATE', word: 'ISO 27001', sub: 'SKILLFRONT' },
  ga360: { kind: 'cert', emblem: 'orbit', metal: 'gold', top: 'CERTIFICATE', word: 'GA360', sub: 'GOOGLE ANALYTICS' },
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

/** Slab size in world units (the slab is centred on the origin). Landscape for degrees and chips, portrait for the paper. */
export const DIM: Readonly<Record<BadgeKind, { readonly w: number; readonly h: number }>> = {
  hero: { w: 3.0, h: 2.3 },
  stone: { w: 2.3, h: 1.85 },
  cert: { w: 1.95, h: 1.5 },
  paper: { w: 1.7, h: 2.4 },
};

/** The room each slab needs, including the floating emblem, the ghost frames and the floor glow: a slot is filled to the tighter side. */
export const EXTENT: Readonly<Record<BadgeKind, { readonly w: number; readonly h: number }>> = {
  hero: { w: 3.3, h: 2.9 },
  stone: { w: 2.6, h: 2.4 },
  cert: { w: 2.2, h: 1.95 },
  paper: { w: 1.95, h: 2.9 },
};

/** Share of that room the slab may take. */
export const FILL: Readonly<Record<BadgeKind, number>> = { hero: 1, stone: 1, cert: 1, paper: 1 };

/** Where the emblem sits on the face, as fractions of the slab (y down), and its radius as a fraction of the slab's height. */
export const EMBLEM: Readonly<Record<BadgeKind, { readonly x: number; readonly y: number; readonly r: number }>> = {
  hero: { x: 0.835, y: 0.47, r: 0.14 },
  stone: { x: 0.835, y: 0.47, r: 0.14 },
  cert: { x: 0.83, y: 0.26, r: 0.13 },
  paper: { x: 0.8, y: 0.13, r: 0.07 },
};
