/**
 * World-space layout for the exploded TravelDesk view. Pure and data-driven: the same model always gives the same
 * blocks and routes, and renaming or adding a service in the data file re-lays the scene out with no code change.
 * Units are three.js world units. Edge ids match lib/archLayout (`from->to`) so highlightFor() applies unchanged.
 */
import type { ArchNode, ArchitectureModel } from '../../data/content.types';

export type Vec3 = readonly [number, number, number];

export interface Block3D {
  readonly id: string;
  readonly kind: ArchNode['kind'];
  /** Text drawn on the block face. */
  readonly label: string;
  readonly pos: Vec3;
  readonly size: Vec3;
  readonly scatter: Vec3;
  /** Rotation (rad) the block starts with before it assembles. */
  readonly spin: Vec3;
  /** 0..1 position in assembly order, so the stack builds top-down. */
  readonly order: number;
}

export interface Route3D {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: 'call' | 'event' | 'phase2';
  readonly points: readonly Vec3[];
  /** Gateway-to-domain rails: drawn as the shared backplane. */
  readonly backplane: boolean;
}

export interface Layout3D {
  readonly blocks: readonly Block3D[];
  readonly routes: readonly Route3D[];
  /** Width and height of everything that is drawn, used to fit the camera. */
  readonly extent: { readonly w: number; readonly h: number; readonly cy: number };
}

const COLS = 4;
const COL_STEP = 2.0;
const ROW_STEP = 1.0;
const ROW0_Y = 0.15;
const DOMAIN_SIZE: Vec3 = [1.82, 0.72, 0.2];
const GATEWAY_SIZE: Vec3 = [7.9, 0.78, 0.24];
const FRONT_SIZE: Vec3 = [3.5, 0.84, 0.24];
const SAT_SIZE: Vec3 = [1.9, 0.72, 0.2];
const SAT_X = 6.3;
const BACK_Z = -0.32;

/** Short on-block names for the nodes that sit outside the grid (the data labels stay on the DOM buttons). */
const SHORT_LABEL: Readonly<Record<string, string>> = {
  hris: 'HRIS',
  quest2travel: 'TRAVEL VENDOR',
  sap: 'SAP',
  ebix: 'EBIX FOREX',
  recharge: 'RECHARGE',
  frontend: 'NEXT.JS FRONT END',
  gateway: 'SPRING BOOT API GATEWAY',
};

/** Deterministic hash in [0, 1): scatter positions must not change between renders. */
function unit(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const colX = (c: number) => (c - (COLS - 1) / 2) * COL_STEP;
const rowY = (r: number) => ROW0_Y - r * ROW_STEP;

function scatterFor(index: number, pos: Vec3): { scatter: Vec3; spin: Vec3 } {
  const j = (k: number) => unit(index * 7 + k) - 0.5;
  return {
    scatter: [pos[0] + j(1) * 26, pos[1] + j(2) * 16 + 3, pos[2] + j(3) * 14 - 4],
    spin: [j(4) * 3, j(5) * 3.6, j(6) * 2.4],
  };
}

function adapterOf(model: ArchitectureModel, integrationId: string): string | null {
  for (const e of model.edges) {
    if (e.to === integrationId && e.kind !== 'phase2') return e.from;
    if (e.from === integrationId && e.kind !== 'phase2') return e.to;
  }
  return null;
}

/** Row-major slots; the adapters that talk to a live integration take the last column so their beams run sideways. */
function assignSlots(model: ArchitectureModel): Map<string, { col: number; row: number }> {
  const domain = model.nodes.filter((n) => n.kind === 'domain');
  const rows = Math.max(1, Math.ceil(domain.length / COLS));
  const slots = new Map<string, { col: number; row: number }>();
  const taken = new Set<string>();
  const key = (c: number, r: number) => `${c}:${r}`;

  let nextRow = 0;
  for (const live of model.nodes.filter((n) => n.kind === 'integration')) {
    const adapter = adapterOf(model, live.id);
    if (!adapter || slots.has(adapter) || nextRow >= rows) continue;
    slots.set(adapter, { col: COLS - 1, row: nextRow });
    taken.add(key(COLS - 1, nextRow));
    nextRow += 1;
  }
  let c = 0;
  let r = 0;
  for (const n of domain) {
    if (slots.has(n.id)) continue;
    while (taken.has(key(c, r))) {
      c += 1;
      if (c >= COLS) {
        c = 0;
        r += 1;
      }
    }
    slots.set(n.id, { col: c, row: r });
    taken.add(key(c, r));
  }
  return slots;
}

const center = (b: Block3D): Vec3 => b.pos;

/** Where a straight line from the block's centre toward `toward` leaves the block's rectangle. */
function edgePoint(b: Block3D, toward: Vec3): Vec3 {
  const dx = toward[0] - b.pos[0];
  const dy = toward[1] - b.pos[1];
  if (dx === 0 && dy === 0) return b.pos;
  const tx = dx === 0 ? Infinity : b.size[0] / 2 / Math.abs(dx);
  const ty = dy === 0 ? Infinity : b.size[1] / 2 / Math.abs(dy);
  const t = Math.min(tx, ty);
  return [b.pos[0] + dx * t, b.pos[1] + dy * t, b.pos[2]];
}

function quad(a: Vec3, c: Vec3, b: Vec3, n: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const u = 1 - t;
    out.push([
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
      u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
    ]);
  }
  return out;
}

export function layout3d(model: ArchitectureModel): Layout3D {
  const frontend = model.nodes.find((n) => n.kind === 'frontend');
  const gateway = model.nodes.find((n) => n.kind === 'gateway');
  if (!frontend || !gateway) throw new Error('layout3d: model needs one frontend and one gateway');

  const slots = assignSlots(model);
  const domain = model.nodes.filter((n) => n.kind === 'domain');
  const rows = Math.max(1, Math.ceil(domain.length / COLS));
  const gwY = rowY(0) + 1.5;
  const frontY = gwY + 1.45;
  const busY = rowY(0) + DOMAIN_SIZE[1] / 2 + 0.42;

  const base: { node: ArchNode; pos: Vec3; size: Vec3 }[] = [];
  base.push({ node: frontend, pos: [0, frontY, 1.1], size: FRONT_SIZE });
  base.push({ node: gateway, pos: [0, gwY, 0.55], size: GATEWAY_SIZE });
  for (const n of domain) {
    const s = slots.get(n.id) ?? { col: 0, row: 0 };
    base.push({ node: n, pos: [colX(s.col), rowY(s.row), 0], size: DOMAIN_SIZE });
  }

  // Live integrations sit to the right, level with the adapter that feeds them.
  const live = model.nodes.filter((n) => n.kind === 'integration');
  let spare = rows;
  for (const n of live) {
    const adapter = adapterOf(model, n.id);
    const slot = adapter ? slots.get(adapter) : undefined;
    const y = slot ? rowY(slot.row) : rowY(spare++);
    base.push({ node: n, pos: [SAT_X, y, 0], size: SAT_SIZE });
  }
  // Phase 2 integrations hang off the gateway's left end.
  model.nodes
    .filter((n) => n.kind === 'integration-phase2')
    .forEach((n, i) => base.push({ node: n, pos: [-SAT_X, gwY - i * 1.2, 0.2], size: SAT_SIZE }));

  const total = base.length;
  const blocks: Block3D[] = base.map(({ node, pos, size }, i) => {
    const { scatter, spin } = scatterFor(i, pos);
    // Top-down build: the front end first, then the gateway, then rows, then the satellites.
    const rank = node.kind === 'frontend' ? 0 : node.kind === 'gateway' ? 0.1 : (1 - (pos[1] - rowY(rows - 1)) / (gwY - rowY(rows - 1) + 1)) * 0.7 + 0.2;
    return {
      id: node.id,
      kind: node.kind,
      label: SHORT_LABEL[node.id] ?? node.label.toUpperCase(),
      pos,
      size,
      scatter,
      spin,
      order: Math.min(1, Math.max(0, rank + (i / total) * 0.05)),
    };
  });
  const byId = new Map(blocks.map((b) => [b.id, b] as const));
  const kindOf = new Map(model.nodes.map((n) => [n.id, n.kind] as const));

  const routes: Route3D[] = model.edges.map((e) => {
    const id = `${e.from}->${e.to}`;
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    if (!a || !b) throw new Error(`layout3d: edge ${id} references an unknown node`);
    const common = { id, from: e.from, to: e.to, kind: e.kind } as const;

    if (a.kind === 'gateway' && kindOf.get(e.to) === 'domain') {
      const x = b.pos[0];
      const start: Vec3 = [0, a.pos[1] - a.size[1] / 2, BACK_Z];
      return { ...common, backplane: true, points: [start, [0, busY, BACK_Z], [x, busY, BACK_Z], [x, b.pos[1], BACK_Z]] };
    }
    if (e.kind === 'phase2') {
      const p = a.kind === 'gateway' ? b : a;
      const gw = a.kind === 'gateway' ? a : b;
      const start: Vec3 = [gw.pos[0] - gw.size[0] / 2, gw.pos[1], gw.pos[2]];
      const mid: Vec3 = [-SAT_X + 1.9, gw.pos[1], p.pos[2]];
      const end: Vec3 = [p.pos[0] + p.size[0] / 2, p.pos[1], p.pos[2]];
      const pts: Vec3[] = p.pos[1] === gw.pos[1] ? [start, end] : [start, mid, [mid[0], p.pos[1], p.pos[2]], end];
      return { ...common, backplane: false, points: a.kind === 'gateway' ? pts : [...pts].reverse() };
    }

    const sa = edgePoint(a, center(b));
    const sb = edgePoint(b, center(a));
    const cellApart = Math.hypot(a.pos[0] - b.pos[0], a.pos[1] - b.pos[1]);
    if (cellApart > COL_STEP * 1.2 && a.kind === 'domain' && b.kind === 'domain') {
      const ctrl: Vec3 = [(sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2, 0.55 + cellApart * 0.18];
      return { ...common, backplane: false, points: quad(sa, ctrl, sb, 14) };
    }
    return { ...common, backplane: false, points: [sa, sb] };
  });

  const minX = Math.min(...blocks.map((b) => b.pos[0] - b.size[0] / 2));
  const maxX = Math.max(...blocks.map((b) => b.pos[0] + b.size[0] / 2));
  const minY = Math.min(...blocks.map((b) => b.pos[1] - b.size[1] / 2));
  const maxY = Math.max(...blocks.map((b) => b.pos[1] + b.size[1] / 2));
  return { blocks, routes, extent: { w: maxX - minX, h: maxY - minY, cy: (minY + maxY) / 2 } };
}
