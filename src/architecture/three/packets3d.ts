/**
 * Amber packets that ride the routes: each starts at the front end, follows the edge direction, and on arrival
 * picks one of the target's outgoing routes at random. When a packet reaches a dead end it respawns at the front
 * end. Pure and seedable so it can be tested without WebGL.
 */
import type { Route3D, Vec3 } from './layout3d';

export interface PacketState {
  route: number;
  /** Distance travelled along the route. */
  s: number;
  speed: number;
  /** Seconds to wait before (re)starting. */
  wait: number;
}

export interface RouteGeometry {
  readonly route: Route3D;
  readonly cumulative: readonly number[];
  readonly length: number;
}

export interface PacketSim {
  readonly packets: PacketState[];
  readonly geometry: readonly RouteGeometry[];
  /** Advance by `dt` seconds; `onArrive(blockId)` fires when a packet reaches the end of a route. */
  step(dt: number, onArrive: (blockId: string) => void): void;
  /** World position of a packet. */
  positionOf(i: number, out: [number, number, number]): void;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function measure(route: Route3D): RouteGeometry {
  const cumulative: number[] = [0];
  for (let i = 1; i < route.points.length; i += 1) {
    const p = route.points[i - 1] as Vec3;
    const q = route.points[i] as Vec3;
    cumulative.push((cumulative[i - 1] as number) + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
  }
  return { route, cumulative, length: cumulative[cumulative.length - 1] as number };
}

export function createPacketSim(routes: readonly Route3D[], count: number, startId: string, seed = 7): PacketSim {
  const geometry = routes.map(measure);
  const rand = mulberry32(seed);
  const outgoing = new Map<string, number[]>();
  geometry.forEach((g, i) => {
    const list = outgoing.get(g.route.from) ?? [];
    list.push(i);
    outgoing.set(g.route.from, list);
  });
  const starts = outgoing.get(startId) ?? (routes.length > 0 ? [0] : []);

  const fresh = (): PacketState => ({
    route: starts.length > 0 ? (starts[Math.floor(rand() * starts.length)] as number) : 0,
    s: 0,
    speed: 1.5 + rand() * 1.4,
    wait: rand() * 3,
  });
  const packets = Array.from({ length: routes.length > 0 ? count : 0 }, fresh);

  return {
    packets,
    geometry,
    step(dt, onArrive) {
      for (const p of packets) {
        if (p.wait > 0) {
          p.wait -= dt;
          continue;
        }
        const g = geometry[p.route] as RouteGeometry;
        p.s += p.speed * dt;
        if (p.s < g.length) continue;
        onArrive(g.route.to);
        const next = outgoing.get(g.route.to);
        if (next && next.length > 0) {
          p.route = next[Math.floor(rand() * next.length)] as number;
          p.s = 0;
        } else {
          Object.assign(p, fresh(), { wait: 0.4 + rand() * 1.6 });
        }
      }
    },
    positionOf(i, out) {
      const p = packets[i];
      if (!p) return;
      const g = geometry[p.route] as RouteGeometry;
      const pts = g.route.points;
      const s = Math.min(Math.max(p.s, 0), g.length);
      let k = 1;
      while (k < pts.length - 1 && (g.cumulative[k] as number) < s) k += 1;
      const a = pts[k - 1] as Vec3;
      const b = pts[k] as Vec3;
      const span = (g.cumulative[k] as number) - (g.cumulative[k - 1] as number);
      const t = span > 0 ? (s - (g.cumulative[k - 1] as number)) / span : 0;
      out[0] = a[0] + (b[0] - a[0]) * t;
      out[1] = a[1] + (b[1] - a[1]) * t;
      out[2] = a[2] + (b[2] - a[2]) * t;
    },
  };
}
