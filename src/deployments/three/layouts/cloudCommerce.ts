/**
 * Cloud Commerce: a service mesh. Eight services ring one core; SAP stands on the source side and the cloud on the
 * target side, so the migration reads left to right (top to bottom on a phone): SAP, then the mesh, then the cloud.
 */
import type { BayArchitecture } from '../../../data/bay-architecture.types';
import { cloudCommerceServiceIds } from '../../../data/cloudcommerce-architecture';
import { extentOf, makeNode, type SceneNode, type ScenePlate, type SceneRoute, type SceneSpec, type Vec3 } from '../spec';
import { face, nodeOf, route, type LayoutOptions, type Side } from './common';

/** Face of `a` that looks toward `b`, picked by which axis the gap is larger on (in units of the box). */
function facing(a: SceneNode, b: SceneNode): { from: Side; to: Side } {
  const dx = b.pos[0] - a.pos[0];
  const dy = b.pos[1] - a.pos[1];
  if (Math.abs(dx) / (a.size[0] / 2 + b.size[0] / 2) > Math.abs(dy) / (a.size[1] / 2 + b.size[1] / 2)) {
    return dx > 0 ? { from: 'r', to: 'l' } : { from: 'l', to: 'r' };
  }
  return dy > 0 ? { from: 't', to: 'b' } : { from: 'b', to: 't' };
}

export function cloudCommerceLayout(arch: BayArchitecture, { portrait }: LayoutOptions): SceneSpec {
  const nodes: SceneNode[] = [];
  const plates: ScenePlate[] = [];
  const at = new Map<string, SceneNode>();
  let index = 0;
  const add = (n: Parameters<typeof makeNode>[0]) => {
    const node = makeNode(n, index);
    index += 1;
    nodes.push(node);
    at.set(node.id, node);
    return node;
  };

  const Rx = portrait ? 2.7 : 3.5;
  const Ry = portrait ? 2.9 : 2.5;
  const svcSize: Vec3 = portrait ? [1.72, 0.66, 0.3] : [1.86, 0.64, 0.3];
  const flow = portrait ? 6.2 : 7.3;

  add({
    id: 'core',
    label: 'Commerce core',
    sub: '100+ APIs scoped',
    kind: 'core',
    shape: 'oct',
    pos: [0, 0, 0],
    size: [1.9, 2.0, 1.9],
    tone: 'core',
    labelSize: 0.2,
    labelAt: [0, -1.5, 0.2],
    labelBox: [3.2, 0.9],
    plate: true,
    group: 'mesh',
    order: 0,
  });

  cloudCommerceServiceIds.forEach((id, k) => {
    const a = ((90 - 22.5 - 45 * k) * Math.PI) / 180;
    const n = nodeOf(arch, id);
    add({
      id,
      label: n.label,
      kind: 'service',
      shape: 'slab',
      pos: [Math.cos(a) * Rx, Math.sin(a) * Ry, k % 2 === 0 ? 0.3 : -0.15],
      size: svcSize,
      labelSize: portrait ? 0.18 : 0.17,
      group: 'mesh',
      order: 0.15 + k * 0.07,
    });
  });

  add({
    id: 'sap',
    label: 'SAP',
    sub: 'SOURCE',
    kind: 'legacy',
    shape: 'cyl',
    pos: portrait ? [0, flow, 0] : [-flow, 0, 0],
    size: portrait ? [2.6, 1.5, 2.6] : [1.9, 3.1, 1.9],
    tone: 'slate',
    labelSize: 0.3,
    labelAt: [0, 0, portrait ? 1.35 : 0.97],
    labelBox: [1.7, 0.9],
    group: 'source',
    order: 0.78,
  });
  add({
    id: 'cloud',
    label: 'Cloud',
    sub: 'TARGET',
    kind: 'cloud',
    shape: 'stack',
    pos: portrait ? [0, -flow, 0] : [flow, 0, 0],
    size: portrait ? [3.0, 1.6, 2.0] : [2.8, 2.0, 1.9],
    tone: 'soft',
    labelSize: 0.28,
    labelAt: [0, 0.1, 1.04],
    labelBox: [2.4, 0.9],
    group: 'target',
    order: 0.9,
  });

  const core = at.get('core') as SceneNode;
  const sap = at.get('sap') as SceneNode;
  const cloud = at.get('cloud') as SceneNode;
  const routes: SceneRoute[] = [];
  for (const e of arch.edges) {
    const a = at.get(e.from);
    const b = at.get(e.to);
    if (!a || !b) continue;
    if (e.kind === 'flow') {
      if (a === sap) routes.push(route(e, portrait ? [face(sap, 'b', 0), face(core, 't', -0.2)] : [face(sap, 'r'), face(core, 'l', -0.2)]));
      else routes.push(route(e, portrait ? [face(core, 'b', -0.2), face(cloud, 't')] : [face(core, 'r', -0.2), face(cloud, 'l')]));
    } else if (e.kind === 'call') {
      const dir = facing(b, core);
      const dx = a.pos[0] - b.pos[0];
      const dy = a.pos[1] - b.pos[1];
      const len = Math.hypot(dx, dy) || 1;
      const start: Vec3 = [core.pos[0] - (dx / len) * 0.78, core.pos[1] - (dy / len) * 0.78, 0];
      routes.push(route(e, [start, face(b, dir.from)]));
    } else {
      const f = facing(a, b);
      routes.push(route(e, [face(a, f.from), face(b, f.to)], { packets: false }));
    }
  }

  if (portrait) {
    plates.push({ id: 'zone-source', label: 'SOURCE', pos: [0, flow, -1.0], size: [5.0, 2.6], plane: 'xy', tone: 'slate' });
    plates.push({ id: 'zone-target', label: 'TARGET', pos: [0, -flow, -1.0], size: [5.0, 2.6], plane: 'xy', tone: 'cyan' });
  } else {
    plates.push({ id: 'zone-source', label: 'SOURCE', pos: [-flow, 0, -1.0], size: [3.2, 5.0], plane: 'xy', tone: 'slate' });
    plates.push({ id: 'zone-target', label: 'TARGET', pos: [flow, 0, -1.0], size: [3.4, 5.0], plane: 'xy', tone: 'cyan' });
  }

  return {
    id: arch.id,
    nodes,
    routes,
    plates,
    extent: extentOf(nodes, plates, routes),
    rot: { x: 0.18, y: -0.2 },
    startIds: ['sap'],
    decor: ['orbits'],
    clusters: [],
    initialOpen: null,
    legend: ['flow', 'call', 'mesh'],
  };
}
