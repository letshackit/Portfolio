/** Geometry for the 18 blocks (one per TravelDesk service). Units are city-local; the group scale shrinks it onto the stage. */

export interface BlockDef {
  id: number;
  w: number;
  h: number;
  d: number;
  x: number;
  z: number;
  /** Height the block takes once the scroll beat lines the city up. */
  tidyH: number;
  /** Order in which the block rises during the assembly (0 first). */
  order: number;
  /** Seconds after the city starts at which this block starts rising. */
  delay: number;
}

export const COLS = 6;
export const ROWS = 3;
const CELL = 1.5;
const GAP = 0.22;
const PITCH = CELL + GAP;
export const RISE_DURATION = 1.15;
export const TIDY_HEIGHT = 1.35;

/** Deterministic pseudo-random in 0..1 so the skyline is the same on every load. */
function rnd(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function build(): BlockDef[] {
  const blocks: BlockDef[] = [];
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      const id = i * ROWS + j;
      // Tall at the back-left, low at the front-right, so every block stays visible from the camera.
      const back = COLS - 1 - i + (ROWS - 1 - j) * 0.9;
      blocks.push({
        id,
        w: CELL,
        h: 0.55 + back * 0.3 + rnd(id + 1) * 0.28,
        d: CELL,
        x: (i - (COLS - 1) / 2) * PITCH,
        z: (j - (ROWS - 1) / 2) * PITCH,
        tidyH: TIDY_HEIGHT,
        order: 0,
        delay: 0,
      });
    }
  }
  // Sweep the assembly across the columns, back row first inside a column.
  [...blocks]
    .sort((a, b) => a.x - b.x || a.z - b.z)
    .forEach((b, k) => {
      b.order = k;
      b.delay = 0.25 + k * 0.125;
    });
  return blocks;
}

export const BLOCKS: readonly BlockDef[] = build();
export const PLATFORM = { w: COLS * PITCH + 0.5, d: ROWS * PITCH + 0.5 };

/** Camera azimuth at the start of the scroll beat (CameraRig reads the same value from the layout). */
export const START_AZIMUTH = 0.56;

/**
 * A point on the floor placed by where it lands on screen at the start: `r` units to the right of the operator along
 * the screen's horizontal, `d` units behind him along the view direction. The stage is authored this way because the
 * start camera is 3/4, so world x and z are not screen axes.
 */
export function onStage(r: number, d: number): [number, number, number] {
  const c = Math.cos(START_AZIMUTH);
  const s = Math.sin(START_AZIMUTH);
  return [r * c - d * s, 0, -r * s - d * c];
}

export interface NodeDef {
  id: string;
  label: string;
  /** Position in the stage frame (not city-local), so the satellites can be placed by where they land on screen. */
  pos: [number, number, number];
  /** Block the beam lands on. */
  block: number;
}

/** Three satellites out toward the right edge. HRIS and SAP are the owner's real integrations; the vendor is the travel API. */
export const NODES: readonly NodeDef[] = [
  { id: 'hris', label: 'HRIS', pos: onStage(2.3, 2.3), block: 0 },
  { id: 'vendor', label: 'TRAVEL VENDOR', pos: onStage(1.6, 3.2), block: 7 },
  { id: 'sap', label: 'SAP', pos: onStage(2.25, 0.3), block: 16 },
];
