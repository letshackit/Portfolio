/**
 * TravelDesk: the layered tower. Front end over the Spring Boot gateway over four flow lanes of domain services
 * (trip, expense, people, platform), with each live integration level with the adapter that feeds it and the Phase 2
 * integrations dashed above. Gateway-to-service links run as a shared rail behind the lanes, like the 2D diagram.
 */
import type { BayArchitecture, BayEdge } from '../../../data/bay-architecture.types';
import { extentOf, makeNode, type SceneNode, type ScenePlate, type SceneRoute, type SceneSpec, type Vec3 } from '../spec';
import { face, nodeOf, quad, route, type LayoutOptions } from './common';

const LANES = ['trip', 'expense', 'people', 'platform'] as const;
const LANE_TITLE: Readonly<Record<string, string>> = { trip: 'TRIP', expense: 'EXPENSE', people: 'PEOPLE', platform: 'PLATFORM' };
/** Reading order inside a lane: the order a request flows through it. */
const LANE_ORDER: Readonly<Record<string, readonly string[]>> = {
  trip: ['travel-request', 'approval', 'booking', 'vendor-adapter'],
  expense: ['expense', 'ocr', 'policy', 'reimbursement', 'sap-adapter'],
  people: ['identity', 'employee', 'hris-adapter'],
  platform: ['tenant', 'admin', 'audit', 'notification'],
};
const SHORT: Readonly<Record<string, string>> = { hris: 'Enterprise HRIS', quest2travel: 'Quest2Travel' };

export function travelDeskLayout(arch: BayArchitecture, { portrait }: LayoutOptions): SceneSpec {
  const cols = portrait ? 2 : 5;
  const step = portrait ? 2.1 : 1.78;
  const x0 = portrait ? -1.05 : -5.3;
  const rowStep = portrait ? 0.92 : 1.2;
  const blockSize: Vec3 = portrait ? [1.92, 0.72, 0.3] : [1.56, 0.64, 0.3];
  const font = portrait ? 0.185 : 0.158;
  const intXFinal = portrait ? x0 + cols * step : 5.6;
  const laneGap = portrait ? 0.62 : 0;

  const nodes: SceneNode[] = [];
  const plates: ScenePlate[] = [];
  const pos = new Map<string, SceneNode>();
  let index = 0;
  const add = (n: Parameters<typeof makeNode>[0]) => {
    const node = makeNode(n, index);
    index += 1;
    nodes.push(node);
    pos.set(node.id, node);
    return node;
  };

  // Vertical plan, top down.
  const frontY = 0;
  const gwY = -(portrait ? 1.0 : 1.2);
  let cursor = gwY - (portrait ? 1.35 : 1.6);
  const laneInfo: { id: string; top: number; rows: number }[] = [];
  const cell = new Map<string, { row: number; col: number; y: number }>();

  LANES.forEach((lane) => {
    const members = (LANE_ORDER[lane] ?? []).filter((id) => arch.nodes.some((n) => n.id === id));
    const rows = Math.ceil(members.length / cols);
    const top = cursor;
    members.forEach((id, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      cell.set(id, { row, col, y: top - row * rowStep });
    });
    laneInfo.push({ id: lane, top, rows });
    cursor = top - rows * rowStep - laneGap;
  });

  const laneLeft = x0 - 0.98;
  const laneRight = x0 + (cols - 1) * step + 0.98;
  const plateRight = portrait ? intXFinal + 1.2 : laneRight + 0.2;
  const centreX = (laneLeft + plateRight) / 2;
  const plateW = plateRight - laneLeft;

  add({
    id: 'frontend',
    label: nodeOf(arch, 'frontend').label,
    kind: 'frontend',
    shape: 'slab',
    pos: [centreX, frontY, 0.9],
    size: [portrait ? 3.4 : 3.6, 0.7, 0.3],
    tone: 'core',
    labelSize: portrait ? 0.2 : 0.21,
    group: 'entry',
    order: 0,
  });
  add({
    id: 'gateway',
    label: nodeOf(arch, 'gateway').label,
    kind: 'gateway',
    shape: 'slab',
    pos: [centreX, gwY, 0.45],
    size: [plateW, 0.62, 0.28],
    tone: 'core',
    labelSize: portrait ? 0.2 : 0.21,
    group: 'entry',
    order: 0.08,
  });

  laneInfo.forEach((lane, li) => {
    const members = (LANE_ORDER[lane.id] ?? []).filter((id) => arch.nodes.some((n) => n.id === id));
    const plateH = (lane.rows - 1) * rowStep + 1.02;
    plates.push({
      id: `lane-${lane.id}`,
      label: LANE_TITLE[lane.id] ?? lane.id.toUpperCase(),
      pos: [(laneLeft + plateRight) / 2, lane.top - ((lane.rows - 1) * rowStep) / 2, -0.34],
      size: [plateW, plateH],
      plane: 'xy',
      tone: 'cyan',
    });
    members.forEach((id, i) => {
      const c = cell.get(id);
      if (!c) return;
      const n = nodeOf(arch, id);
      add({
        id,
        label: n.label,
        kind: n.kind,
        shape: 'slab',
        pos: [x0 + c.col * step, c.y, 0],
        size: blockSize,
        labelSize: font,
        group: lane.id,
        order: 0.2 + li * 0.14 + (i / Math.max(1, members.length)) * 0.1,
      });
    });
  });

  // Integrations: level with the adapter that feeds them.
  const intOrder = ['hris', 'quest2travel', 'sap'] as const;
  const adapterOfInt: Readonly<Record<string, string>> = { hris: 'hris-adapter', quest2travel: 'vendor-adapter', sap: 'sap-adapter' };
  intOrder.forEach((id, i) => {
    const adapter = cell.get(adapterOfInt[id] ?? '');
    const n = nodeOf(arch, id);
    add({
      id,
      label: SHORT[id] ?? n.label,
      sub: 'LIVE',
      kind: n.kind,
      shape: 'slab',
      pos: [intXFinal, adapter?.y ?? -3 - i, -0.2],
      size: portrait ? [1.5, 0.72, 0.3] : [1.9, 0.7, 0.3],
      tone: 'soft',
      labelSize: 0.17,
      group: 'live',
      order: 0.86 + i * 0.03,
    });
  });
  const p2 = arch.nodes.filter((n) => n.kind === 'integration-phase2');
  p2.forEach((n, i) => {
    add({
      id: n.id,
      label: n.label,
      sub: 'PHASE 2',
      kind: n.kind,
      shape: 'slab',
      pos: portrait ? [intXFinal - 1.7 + i * 1.7, cursor - 0.35, -0.2] : [intXFinal, gwY + 1.2 - i * 1.25 + (i === 0 ? 0.35 : 0.2), -0.2],
      size: portrait ? [1.5, 0.66, 0.26] : [1.9, 0.62, 0.26],
      tone: 'soft',
      ghost: true,
      labelSize: 0.16,
      group: 'phase2',
      order: 0.96,
    });
  });

  const routes: SceneRoute[] = [];
  const gw = pos.get('gateway') as SceneNode;
  const BACK = -0.52;

  for (const e of arch.edges as readonly BayEdge[]) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;

    if (e.from === 'frontend' && e.to === 'gateway') {
      routes.push(route(e, [face(a, 'b'), [a.pos[0], gw.pos[1] + gw.size[1] / 2, gw.pos[2]]]));
      continue;
    }
    if (e.from === 'gateway' && e.kind === 'call') {
      const x = b.pos[0];
      routes.push(route(e, [[x, gw.pos[1] - gw.size[1] / 2, BACK], [x, b.pos[1], BACK]], { backplane: true, packets: false }));
      continue;
    }
    if (e.kind === 'phase2') {
      const start: Vec3 = portrait ? [b.pos[0], gw.pos[1] - gw.size[1] / 2, BACK] : [gw.pos[0] + gw.size[0] / 2, gw.pos[1], gw.pos[2]];
      const end: Vec3 = portrait ? [b.pos[0], b.pos[1] + b.size[1] / 2, b.pos[2]] : face(b, 'l');
      const mid: Vec3 = portrait ? [b.pos[0], (start[1] + end[1]) / 2, BACK] : [end[0] - 0.9, start[1], 0.1];
      const pts: Vec3[] = portrait ? [start, mid, end] : Math.abs(start[1] - end[1]) < 0.05 ? [start, end] : [start, mid, [mid[0], end[1], end[2]], end];
      routes.push(route(e, pts, { packets: false }));
      continue;
    }

    // Same row: straight face to face. Integrations always sit in their adapter's row.
    if (Math.abs(a.pos[1] - b.pos[1]) < 0.05) {
      const right = b.pos[0] > a.pos[0];
      routes.push(route(e, [face(a, right ? 'r' : 'l'), face(b, right ? 'l' : 'r')]));
      continue;
    }
    // Different rows: an arc that lifts toward the viewer so it reads over the glass.
    const down = b.pos[1] < a.pos[1];
    const sa = face(a, down ? 'b' : 't');
    const sb = face(b, down ? 't' : 'b');
    const gap = Math.abs(a.pos[1] - b.pos[1]);
    const bulge = 0.5 + Math.min(1.1, gap * 0.22);
    routes.push(route(e, quad(sa, [(sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2, bulge], sb, 16)));
  }

  const extent = extentOf(nodes, plates, routes);
  return {
    id: arch.id,
    nodes,
    routes,
    plates,
    extent,
    rot: { x: 0.2, y: -0.26 },
    startIds: ['frontend'],
    decor: [],
    clusters: [],
    initialOpen: null,
    legend: ['call', 'event', 'phase2'],
  };
}
