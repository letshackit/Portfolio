/**
 * The avatar's turntable: a pure state machine, no three, no React. The caller feeds it drag deltas, key presses and
 * the frame time; it owns the yaw offset (radians, relative to the avatar's front-facing pose) and says how much of
 * the head tracking should be live.
 *
 *   rest   : at rest; counts idle seconds after the last interaction (or from the start).
 *   spin   : slow auto-rotate, eased in; one revolution per SPIN_PERIOD seconds.
 *   drag   : the pointer owns the angle.
 *   coast  : released with speed; friction takes it down.
 *   return : ease back to the nearest front-facing angle, then spin resumes.
 */
export type Mode = 'rest' | 'spin' | 'drag' | 'coast' | 'return';

export const TURNTABLE = {
  /** Seconds without interaction before the avatar returns to front and then spins. */
  idleDelay: 3,
  /** Seconds per revolution. */
  spinPeriod: 45,
  /** Time constant (s) of the spin's ease-in. */
  spinEase: 1.6,
  /** Velocity decay rate (1/s) of the coast after a drag. */
  friction: 3.4,
  /** Rate (1/s) of the exponential ease back to front. */
  returnRate: 2.6,
  /** Fastest release speed, rad/s. */
  maxVelocity: 7,
  /** Below this speed (rad/s) the coast is over. */
  restSpeed: 0.04,
  /** Angle step of one arrow-key press, radians. */
  keyStep: Math.PI / 8,
  /** Within this many radians of front the return snaps home. */
  snap: 0.004,
} as const;

const TAU = Math.PI * 2;
const SPIN_SPEED = TAU / TURNTABLE.spinPeriod;

export interface Turntable {
  /** Yaw offset in radians; unbounded (spins accumulate), 0 mod 2 PI is front-facing. */
  angle: number;
  /** Rad/s while coasting; the smoothed pointer speed while dragging. */
  velocity: number;
  mode: Mode;
  /** Seconds since the last interaction; counts while resting. */
  idle: number;
  /** Spin ramp 0..1. */
  spin: number;
}

export interface StepInput {
  /** Reduced motion: never auto-spin and never wander back on its own. */
  readonly reduced: boolean;
  /** The scroll beat owns the camera: stay (or return) front-facing and do not spin. */
  readonly hold: boolean;
}

export function createTurntable(): Turntable {
  return { angle: 0, velocity: 0, mode: 'rest', idle: 0, spin: 0 };
}

/** Signed shortest distance from `angle` to the nearest front-facing angle (a multiple of 2 PI). */
export function toFront(angle: number): number {
  return Math.round(angle / TAU) * TAU - angle;
}

/** The angle folded into -PI..PI, for weighting things that only care how far from front he is. */
export function wrap(angle: number): number {
  return angle - Math.round(angle / TAU) * TAU;
}

export function beginDrag(t: Turntable): void {
  t.mode = 'drag';
  t.velocity = 0;
  t.spin = 0;
  t.idle = 0;
}

/** Pointer moved by `delta` radians over `dt` seconds (dt may be 0 for the first event). */
export function dragBy(t: Turntable, delta: number, dt: number): void {
  if (t.mode !== 'drag') return;
  t.angle += delta;
  if (dt > 0) {
    // Smoothed release speed, so one jittery event does not decide the throw.
    const v = delta / dt;
    t.velocity += (v - t.velocity) * 0.35;
  }
}

/** Pointer lifted. A pointer that stopped before lifting leaves no throw. */
export function endDrag(t: Turntable, sinceLastMove: number): void {
  if (t.mode !== 'drag') return;
  const stale = sinceLastMove > 0.09;
  const v = stale ? 0 : Math.max(-TURNTABLE.maxVelocity, Math.min(TURNTABLE.maxVelocity, t.velocity));
  t.velocity = v;
  t.idle = 0;
  t.mode = Math.abs(v) > TURNTABLE.restSpeed ? 'coast' : 'rest';
}

/** One arrow-key press: a quick turn that rides the same friction. */
export function nudge(t: Turntable, direction: -1 | 1): void {
  t.mode = 'coast';
  t.spin = 0;
  t.idle = 0;
  // Speed chosen so the coast travels about one keyStep: distance = v / friction.
  t.velocity = Math.max(-TURNTABLE.maxVelocity, Math.min(TURNTABLE.maxVelocity, t.velocity + direction * TURNTABLE.keyStep * TURNTABLE.friction));
}

/** Advance by `dt` seconds. */
export function stepTurntable(t: Turntable, dt: number, input: StepInput): void {
  const step = Math.min(dt, 0.1);
  switch (t.mode) {
    case 'drag':
      return;
    case 'coast': {
      t.angle += t.velocity * step;
      t.velocity *= Math.exp(-TURNTABLE.friction * step);
      if (Math.abs(t.velocity) < TURNTABLE.restSpeed) {
        t.velocity = 0;
        t.mode = 'rest';
        t.idle = 0;
      }
      return;
    }
    case 'return': {
      const delta = toFront(t.angle);
      if (Math.abs(delta) <= TURNTABLE.snap) {
        t.angle += delta;
        t.mode = input.reduced || input.hold ? 'rest' : 'spin';
        t.spin = 0;
        return;
      }
      t.angle += delta * (1 - Math.exp(-TURNTABLE.returnRate * step));
      return;
    }
    case 'spin': {
      if (input.reduced || input.hold) {
        t.mode = input.hold ? 'return' : 'rest';
        t.spin = 0;
        return;
      }
      t.spin += (1 - t.spin) * (1 - Math.exp(-step / TURNTABLE.spinEase));
      t.angle += SPIN_SPEED * t.spin * step;
      return;
    }
    default: {
      // rest
      if (input.hold) {
        // The beat wants him square to the camera; ease home without waiting.
        if (Math.abs(toFront(t.angle)) > TURNTABLE.snap) t.mode = 'return';
        return;
      }
      t.idle += step;
      if (input.reduced || t.idle < TURNTABLE.idleDelay) return;
      t.mode = Math.abs(toFront(t.angle)) > TURNTABLE.snap ? 'return' : 'spin';
      t.spin = 0;
    }
  }
}

/** How live the head tracking should be: 1 only while front-facing and not being turned. */
export function headWeight(t: Turntable): number {
  if (t.mode === 'drag' || t.mode === 'coast') return 0;
  const a = Math.abs(wrap(t.angle));
  const lo = 0.35;
  const hi = 0.9;
  const x = Math.min(1, Math.max(0, (hi - a) / (hi - lo)));
  return x * x * (3 - 2 * x);
}
