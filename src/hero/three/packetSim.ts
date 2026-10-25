/**
 * Packet simulation for the 3D hero (architecture C.3). Framework-free: no three, no React, so it can be unit tested.
 * All times are in seconds, lengths in world units. The renderer reads `packets` after each `step`.
 */

export interface Packet {
  /** Edge the packet is on (edge i runs from stage i to stage i + 1). */
  edge: number;
  /** Progress along the edge, 0..1 by arc length. */
  t: number;
  /** Seconds left dwelling at the stage the packet just reached; 0 while travelling. */
  dwell: number;
  alive: boolean;
}

/** A packet reached a stage (including stage 0 at spawn). */
export interface Arrival {
  readonly stage: number;
}

export interface SimOptions {
  /** World units per second. */
  readonly speed: number;
  /** Mean seconds between spawns. */
  readonly spawnInterval: number;
  /** Spawn interval varies uniformly by plus or minus this many seconds. */
  readonly spawnJitter: number;
  /** Seconds a packet rests at each stage it reaches. */
  readonly dwell: number;
  /** Most packets alive at once; also the size of the packet pool. */
  readonly maxLive: number;
  /** Seconds to simulate at creation so the hero does not start empty. */
  readonly prewarm: number;
  /** Random source in [0, 1); injectable for tests. */
  readonly rng: () => number;
}

export const SIM_DEFAULTS: SimOptions = {
  speed: 1.1,
  spawnInterval: 0.8,
  spawnJitter: 0.3,
  dwell: 0.25,
  maxLive: 24,
  prewarm: 9,
  rng: Math.random,
};

/** Longest single step; a tab switch must not teleport packets. */
export const MAX_STEP = 0.05;
const PREWARM_STEP = 1 / 30;

export interface PacketSim {
  readonly packets: ReadonlyArray<Packet>;
  /** Advance by dt seconds (clamped to 50 ms) and return the stage arrivals that happened. */
  step(dt: number): Arrival[];
  /** Lower or raise the live cap (the watchdog uses this); never above the pool size. */
  setMaxLive(n: number): void;
  readonly liveCount: () => number;
}

export function createSim(edgeLengths: ReadonlyArray<number>, options: Partial<SimOptions> = {}): PacketSim {
  const opts: SimOptions = { ...SIM_DEFAULTS, ...options };
  const pool = opts.maxLive;
  const lastEdge = edgeLengths.length - 1;
  const packets: Packet[] = Array.from({ length: pool }, () => ({ edge: 0, t: 0, dwell: 0, alive: false }));
  let cap = pool;
  let spawnTimer = 0;

  const liveCount = () => packets.reduce((n, p) => n + (p.alive ? 1 : 0), 0);

  const nextInterval = () => {
    const v = opts.spawnInterval + (opts.rng() * 2 - 1) * opts.spawnJitter;
    return v > 0 ? v : opts.spawnInterval;
  };

  const spawn = (arrivals: Arrival[]) => {
    const slot = packets.find((p) => !p.alive);
    if (!slot) return;
    slot.edge = 0;
    slot.t = 0;
    slot.dwell = 0;
    slot.alive = true;
    arrivals.push({ stage: 0 });
  };

  /** Leave a stage: move to the next edge, or retire after the last stage. */
  const depart = (p: Packet) => {
    p.dwell = 0;
    if (p.edge >= lastEdge) {
      p.alive = false;
    } else {
      p.edge += 1;
      p.t = 0;
    }
  };

  const advance = (d: number, arrivals: Arrival[]) => {
    spawnTimer -= d;
    if (spawnTimer <= 0) {
      if (liveCount() < cap) spawn(arrivals);
      spawnTimer += nextInterval();
    }
    for (const p of packets) {
      if (!p.alive) continue;
      if (p.dwell > 0) {
        p.dwell -= d;
        if (p.dwell <= 0) depart(p);
        continue;
      }
      p.t += (d * opts.speed) / edgeLengths[p.edge];
      if (p.t >= 1) {
        p.t = 1;
        arrivals.push({ stage: p.edge + 1 });
        p.dwell = opts.dwell;
        if (p.dwell <= 0) depart(p);
      }
    }
  };

  for (let elapsed = 0; elapsed < opts.prewarm; elapsed += PREWARM_STEP) advance(PREWARM_STEP, []);

  return {
    packets,
    liveCount,
    step(dt) {
      const arrivals: Arrival[] = [];
      advance(Math.min(Math.max(dt, 0), MAX_STEP), arrivals);
      return arrivals;
    },
    setMaxLive(n) {
      cap = Math.max(0, Math.min(Math.floor(n), pool));
    },
  };
}
