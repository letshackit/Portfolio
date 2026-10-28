/** Small helpers shared by the four layout builders. Pure. */
import type { BayArchitecture, BayEdge } from '../../../data/bay-architecture.types';
import type { SceneNode, SceneRoute, Vec3 } from '../spec';

export interface LayoutOptions {
  /** A tall, narrow arrangement of the same idea for phones. */
  readonly portrait: boolean;
}

export const edgeId = (e: Pick<BayEdge, 'from' | 'to'>) => `${e.from}->${e.to}`;

export function nodeOf(arch: BayArchitecture, id: string) {
  const n = arch.nodes.find((x) => x.id === id);
  if (!n) throw new Error(`layout: architecture "${arch.id}" has no node "${id}"`);
  return n;
}

export type Side = 'l' | 'r' | 't' | 'b' | 'f' | 'k';

/** Point on the face of a node's bounding box, `inset` units further out. */
export function face(n: Pick<SceneNode, 'pos' | 'size'>, side: Side, inset = 0): Vec3 {
  const [x, y, z] = n.pos;
  const [w, h, d] = n.size;
  switch (side) {
    case 'l':
      return [x - w / 2 - inset, y, z];
    case 'r':
      return [x + w / 2 + inset, y, z];
    case 't':
      return [x, y + h / 2 + inset, z];
    case 'b':
      return [x, y - h / 2 - inset, z];
    case 'f':
      return [x, y, z + d / 2 + inset];
    default:
      return [x, y, z - d / 2 - inset];
  }
}

/** Quadratic bezier sampled into `n` segments. */
export function quad(a: Vec3, c: Vec3, b: Vec3, n = 16): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1], u * u * a[2] + 2 * u * t * c[2] + t * t * b[2]]);
  }
  return out;
}

export function route(e: BayEdge, points: readonly Vec3[], opts: { backplane?: boolean; packets?: boolean } = {}): SceneRoute {
  return { id: edgeId(e), from: e.from, to: e.to, kind: e.kind, points, backplane: opts.backplane ?? false, packets: opts.packets ?? true };
}

/** Closed ellipse in the XZ plane, as a polyline. */
export function ellipse(cx: number, y: number, cz: number, rx: number, rz: number, n = 72): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(t) * rx, y, cz + Math.sin(t) * rz]);
  }
  return pts;
}
