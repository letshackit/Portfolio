/**
 * Fixed-slot layout for the TravelDesk diagram (architecture §D.2).
 * Pure: the same model always gives the same boxes, so renaming, reordering or adding a
 * domain service in the data file re-lays the diagram out with no code change (FR-3).
 * Numbers are SVG user units in a viewBox, not CSS pixels.
 */
import type { ArchEdgeKind, ArchNode, ArchitectureModel } from '../data/content.types';

export type ArchOrientation = 'horizontal' | 'vertical';

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Segment {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export interface LaidOutEdge {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly kind: ArchEdgeKind;
  /** SVG path data, drawn verbatim. */
  readonly d: string;
  /** True for gateway-to-domain edges, which are drawn as the shared backplane, not as lines of their own. */
  readonly backplane: boolean;
}

export interface ArchLayout {
  readonly orientation: ArchOrientation;
  readonly viewBox: readonly [number, number];
  readonly boxes: ReadonlyMap<string, Box>;
  readonly bus: { readonly trunk: Segment; readonly spine: Segment; readonly rows: readonly Segment[] };
  readonly edges: readonly LaidOutEdge[];
}

export const BOX_W = 180;
export const BOX_H = 52;
const ROW_STEP = 72;

const edgeId = (from: string, to: string) => `${from}->${to}`;

const seg = (x1: number, y1: number, x2: number, y2: number): Segment => ({ x1, y1, x2, y2 });
const line = (x1: number, y1: number, x2: number, y2: number) => `M${x1} ${y1}L${x2} ${y2}`;
const poly = (pts: ReadonlyArray<readonly [number, number]>) =>
  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join('');

const midY = (b: Box) => b.y + b.h / 2;
const midX = (b: Box) => b.x + b.w / 2;

/** Straight line between the facing edges of two boxes. */
function straight(a: Box, b: Box): string {
  if (a.x + a.w <= b.x) return line(a.x + a.w, midY(a), b.x, midY(b));
  if (b.x + b.w <= a.x) return line(a.x, midY(a), b.x + b.w, midY(b));
  if (a.y + a.h <= b.y) return line(midX(a), a.y + a.h, midX(b), b.y);
  return line(midX(a), a.y, midX(b), b.y + b.h);
}

interface Slots {
  readonly boxes: Map<string, Box>;
  readonly bus: ArchLayout['bus'];
  readonly viewBox: readonly [number, number];
  /** Where the gateway-to-domain polyline for a domain node ends. */
  readonly backplanePath: (domainId: string) => string;
  /** Domain id -> column index (0 or 1) and row, for point-to-point routing. */
  readonly cell: ReadonlyMap<string, { col: number; row: number; outerLeft: boolean }>;
  readonly phase2Path: (index: number, gatewayId: string, id: string) => string | null;
  readonly integrationPath: (domainId: string, integrationId: string) => string | null;
}

function split(model: ArchitectureModel) {
  const of = (...kinds: ArchNode['kind'][]) => model.nodes.filter((n) => kinds.includes(n.kind));
  const gateway = of('gateway')[0];
  const frontend = of('frontend')[0];
  if (!gateway || !frontend) throw new Error('archLayout: model needs one frontend and one gateway');
  return { frontend, gateway, domain: of('domain'), live: of('integration'), phase2: of('integration-phase2') };
}

/** The domain node an integration hangs off (the adapter that has an edge to it); null when none. */
function adapterOf(model: ArchitectureModel, integrationId: string): string | null {
  for (const e of model.edges) {
    if (e.to === integrationId && e.kind !== 'phase2') return e.from;
    if (e.from === integrationId && e.kind !== 'phase2') return e.to;
  }
  return null;
}

function horizontalSlots(model: ArchitectureModel): Slots {
  const { frontend, gateway, domain, live, phase2 } = split(model);
  const rows = Math.max(1, Math.ceil(domain.length / 2));
  const colX = [500, 704] as const;
  const spineX = 470;
  const intX = 960;
  const rowY = (r: number) => 40 + r * ROW_STEP;
  const height = 40 + rows * ROW_STEP + 4;
  const boxes = new Map<string, Box>();
  const cell = new Map<string, { col: number; row: number; outerLeft: boolean }>();

  const gwY = Math.round((height - BOX_H) / 2);
  boxes.set(frontend.id, { x: 20, y: gwY, w: BOX_W, h: BOX_H });
  boxes.set(gateway.id, { x: 250, y: gwY, w: BOX_W, h: BOX_H });
  phase2.forEach((n, i) => boxes.set(n.id, { x: 250, y: gwY + 136 + i * ROW_STEP, w: BOX_W, h: BOX_H }));

  domain.forEach((n, i) => {
    const col = i < rows ? 0 : 1;
    const row = i % rows;
    boxes.set(n.id, { x: colX[col] ?? 0, y: rowY(row), w: BOX_W, h: BOX_H });
    cell.set(n.id, { col, row, outerLeft: col === 0 });
  });

  const used = new Set<number>();
  live.forEach((n) => {
    const adapter = adapterOf(model, n.id);
    let row = (adapter ? cell.get(adapter)?.row : undefined) ?? 0;
    while (used.has(row)) row += 1;
    used.add(row);
    boxes.set(n.id, { x: intX, y: rowY(row), w: BOX_W, h: BOX_H });
  });

  const gwMid = gwY + BOX_H / 2;
  const gw = boxes.get(gateway.id) as Box;
  const rowSegs = domain.map((_, i) => {
    const yc = rowY(i % rows) + BOX_H / 2;
    return seg(spineX, yc, colX[1] + BOX_W, yc);
  });
  const bus = {
    trunk: seg(gw.x + gw.w, gwMid, spineX, gwMid),
    spine: seg(spineX, rowY(0) + BOX_H / 2, spineX, rowY(rows - 1) + BOX_H / 2),
    // one line per row, shared by the two domain nodes in that row
    rows: rowSegs.slice(0, rows),
  };

  return {
    boxes,
    bus,
    viewBox: [1160, height],
    cell,
    backplanePath: (id) => {
      const b = boxes.get(id) as Box;
      return poly([
        [bus.trunk.x1, gwMid],
        [spineX, gwMid],
        [spineX, midY(b)],
        [b.x, midY(b)],
      ]);
    },
    phase2Path: (i, gid, id) => {
      const g = boxes.get(gid) as Box;
      const p = boxes.get(id) as Box;
      if (i === 0) return line(midX(g), g.y + g.h, midX(p), p.y);
      // later Phase-2 nodes sit below the first; route round its left side
      const jog = g.x - 24 * i;
      return poly([
        [g.x + 20, g.y + g.h],
        [g.x + 20, g.y + g.h + 60],
        [jog, g.y + g.h + 60],
        [jog, midY(p)],
        [p.x, midY(p)],
      ]);
    },
    integrationPath: () => null,
  };
}

function verticalSlots(model: ArchitectureModel): Slots {
  const { frontend, gateway, domain, live, phase2 } = split(model);
  const rows = Math.max(1, Math.ceil(domain.length / 2));
  const colX = [160, 380] as const;
  const width = 720;
  const rowY = (r: number) => 230 + r * ROW_STEP;
  const intY = 230 + rows * ROW_STEP + 34;
  const height = intY + 80;
  const boxes = new Map<string, Box>();
  const cell = new Map<string, { col: number; row: number; outerLeft: boolean }>();

  boxes.set(frontend.id, { x: 270, y: 20, w: BOX_W, h: BOX_H });
  boxes.set(gateway.id, { x: 270, y: 110, w: BOX_W, h: BOX_H });
  phase2.forEach((n, i) => boxes.set(n.id, { x: i % 2 === 0 ? 20 : 520, y: 110 + Math.floor(i / 2) * ROW_STEP, w: BOX_W, h: BOX_H }));
  domain.forEach((n, i) => {
    const col = i < rows ? 0 : 1;
    const row = i % rows;
    boxes.set(n.id, { x: colX[col] ?? 0, y: rowY(row), w: BOX_W, h: BOX_H });
    cell.set(n.id, { col, row, outerLeft: col === 0 });
  });
  const step = live.length > 1 ? (width - 40 - BOX_W) / (live.length - 1) : 0;
  live.forEach((n, i) => boxes.set(n.id, { x: 20 + i * step, y: intY, w: BOX_W, h: BOX_H }));

  const gw = boxes.get(gateway.id) as Box;
  const trunkX = midX(gw);
  const busY = 200;
  const colMid = colX.map((x) => x + BOX_W / 2);
  const lastY = rowY(rows - 1) + BOX_H / 2;
  const bus = {
    trunk: seg(trunkX, gw.y + gw.h, trunkX, busY),
    spine: seg(110, busY, 610, busY),
    rows: colMid.map((x) => seg(x, busY, x, lastY)),
  };

  return {
    boxes,
    bus,
    viewBox: [width, height],
    cell,
    backplanePath: (id) => {
      const b = boxes.get(id) as Box;
      return poly([
        [trunkX, gw.y + gw.h],
        [trunkX, busY],
        [midX(b), busY],
        [midX(b), b.y],
      ]);
    },
    phase2Path: (_i, gid, id) => straight(boxes.get(gid) as Box, boxes.get(id) as Box),
    integrationPath: (domainId, integrationId) => {
      // Down the right of column B, then along a private gutter above the integrations row.
      const a = boxes.get(domainId) as Box;
      const t = boxes.get(integrationId) as Box;
      const targets = live.map((n) => midX(boxes.get(n.id) as Box)).sort((p, q) => q - p);
      const rank = targets.indexOf(midX(t));
      const vx = colX[1] + BOX_W + 30 + 12 * rank;
      const hy = intY - 30 + 10 * rank;
      return poly([
        [a.x + a.w, midY(a)],
        [vx, midY(a)],
        [vx, hy],
        [midX(t), hy],
        [midX(t), t.y],
      ]);
    },
  };
}

export function layoutArch(model: ArchitectureModel, orientation: ArchOrientation): ArchLayout {
  const slots = orientation === 'horizontal' ? horizontalSlots(model) : verticalSlots(model);
  const { boxes, cell } = slots;
  const kindOf = new Map(model.nodes.map((n) => [n.id, n.kind] as const));
  const gatewayId = model.nodes.find((n) => n.kind === 'gateway')?.id;
  const phase2Ids = model.nodes.filter((n) => n.kind === 'integration-phase2').map((n) => n.id);

  const edges = model.edges.map((e): LaidOutEdge => {
    const id = edgeId(e.from, e.to);
    const a = boxes.get(e.from);
    const b = boxes.get(e.to);
    if (!a || !b) throw new Error(`archLayout: edge ${id} references an unknown node`);
    const base = { id, from: e.from, to: e.to, kind: e.kind };

    if (e.from === gatewayId && kindOf.get(e.to) === 'domain') {
      return { ...base, d: slots.backplanePath(e.to), backplane: true };
    }
    if (e.kind === 'phase2') {
      const phase2Id = phase2Ids.includes(e.to) ? e.to : e.from;
      const path = slots.phase2Path(phase2Ids.indexOf(phase2Id), gatewayId ?? e.from, phase2Id);
      return { ...base, d: path ?? straight(a, b), backplane: false };
    }
    const ca = cell.get(e.from);
    const cb = cell.get(e.to);
    if (ca && cb && ca.col === cb.col && Math.abs(ca.row - cb.row) > 1) {
      const span = Math.abs(ca.row - cb.row);
      const off = 24 + 12 * span;
      const x = ca.outerLeft ? a.x : a.x + a.w;
      const cx = ca.outerLeft ? x - off : x + off;
      return { ...base, d: `M${x} ${midY(a)}Q${cx} ${(midY(a) + midY(b)) / 2} ${x} ${midY(b)}`, backplane: false };
    }
    if (ca && !cb && kindOf.get(e.to) === 'integration') {
      const path = slots.integrationPath(e.from, e.to);
      if (path) return { ...base, d: path, backplane: false };
    }
    return { ...base, d: straight(a, b), backplane: false };
  });

  return { orientation, viewBox: slots.viewBox, boxes, bus: slots.bus, edges };
}

/** Ids connected to a node by any edge. */
export function neighbourIds(model: ArchitectureModel, id: string): readonly string[] {
  const out = new Set<string>();
  for (const e of model.edges) {
    if (e.from === id) out.add(e.to);
    if (e.to === id) out.add(e.from);
  }
  return [...out];
}

export interface Highlight {
  readonly nodes: ReadonlySet<string>;
  readonly edges: ReadonlySet<string>;
  /** True when the whole backplane (trunk, spine, rows) should light up. */
  readonly bus: boolean;
}

/** Node, every edge touching it, every node at the far end (FR-84). The gateway lights the whole backplane. */
export function highlightFor(model: ArchitectureModel, id: string): Highlight {
  const nodes = new Set<string>([id]);
  const edges = new Set<string>();
  for (const e of model.edges) {
    if (e.from === id || e.to === id) {
      edges.add(edgeId(e.from, e.to));
      nodes.add(e.from);
      nodes.add(e.to);
    }
  }
  return { nodes, edges, bus: model.nodes.find((n) => n.id === id)?.kind === 'gateway' };
}

/** Labels of the nodes connected to `id`, in edge order. */
export function connectionLabels(model: ArchitectureModel, id: string): readonly string[] {
  const labelOf = new Map(model.nodes.map((n) => [n.id, n.label] as const));
  return neighbourIds(model, id)
    .map((n) => labelOf.get(n))
    .filter((l): l is string => l !== undefined);
}
