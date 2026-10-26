/**
 * Constants shared across the app. Nothing else lives here.
 * BREAKPOINTS are mirrored by hand in styles/tokens.css and the media queries; keep both in sync.
 */

export const ANCHORS = {
  top: 'top',
  howIWork: 'how-i-work',
  deployments: 'deployments',
  architecture: 'architecture',
  capabilities: 'capabilities',
  history: 'history',
  recognition: 'recognition',
  contact: 'contact',
} as const;

export type AnchorId = (typeof ANCHORS)[keyof typeof ANCHORS];

export const BREAKPOINTS = {
  /** First width that counts as "wide": 3D may load, tablet layouts. */
  wide: 768,
  /** First width that counts as "desktop": stepper as tabs, ScrollSmoother eligible. */
  desktop: 1024,
  /** First width with the largest section padding and gutter. */
  large: 1280,
} as const;

/** Gzip budgets in bytes, enforced by scripts/check-budgets.mjs (NFR-5, 6, 8, FR-141). Keep the script in step. */
export const BUDGET = {
  /** All JS except the three chunk (NFR-5). */
  jsBeforeThreeGz: 300 * 1024,
  /** The lazily loaded 3D chunk (NFR-6). */
  threeChunkGz: 400 * 1024,
  /** Narrow-screen first load, motion allowed (NFR-8). */
  narrowFirstLoadGz: 1024 * 1024,
  /** Whole built folder, raw (FR-141). */
  /** Raised from 5 MB: the avatar's glb carries 1k webp textures and a 3D portfolio justifies it. */
  distTotal: 8 * 1024 * 1024,
  /** Early-warning line for the entry chunk (architecture R-1, R-5). */
  entryWarnGz: 120 * 1024,
} as const;

/** Timing constants in milliseconds. */
export const TIMING = {
  bootTotal: 1200,
  bootHeadlinePrint: 600,
  toastVisible: 2400,
  threeLoadTimeout: 8000,
  tooltipDelay: 60,
} as const;

export const SESSION_KEYS = {
  booted: 'hs.boot',
} as const;
