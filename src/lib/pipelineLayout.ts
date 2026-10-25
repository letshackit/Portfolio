/**
 * The single geometry source for the hero pipeline (architecture C.2). The SVG renderer, the DOM overlay and the
 * 3D scene all read node positions from here, so the three can never drift apart (FR-54).
 */

export type PipelineOrientation = 'horizontal' | 'vertical';

export interface PipelinePoint {
  readonly x: number;
  readonly y: number;
}

export interface PipelineEdge {
  readonly from: number;
  readonly to: number;
  /** SVG path data, one quadratic segment. */
  readonly d: string;
}

export interface PipelineLayout {
  readonly orientation: PipelineOrientation;
  readonly viewBox: readonly [width: number, height: number];
  /** Seven nodes in viewBox units, in pipeline order. */
  readonly nodes: ReadonlyArray<PipelinePoint>;
  /** Six edges, node i to node i + 1. */
  readonly edges: ReadonlyArray<PipelineEdge>;
  /** The six edges joined into one path, for CSS offset-path packets. */
  readonly packetPath: string;
  /** Where the stage label sits relative to its node. */
  readonly label: 'below' | 'right';
}

const STAGE_COUNT = 7;
/** Upward (horizontal) or rightward (vertical) bow of each edge, in viewBox units. */
const BOW = 17;

interface Segment {
  readonly a: PipelinePoint;
  readonly c: PipelinePoint;
  readonly b: PipelinePoint;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function build(
  orientation: PipelineOrientation,
  viewBox: readonly [number, number],
  nodes: ReadonlyArray<PipelinePoint>,
  label: 'below' | 'right',
): PipelineLayout {
  const segments: Segment[] = nodes.slice(0, -1).map((a, i) => {
    const b = nodes[i + 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const c = orientation === 'horizontal' ? { x: mx, y: a.y - BOW } : { x: a.x + BOW, y: my };
    return { a, c, b };
  });
  const edges = segments.map(({ a, c, b }, i) => ({
    from: i,
    to: i + 1,
    d: `M ${round(a.x)} ${round(a.y)} Q ${round(c.x)} ${round(c.y)} ${round(b.x)} ${round(b.y)}`,
  }));
  const first = segments[0].a;
  const packetPath = `M ${round(first.x)} ${round(first.y)} ${segments
    .map(({ c, b }) => `Q ${round(c.x)} ${round(c.y)} ${round(b.x)} ${round(b.y)}`)
    .join(' ')}`;
  return { orientation, viewBox, nodes, edges, packetPath, label };
}

export const HORIZONTAL: PipelineLayout = build(
  'horizontal',
  [1000, 340],
  Array.from({ length: STAGE_COUNT }, (_, i) => ({ x: 80 + i * 140, y: 170 })),
  'below',
);

export const VERTICAL: PipelineLayout = build(
  'vertical',
  [360, 480],
  Array.from({ length: STAGE_COUNT }, (_, i) => ({ x: 40, y: 48 + i * 64 })),
  'right',
);

/** Wide screens (768 and up) draw the horizontal pipeline; narrow screens the vertical one (FR-55). */
export function layoutFor(isWide: boolean): PipelineLayout {
  return isWide ? HORIZONTAL : VERTICAL;
}

/** World mapping for the 3D scene (horizontal layout only): 10.4 units across the viewBox width, Z = 0. */
export function toWorld(n: PipelinePoint, layout: PipelineLayout): [x: number, y: number, z: 0] {
  const [w, h] = layout.viewBox;
  const worldW = 10.4;
  const worldH = (worldW * h) / w;
  return [(n.x / w) * worldW - worldW / 2, -((n.y / h) * worldH - worldH / 2), 0];
}

/** Node position as CSS percentages of the frame, for the DOM overlay (ADR-006). */
export function toPercent(n: PipelinePoint, layout: PipelineLayout): { left: string; top: string } {
  const [w, h] = layout.viewBox;
  return { left: `${round((n.x / w) * 100)}%`, top: `${round((n.y / h) * 100)}%` };
}

const SAMPLES_PER_SEGMENT = 32;

function quadAt(s: Segment, t: number): PipelinePoint {
  const u = 1 - t;
  return {
    x: u * u * s.a.x + 2 * u * t * s.c.x + t * t * s.b.x,
    y: u * u * s.a.y + 2 * u * t * s.c.y + t * t * s.b.y,
  };
}

/**
 * Point at a fraction (0..1) of the packet path's length. Used for still packets under reduced motion and for
 * browsers without offset-path, where the packet is placed by transform instead (architecture C.5).
 */
export function pointAtFraction(layout: PipelineLayout, fraction: number): PipelinePoint {
  const pts: PipelinePoint[] = [];
  for (let i = 0; i < layout.nodes.length - 1; i += 1) {
    const a = layout.nodes[i];
    const b = layout.nodes[i + 1];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const c = layout.orientation === 'horizontal' ? { x: mx, y: a.y - BOW } : { x: a.x + BOW, y: my };
    for (let k = i === 0 ? 0 : 1; k <= SAMPLES_PER_SEGMENT; k += 1) {
      pts.push(quadAt({ a, c, b }, k / SAMPLES_PER_SEGMENT));
    }
  }
  const lengths: number[] = [0];
  for (let i = 1; i < pts.length; i += 1) {
    lengths.push(lengths[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  const target = Math.min(Math.max(fraction, 0), 1) * lengths[lengths.length - 1];
  for (let i = 1; i < pts.length; i += 1) {
    if (lengths[i] >= target) {
      const span = lengths[i] - lengths[i - 1] || 1;
      const k = (target - lengths[i - 1]) / span;
      return {
        x: round(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * k),
        y: round(pts[i - 1].y + (pts[i].y - pts[i - 1].y) * k),
      };
    }
  }
  return pts[pts.length - 1];
}
