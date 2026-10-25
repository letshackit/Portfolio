import { describe, expect, it } from 'vitest';
import { createWatchdog } from '../hero/three/FrameWatchdog';
import { createSim, MAX_STEP } from '../hero/three/packetSim';
import { resetWebGLProbe, supportsWebGL } from '../lib/webgl';

const LENGTHS = [1.5, 1.5, 1.5, 1.5, 1.5, 1.5];
const fixed = { rng: () => 0.5, prewarm: 0 };

function run(sim: ReturnType<typeof createSim>, seconds: number, dt = 1 / 60) {
  const arrivals: number[] = [];
  for (let t = 0; t < seconds; t += dt) for (const a of sim.step(dt)) arrivals.push(a.stage);
  return arrivals;
}

describe('packetSim', () => {
  it('spawns the first packet at stage 0 and reaches every stage in order', () => {
    const sim = createSim(LENGTHS, { ...fixed, spawnInterval: 1000 });
    const arrivals = run(sim, 12);
    expect(arrivals.slice(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('takes about edge length / speed seconds per edge, plus the dwell', () => {
    const sim = createSim([1.1], { ...fixed, spawnInterval: 1000 });
    let elapsed = 0;
    let arrivedAt = -1;
    while (arrivedAt < 0 && elapsed < 5) {
      elapsed += 1 / 60;
      if (sim.step(1 / 60).some((a) => a.stage === 1)) arrivedAt = elapsed;
    }
    expect(arrivedAt).toBeGreaterThan(0.95);
    expect(arrivedAt).toBeLessThan(1.1);
  });

  it('retires a packet after the dwell at the last stage, freeing its slot', () => {
    const sim = createSim([0.5], { ...fixed, spawnInterval: 1000, dwell: 0.1 });
    run(sim, 0.2);
    expect(sim.liveCount()).toBe(1);
    run(sim, 1.5);
    expect(sim.liveCount()).toBe(0);
  });

  it('clamps a long step so a tab switch cannot teleport a packet', () => {
    const sim = createSim(LENGTHS, { ...fixed, spawnInterval: 1000 });
    sim.step(0.001);
    sim.step(60);
    const p = sim.packets.find((x) => x.alive);
    expect(p?.edge).toBe(0);
    expect(p?.t).toBeLessThanOrEqual((MAX_STEP * 1.1) / 1.5 + 0.01);
  });

  it('never exceeds the live cap and honours setMaxLive', () => {
    const sim = createSim(LENGTHS, { ...fixed, spawnInterval: 0.05, spawnJitter: 0 });
    run(sim, 20);
    expect(sim.liveCount()).toBeLessThanOrEqual(24);
    sim.setMaxLive(3);
    run(sim, 30);
    expect(sim.liveCount()).toBeLessThanOrEqual(3);
    sim.setMaxLive(999);
    run(sim, 20);
    expect(sim.liveCount()).toBeLessThanOrEqual(24);
  });

  it('prewarms so the hero does not start empty, near the steady-state count', () => {
    const sim = createSim(LENGTHS, { rng: () => 0.5 });
    expect(sim.liveCount()).toBeGreaterThan(6);
    expect(sim.liveCount()).toBeLessThanOrEqual(24);
  });

  it('keeps progress within bounds and edges within range', () => {
    const sim = createSim(LENGTHS, { rng: Math.random });
    for (let i = 0; i < 2000; i += 1) {
      sim.step(1 / 60);
      for (const p of sim.packets) {
        if (!p.alive) continue;
        expect(p.t).toBeGreaterThanOrEqual(0);
        expect(p.t).toBeLessThanOrEqual(1);
        expect(p.edge).toBeGreaterThanOrEqual(0);
        expect(p.edge).toBeLessThan(LENGTHS.length);
      }
    }
  });
});

describe('FrameWatchdog', () => {
  const frames = (w: ReturnType<typeof createWatchdog>, n: number, ms: number) => {
    for (let i = 0; i < n; i += 1) w.tick(ms / 1000);
  };

  it('does nothing at a healthy frame rate', () => {
    const calls: string[] = [];
    const w = createWatchdog({ onDegrade: () => calls.push('degrade'), onFail: () => calls.push('fail') });
    frames(w, 600, 16);
    expect(calls).toEqual([]);
  });

  it('degrades once on a slow mean, then fails if it stays slow', () => {
    const calls: string[] = [];
    const w = createWatchdog({ onDegrade: () => calls.push('degrade'), onFail: () => calls.push('fail') });
    frames(w, 30 + 180, 36);
    expect(calls).toEqual(['degrade']);
    frames(w, 10 + 180, 45);
    expect(calls).toEqual(['degrade', 'fail']);
  });

  it('recovers after degrading when the second window is fine', () => {
    const calls: string[] = [];
    const w = createWatchdog({ onDegrade: () => calls.push('degrade'), onFail: () => calls.push('fail') });
    frames(w, 210, 36);
    frames(w, 400, 20);
    expect(calls).toEqual(['degrade']);
  });

  it('ignores the long delta of a resumed loop', () => {
    const calls: string[] = [];
    const w = createWatchdog({ onDegrade: () => calls.push('degrade'), onFail: () => calls.push('fail') });
    frames(w, 30, 16);
    w.tick(5);
    frames(w, 400, 16);
    expect(calls).toEqual([]);
  });
});

describe('supportsWebGL', () => {
  it('is false where no context can be made (jsdom) and caches the answer', () => {
    resetWebGLProbe();
    expect(supportsWebGL()).toBe(false);
    expect(supportsWebGL()).toBe(false);
  });
});
