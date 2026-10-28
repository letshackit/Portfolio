/**
 * Amber packets that ride the routes. Each starts on a route leaving one of the start nodes, follows the route's
 * direction, and on arrival picks one of the target's outgoing routes at random; at a dead end it respawns at a start
 * node. Pure and seedable so it runs the same on every visit and can be tested without WebGL.
 */
import type { SceneRoute, Vec3 } from './spec';

export interface Packet {
  route: number;
  /** Distance travelled along the route. */
  s: number;
  speed: number;
  /** Seconds to wait before (re)starting. */
  wait: number;
}

interface Measured {
  readonly route: SceneRoute;
  readonly cumulative: readonly number[];
  readonly length: number;
}

export interface PacketSim {
  readonly packets: Packet[];
  step(dt: number, onArrive: (nodeId: string) => void): void;
  /** World position of packet `i`, `back` units behind its head along the route (for trails). */
  positionOf(i: number, back: number, out: [number, number, number]): void;
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

function measure(route: SceneRoute): Measured {
  const cumulative: number[] = [0];
  for (let i = 1; i < route.points.length; i += 1) {
    const p = route.points[i - 1] as Vec3;
    const q = route.points[i] as Vec3;
    cumulative.push((cumulative[i - 1] as number) + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
  }
  return { route, cumulative, length: cumulative[cumulative.length - 1] as number };
}

export function createPacketSim(routes: readonly SceneRoute[], count: number, startIds: readonly string[], seed = 11): PacketSim {
  const ridable = routes.filter((r) => r.packets);
  const measured = ridable.map(measure);
  const rand = mulberry32(seed);
  const outgoing = new Map<string, number[]>();
  measured.forEach((m, i) => {
    const list = outgoing.get(m.route.from) ?? [];
    list.push(i);
    outgoing.set(m.route.from, list);
  });
  const starts = startIds.flatMap((id) => outgoing.get(id) ?? []);
  const fallback = measured.length > 0 ? [0] : [];

  const fresh = (): Packet => {
    const pool = starts.length > 0 ? starts : fallback;
    return {
      route: pool.length > 0 ? (pool[Math.floor(rand() * pool.length)] as number) : 0,
      s: 0,
      speed: 1.6 + rand() * 1.5,
      wait: rand() * 3,
    };
  };
  const packets = Array.from({ length: measured.length > 0 ? count : 0 }, fresh);

  return {
    packets,
    step(dt, onArrive) {
      for (const p of packets) {
        if (p.wait > 0) {
          p.wait -= dt;
          continue;
        }
        const m = measured[p.route] as Measured;
        p.s += p.speed * dt;
        if (p.s < m.length) continue;
        onArrive(m.route.to);
        const next = outgoing.get(m.route.to);
        if (next && next.length > 0) {
          p.route = next[Math.floor(rand() * next.length)] as number;
          p.s = 0;
        } else {
          Object.assign(p, fresh(), { wait: 0.3 + rand() * 1.4 });
        }
      }
    },
    positionOf(i, back, out) {
      const p = packets[i];
      if (!p) return;
      const m = measured[p.route] as Measured;
      const pts = m.route.points;
      const s = Math.min(Math.max(p.s - back, 0), m.length);
      let k = 1;
      while (k < pts.length - 1 && (m.cumulative[k] as number) < s) k += 1;
      const a = pts[k - 1] as Vec3;
      const b = pts[k] as Vec3;
      const span = (m.cumulative[k] as number) - (m.cumulative[k - 1] as number);
      const t = span > 0 ? (s - (m.cumulative[k - 1] as number)) / span : 0;
      out[0] = a[0] + (b[0] - a[0]) * t;
      out[1] = a[1] + (b[1] - a[1]) * t;
      out[2] = a[2] + (b[2] - a[2]) * t;
    },
  };
}
