/**
 * The scene description every bay shares. Each project has a layout builder (layouts/*.ts) that turns its architecture
 * model into a SceneSpec: positions, shapes and routes in world units. The renderer (BayScene) knows nothing about
 * TravelDesk, HRMS and the rest; it draws a SceneSpec. Pure: no three.js import, so it stays testable without WebGL.
 */
import type { BayEdgeKind, BayNodeKind } from '../../data/bay-architecture.types';

export type Vec3 = readonly [number, number, number];

export type Shape = 'slab' | 'cyl' | 'oct' | 'ring' | 'shell' | 'stack';
export type Tone = 'cyan' | 'soft' | 'slate' | 'core';

export interface SceneNode {
  readonly id: string;
  /** Text on the face. */
  readonly label: string;
  readonly sub?: string;
  readonly kind: BayNodeKind;
  readonly shape: Shape;
  readonly pos: Vec3;
  readonly size: Vec3;
  readonly tone: Tone;
  /** Dashed outline, fainter fill: Phase 2, evaluation. */
  readonly ghost: boolean;
  /** Face text height in world units (the font size). 0 draws no label. */
  readonly labelSize: number;
  /** Where the label plane sits, relative to the node centre, and how big it is. */
  readonly labelAt: Vec3;
  readonly labelBox: readonly [number, number];
  /** Draw the label on a dark backing plate (centre nodes whose label sits over the mesh and its wires). */
  readonly plate?: boolean;
  readonly group: string;
  /** 0..1 position in assembly order. */
  readonly order: number;
  /** Modules of an expandable cluster: the cluster id. */
  readonly parent?: string;
  /** Position and size while the parent cluster is expanded. */
  readonly open?: { readonly pos: Vec3; readonly size: Vec3 };
  /** Selectable by pointer. False for containers the pointer should pass through. */
  readonly pick: boolean;
  readonly scatter: Vec3;
  readonly spin: Vec3;
}

export interface SceneRoute {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: BayEdgeKind;
  readonly points: readonly Vec3[];
  /** Drawn faint and wide of the nodes: the shared rail behind a group of services. */
  readonly backplane: boolean;
  /** Packets ride this route. */
  readonly packets: boolean;
}

export interface ScenePlate {
  readonly id: string;
  readonly label: string;
  readonly pos: Vec3;
  readonly size: readonly [number, number];
  /** 'xy' stands facing the camera; 'xz' lies flat. */
  readonly plane: 'xy' | 'xz';
  readonly tone: Tone;
}

export type DecorId = 'wave' | 'orbits' | 'bus-loop';

export interface Extent {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export interface SceneSpec {
  readonly id: string;
  readonly nodes: readonly SceneNode[];
  readonly routes: readonly SceneRoute[];
  readonly plates: readonly ScenePlate[];
  readonly extent: Extent;
  /** Base tilt of the assembly (radians), the same on every bay so the four read as one gallery. */
  readonly rot: { readonly x: number; readonly y: number };
  /** Packets start on routes leaving these nodes. */
  readonly startIds: readonly string[];
  readonly decor: readonly DecorId[];
  /** Cluster ids that can expand, in order; empty for the other bays. */
  readonly clusters: readonly string[];
  /** Cluster open at first sight. */
  readonly initialOpen: string | null;
  /** Legend of line styles actually used. */
  readonly legend: readonly BayEdgeKind[];
}

/** What a hover or focus lights up. */
export interface Highlight {
  readonly nodes: ReadonlySet<string>;
  readonly edges: ReadonlySet<string>;
}

/** Deterministic hash in [0, 1): scatter positions must not change between renders. */
export function unit(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function scatterFor(index: number, pos: Vec3): { scatter: Vec3; spin: Vec3 } {
  const j = (k: number) => unit(index * 7 + k) - 0.5;
  return {
    scatter: [pos[0] + j(1) * 24, pos[1] + j(2) * 14 + 3, pos[2] + j(3) * 16 - 3],
    spin: [j(4) * 3, j(5) * 3.6, j(6) * 2.4],
  };
}

type NodeInput = Omit<SceneNode, 'scatter' | 'spin' | 'order' | 'pick' | 'ghost' | 'labelAt' | 'labelBox' | 'tone' | 'sub'> &
  Partial<Pick<SceneNode, 'ghost' | 'labelAt' | 'labelBox' | 'tone' | 'sub' | 'pick' | 'plate'>> & { readonly order?: number };

/** Fills in what every node needs but few layouts care about (scatter, label placement, pick). */
export function makeNode(input: NodeInput, index: number): SceneNode {
  const { scatter, spin } = scatterFor(index, input.pos);
  const [sx, sy, sz] = input.size;
  const front = input.shape === 'cyl' ? sz / 2 : sz / 2;
  return {
    ...input,
    tone: input.tone ?? 'cyan',
    ghost: input.ghost ?? false,
    pick: input.pick ?? true,
    labelAt: input.labelAt ?? [0, 0, front + 0.014],
    labelBox: input.labelBox ?? [sx, sy],
    order: input.order ?? 0,
    scatter,
    spin,
  };
}

export function extentOf(nodes: readonly SceneNode[], plates: readonly ScenePlate[], routes: readonly SceneRoute[]): Extent {
  const e = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  const add = (p: Vec3, hx: number, hy: number, hz: number) => {
    e.minX = Math.min(e.minX, p[0] - hx);
    e.maxX = Math.max(e.maxX, p[0] + hx);
    e.minY = Math.min(e.minY, p[1] - hy);
    e.maxY = Math.max(e.maxY, p[1] + hy);
    e.minZ = Math.min(e.minZ, p[2] - hz);
    e.maxZ = Math.max(e.maxZ, p[2] + hz);
  };
  for (const n of nodes) {
    add(n.pos, n.size[0] / 2, n.size[1] / 2, n.size[2] / 2);
    if (n.open) add(n.open.pos, n.open.size[0] / 2, n.open.size[1] / 2, n.open.size[2] / 2);
  }
  for (const p of plates) {
    add(p.pos, p.size[0] / 2, p.plane === 'xy' ? p.size[1] / 2 : 0, p.plane === 'xz' ? p.size[1] / 2 : 0);
  }
  for (const r of routes) for (const pt of r.points) add(pt, 0, 0, 0);
  return e;
}

/** Everything one hop away from `id`, plus the routes that join them. A cluster also lights its modules. */
export function highlightFor(spec: SceneSpec, id: string): Highlight {
  const nodes = new Set<string>([id]);
  const edges = new Set<string>();
  for (const r of spec.routes) {
    if (r.from === id || r.to === id) {
      nodes.add(r.from);
      nodes.add(r.to);
      edges.add(r.id);
    }
  }
  for (const n of spec.nodes) if (n.parent === id) nodes.add(n.id);
  const self = spec.nodes.find((n) => n.id === id);
  if (self?.parent) {
    nodes.add(self.parent);
    for (const r of spec.routes) if (r.from === self.parent || r.to === self.parent) edges.add(r.id);
  }
  return { nodes, edges };
}

/** Names of the nodes one hop away, for the readout. */
export function neighbours(spec: SceneSpec, id: string): readonly string[] {
  const out: string[] = [];
  const label = (nid: string) => spec.nodes.find((n) => n.id === nid)?.label ?? nid;
  for (const r of spec.routes) {
    if (r.backplane && r.from !== id && r.to !== id) continue;
    if (r.from === id) out.push(label(r.to));
    else if (r.to === id) out.push(label(r.from));
  }
  return [...new Set(out)];
}

/**
 * Camera distance that fits the whole extent inside the canvas for a given tilt: the analytic bound of a
 * perspective projection over the eight rotated corners. Same maths for every bay and for both orientations.
 */
export function fitDistance(extent: Extent, rot: { x: number; y: number }, fov: number, aspect: number, margin = 0.9): number {
  const cx = (extent.minX + extent.maxX) / 2;
  const cy = (extent.minY + extent.maxY) / 2;
  const cz = (extent.minZ + extent.maxZ) / 2;
  const tan = Math.tan((fov * Math.PI) / 360);
  const cyA = Math.cos(rot.y);
  const syA = Math.sin(rot.y);
  const cxA = Math.cos(rot.x);
  const sxA = Math.sin(rot.x);
  let d = 1;
  for (const px of [extent.minX, extent.maxX]) {
    for (const py of [extent.minY, extent.maxY]) {
      for (const pz of [extent.minZ, extent.maxZ]) {
        const x0 = px - cx;
        const y0 = py - cy;
        const z0 = pz - cz;
        const x1 = x0 * cyA + z0 * syA;
        const z1 = -x0 * syA + z0 * cyA;
        const y2 = y0 * cxA - z1 * sxA;
        const z2 = y0 * sxA + z1 * cxA;
        d = Math.max(d, z2 + Math.abs(x1) / (margin * tan * aspect), z2 + Math.abs(y2) / (margin * tan));
      }
    }
  }
  return d;
}

export const centreOf = (e: Extent): Vec3 => [(e.minX + e.maxX) / 2, (e.minY + e.maxY) / 2, (e.minZ + e.maxZ) / 2];
