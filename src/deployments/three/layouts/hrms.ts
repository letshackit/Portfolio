/**
 * HRMS: the modular monolith as a glass reactor. One shell holds seven cluster pods (the 29 modules, grouped), the
 * outbox and the Postgres base; an event-bus ring circles under it and feeds five satellite services on the right.
 * A cluster opens: its modules lift out of the pod and line up in a tray in front, named. Landscape only has the tray;
 * on a phone the cluster lights up and the readout names its modules.
 */
import type { BayArchitecture } from '../../../data/bay-architecture.types';
import { hrmsClusterIds } from '../../../data/hrms-architecture';
import { extentOf, makeNode, type SceneNode, type ScenePlate, type SceneRoute, type SceneSpec, type Vec3 } from '../spec';
import { face, nodeOf, route, type LayoutOptions } from './common';

const SATELLITES = ['notifications', 'doc-gen', 'payroll-adapter', 'ai-assistant', 'analytics'] as const;

export function hrmsLayout(arch: BayArchitecture, { portrait }: LayoutOptions): SceneSpec {
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

  const S = portrait ? 2.2 : 2.05;
  const cx = portrait ? 0 : -1.2;
  const podSize: Vec3 = portrait ? [2.0, 1.44, 0.9] : [1.92, 1.62, 0.9];
  const rowStep = portrait ? 1.62 : 1.86;
  const cols = portrait ? 2 : 4;
  const slots = hrmsClusterIds.length + 1; // seven pods and the outbox
  const rows = Math.ceil(slots / cols);
  const topY = portrait ? 2.7 : 1.2;
  const slotPos = (i: number): Vec3 => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    return [cx + (c - (cols - 1) / 2) * S, topY - r * rowStep, 0];
  };
  const bottomPodY = topY - (rows - 1) * rowStep;
  const pgY = bottomPodY - podSize[1] / 2 - 0.62;
  const shellTop = topY + podSize[1] / 2 + 0.5;
  const shellBottom = pgY - 0.42;
  const shellH = shellTop - shellBottom;
  const shellW = cols * S + 0.5;

  add({
    id: 'core-shell',
    label: 'MODULAR MONOLITH',
    sub: '29 modules',
    kind: 'core',
    shape: 'shell',
    pos: [cx, (shellTop + shellBottom) / 2, 0],
    size: [shellW, shellH, 2.2],
    tone: 'core',
    labelSize: 0.2,
    labelAt: [-shellW / 2 + 1.6, shellH / 2 + 0.3, 0],
    labelBox: [3.2, 0.5],
    group: 'core',
    order: 0,
    pick: false,
  });

  // Postgres base.
  add({
    id: 'postgres',
    label: nodeOf(arch, 'postgres').label,
    kind: 'store',
    shape: 'slab',
    pos: [cx, pgY, 0],
    size: [shellW - 0.7, 0.4, 1.3],
    tone: 'soft',
    labelSize: portrait ? 0.16 : 0.15,
    group: 'core',
    order: 0.1,
  });

  // Cluster pods and their modules.
  const counts = new Map<string, number>();
  for (const n of arch.nodes) if (n.kind === 'module') counts.set(n.group, (counts.get(n.group) ?? 0) + 1);
  hrmsClusterIds.forEach((id, ci) => {
    const group = arch.groups.find((g) => g.id === id);
    add({
      id,
      label: group?.label ?? id,
      sub: `${counts.get(id) ?? 0} modules`,
      kind: 'cluster',
      shape: 'slab',
      pos: slotPos(ci),
      size: podSize,
      labelSize: portrait ? 0.16 : 0.15,
      labelAt: [0, podSize[1] / 2 - 0.3, podSize[2] / 2 + 0.014],
      labelBox: [podSize[0] - 0.1, 0.56],
      group: id,
      order: 0.2 + ci * 0.045,
    });
  });
  add({
    id: 'outbox',
    label: nodeOf(arch, 'outbox').label,
    kind: 'outbox',
    shape: 'slab',
    pos: slotPos(hrmsClusterIds.length),
    size: [podSize[0], 0.74, 0.7],
    tone: 'soft',
    labelSize: portrait ? 0.15 : 0.15,
    group: 'core',
    order: 0.55,
  });

  const trayY = portrait ? 0 : pgY - 3.2;
  hrmsClusterIds.forEach((cid, ci) => {
    const pod = at.get(cid) as SceneNode;
    const mods = arch.nodes.filter((n) => n.kind === 'module' && n.group === cid);
    const cc = mods.length <= 2 ? mods.length : mods.length <= 4 ? 2 : 3;
    const rr = Math.ceil(mods.length / cc);
    mods.forEach((m, mi) => {
      const r = Math.floor(mi / cc);
      const c = mi % cc;
      const rest: Vec3 = [pod.pos[0] + (c - (cc - 1) / 2) * 0.48, pod.pos[1] - 0.34 - (r - (rr - 1) / 2) * 0.38, 0];
      add({
        id: m.id,
        label: m.label,
        kind: 'module',
        shape: 'slab',
        pos: rest,
        size: [0.38, 0.32, 0.32],
        labelSize: portrait ? 0 : 0.15,
        labelAt: [0, 0, 0.19],
        labelBox: [1.62, 0.62],
        group: cid,
        order: 0.5 + ci * 0.04 + mi * 0.008,
        parent: cid,
        open: portrait
          ? undefined
          : { pos: [cx + (mi - (mods.length - 1) / 2) * 1.82, trayY, 1.7], size: [1.68, 0.62, 0.3] },
      });
    });
  });

  // Event bus: a belt under the shell.
  const ringY = shellBottom - 0.35;
  const rx = shellW / 2 + (portrait ? 0.9 : 1.05);
  const rz = portrait ? 1.9 : 2.5;
  add({
    id: 'bus',
    label: 'EVENT BUS',
    kind: 'bus',
    shape: 'ring',
    pos: [cx, ringY, 0],
    size: [rx * 2, 0.12, rz * 2],
    tone: 'core',
    labelSize: 0.17,
    labelAt: [0, 0.26, rz + 0.04],
    labelBox: [2.2, 0.34],
    group: 'core',
    order: 0.62,
  });

  // Satellites.
  const satX = portrait ? 0 : cx + rx + 3.0;
  const satSize: Vec3 = portrait ? [2.0, 0.72, 0.3] : [2.0, 0.72, 0.3];
  const satTop = portrait ? ringY - rz - 1.0 : 2.2;
  SATELLITES.forEach((id, i) => {
    const n = nodeOf(arch, id);
    const sx = portrait ? (i % 2 === 0 ? -1.15 : 1.15) : satX;
    const sy = portrait ? satTop - Math.floor(i / 2) * 0.95 : satTop - i * 1.1;
    add({
      id,
      label: n.label,
      kind: 'satellite',
      shape: 'slab',
      pos: [sx, sy, 0],
      size: satSize,
      tone: 'cyan',
      labelSize: 0.16,
      group: 'satellites',
      order: 0.8 + i * 0.03,
    });
  });
  const pa = at.get('payroll-adapter') as SceneNode;
  const vn = nodeOf(arch, 'payroll-vendor');
  add({
    id: 'payroll-vendor',
    label: vn.label,
    sub: 'EXTERNAL',
    kind: 'external',
    shape: 'slab',
    pos: portrait ? [1.15, satTop - 2 * 0.95, 0] : [pa.pos[0] + 3.0, pa.pos[1], 0],
    size: [1.7, 0.7, 0.3],
    tone: 'slate',
    labelSize: 0.15,
    group: 'satellites',
    order: 0.95,
  });

  // Routes.
  const routes: SceneRoute[] = [];
  const bus = at.get('bus') as SceneNode;
  const ringPoint = (x: number, front: boolean): Vec3 => {
    const k = Math.min(0.98, Math.abs(x - cx) / rx);
    const z = rz * Math.sqrt(1 - k * k) * (front ? 1 : -1);
    return [x, ringY, z];
  };
  const BACK = -0.82;
  for (const e of arch.edges) {
    const a = at.get(e.from);
    const b = at.get(e.to);
    if (!a || !b) continue;
    if (b.id === 'postgres' && a.kind === 'cluster') {
      routes.push(route(e, [[a.pos[0], a.pos[1] - a.size[1] / 2, BACK], [a.pos[0], b.pos[1], BACK]], { backplane: true, packets: false }));
    } else if (e.from === 'postgres' && e.to === 'outbox') {
      routes.push(route(e, [[b.pos[0], a.pos[1] + a.size[1] / 2, 0], [b.pos[0], b.pos[1] - b.size[1] / 2, 0]], { packets: true }));
    } else if (e.from === 'outbox' && e.to === 'bus') {
      const x = a.pos[0] + 0.6;
      routes.push(route(e, [[x, a.pos[1] - a.size[1] / 2, 0.2], [x, a.pos[1] - a.size[1] / 2 - 0.3, 0.95], [x, ringY, 0.95], ringPoint(x, true)]));
    } else if (e.from === 'bus') {
      if (portrait) {
        routes.push(route(e, [ringPoint(0, true), [0, ringY - 0.45, 0.3], [0, b.pos[1], 0], face(b, b.pos[0] < 0 ? 'r' : 'l')]));
      } else {
        const trunk = bus.pos[0] + rx + 0.7;
        routes.push(route(e, [ringPoint(bus.pos[0] + rx - 0.001, true), [trunk, ringY, 0], [trunk, b.pos[1], 0], face(b, 'l')]));
      }
    } else {
      routes.push(route(e, [face(a, 'r'), face(b, 'l')]));
    }
  }

  plates.push({
    id: 'tray',
    label: 'OPEN CLUSTER',
    pos: [cx, trayY, 1.7],
    size: [8.9, 1.2],
    plane: 'xy',
    tone: 'cyan',
  });
  const livePlates = portrait ? plates.filter((p) => p.id !== 'tray') : plates;
  const extent = extentOf(nodes, livePlates, routes);
  return {
    id: arch.id,
    nodes,
    routes,
    plates: livePlates,
    extent,
    rot: { x: 0.24, y: -0.22 },
    startIds: ['postgres'],
    decor: ['bus-loop'],
    clusters: [...hrmsClusterIds],
    initialOpen: hrmsClusterIds[0] ?? null,
    legend: ['call', 'event'],
  };
}
