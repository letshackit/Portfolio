import { describe, expect, it } from 'vitest';
import {
  beginDrag,
  createTurntable,
  dragBy,
  endDrag,
  headWeight,
  nudge,
  stepTurntable,
  toFront,
  TURNTABLE,
  wrap,
  type StepInput,
  type Turntable,
} from '../hero/v2/stage/turntable';

const LIVE: StepInput = { reduced: false, hold: false };
const TAU = Math.PI * 2;

function run(t: Turntable, seconds: number, input: StepInput = LIVE, dt = 1 / 60): void {
  for (let i = 0; i < Math.round(seconds / dt); i += 1) stepTurntable(t, dt, input);
}

describe('turntable state machine', () => {
  it('rests for the idle delay, then eases into a slow spin of one turn per period', () => {
    const t = createTurntable();
    run(t, TURNTABLE.idleDelay - 0.2);
    expect(t.mode).toBe('rest');
    expect(t.angle).toBe(0);
    run(t, 0.4);
    expect(t.mode).toBe('spin');
    // Eases in: the first half second moves far less than full speed would.
    const start = t.angle;
    run(t, 0.5);
    expect(t.angle - start).toBeLessThan((TAU / TURNTABLE.spinPeriod) * 0.5 * 0.5);
    // Once eased in, a full period is (almost exactly) one revolution.
    run(t, 12);
    const a = t.angle;
    run(t, TURNTABLE.spinPeriod);
    expect(t.angle - a).toBeCloseTo(TAU, 1);
  });

  it('never auto-spins under reduced motion, but a drag still turns him', () => {
    const t = createTurntable();
    run(t, 20, { reduced: true, hold: false });
    expect(t.mode).toBe('rest');
    expect(t.angle).toBe(0);
    beginDrag(t);
    dragBy(t, 0.5, 0.016);
    expect(t.angle).toBeCloseTo(0.5);
    expect(t.mode).toBe('drag');
  });

  it('follows the pointer while dragging and ignores the clock', () => {
    const t = createTurntable();
    beginDrag(t);
    dragBy(t, 0.3, 0.016);
    dragBy(t, -0.1, 0.016);
    run(t, 5);
    expect(t.mode).toBe('drag');
    expect(t.angle).toBeCloseTo(0.2);
  });

  it('coasts after a fast release, with friction, and comes to rest', () => {
    const t = createTurntable();
    beginDrag(t);
    for (let i = 0; i < 6; i += 1) dragBy(t, 0.08, 0.016);
    endDrag(t, 0.01);
    expect(t.mode).toBe('coast');
    const released = t.angle;
    const v0 = t.velocity;
    expect(v0).toBeGreaterThan(1);
    run(t, 0.3);
    expect(t.velocity).toBeLessThan(v0 * 0.5);
    expect(t.angle).toBeGreaterThan(released);
    run(t, 4);
    expect(t.mode).toBe('rest');
    expect(t.velocity).toBe(0);
  });

  it('gives no throw when the pointer stopped before it was lifted', () => {
    const t = createTurntable();
    beginDrag(t);
    for (let i = 0; i < 6; i += 1) dragBy(t, 0.08, 0.016);
    endDrag(t, 0.5);
    expect(t.mode).toBe('rest');
    expect(t.velocity).toBe(0);
  });

  it('clamps a wild fling to the maximum speed', () => {
    const t = createTurntable();
    beginDrag(t);
    for (let i = 0; i < 6; i += 1) dragBy(t, 5, 0.016);
    endDrag(t, 0);
    expect(Math.abs(t.velocity)).toBeLessThanOrEqual(TURNTABLE.maxVelocity);
  });

  it('eases back to front after the idle delay, then resumes the spin', () => {
    const t = createTurntable();
    beginDrag(t);
    dragBy(t, 1.2, 0);
    endDrag(t, 1);
    run(t, TURNTABLE.idleDelay - 0.3);
    expect(t.mode).toBe('rest');
    expect(t.angle).toBeCloseTo(1.2);
    run(t, 0.5);
    expect(t.mode).toBe('return');
    run(t, 0.4);
    expect(Math.abs(toFront(t.angle))).toBeLessThan(1.2);
    run(t, 4);
    expect(t.mode).toBe('spin');
    expect(Math.abs(wrap(t.angle))).toBeLessThan(1);
  });

  it('returns by the short way round after he has turned more than a half revolution', () => {
    const t = createTurntable();
    t.angle = TAU * 1.9;
    t.mode = 'return';
    stepTurntable(t, 0.1, LIVE);
    expect(t.angle).toBeGreaterThan(TAU * 1.9);
    expect(toFront(TAU * 1.9)).toBeCloseTo(TAU * 0.1);
  });

  it('does not spin, and squares up to the camera, while the scroll beat holds', () => {
    const t = createTurntable();
    beginDrag(t);
    dragBy(t, 2, 0);
    endDrag(t, 1);
    run(t, 6, { reduced: false, hold: true });
    expect(t.mode).toBe('rest');
    expect(t.angle).toBeCloseTo(0, 2);
    run(t, 10, { reduced: false, hold: true });
    expect(t.mode).toBe('rest');
    expect(t.angle).toBeCloseTo(0, 2);
    // Back at the top of the page the spin comes back after the idle delay.
    run(t, TURNTABLE.idleDelay + 0.5);
    expect(t.mode).toBe('spin');
  });

  it('drops a running spin into a return when the beat takes over', () => {
    const t = createTurntable();
    run(t, 8);
    expect(t.mode).toBe('spin');
    stepTurntable(t, 0.016, { reduced: false, hold: true });
    expect(t.mode).toBe('return');
  });

  it('turns by a key step, coasts, and stops', () => {
    const t = createTurntable();
    nudge(t, 1);
    run(t, 4);
    expect(t.angle).toBeGreaterThan(TURNTABLE.keyStep * 0.8);
    expect(t.angle).toBeLessThan(TURNTABLE.keyStep * 1.2);
    nudge(t, -1);
    run(t, 4);
    expect(t.angle).toBeCloseTo(0, 1);
  });

  it('weights head tracking: live at the front, off while turned away or being turned', () => {
    const t = createTurntable();
    expect(headWeight(t)).toBe(1);
    t.angle = 0.2;
    expect(headWeight(t)).toBe(1);
    t.angle = Math.PI;
    expect(headWeight(t)).toBe(0);
    t.angle = TAU;
    expect(headWeight(t)).toBe(1);
    beginDrag(t);
    t.angle = 0;
    expect(headWeight(t)).toBe(0);
    endDrag(t, 1);
    expect(headWeight(t)).toBe(1);
  });
});
