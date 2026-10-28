/**
 * Geometry and easing for the capability stage. Pure functions, no three.js, so the maths is unit-tested.
 * World: four hubs on a ring around the core; the camera flies round the ring to the active hub; the active
 * cluster opens into a ring of skill nodes that always faces the camera (a billboard about the vertical axis).
 */

export const RING_RADIUS = 4.2;
/** Camera azimuth ahead of the active hub, in radians: keeps the core visible behind-left of the cluster. */
export const CAM_AZIMUTH_OFFSET = 0.42;
export const CAM_RADIUS = 12.2;

const TAU = Math.PI * 2;

/** Hub heights: a small stagger so the ring reads as 3D rather than a flat circle. */
const HUB_LIFT = [0.45, -0.4, 0.35, -0.3] as const;

export function hubAngle(index: number, count: number): number {
  return (index / Math.max(1, count)) * TAU;
}

export function hubPosition(index: number, count: number): readonly [number, number, number] {
  const a = hubAngle(index, count);
  return [Math.sin(a) * RING_RADIUS, HUB_LIFT[index % HUB_LIFT.length], Math.cos(a) * RING_RADIUS];
}

/** `target` expressed as the equivalent of `current` plus the shortest turn, so the camera never spins the long way. */
export function unwrapAngle(current: number, target: number): number {
  return target + TAU * Math.round((current - target) / TAU);
}

/** Frame-rate independent exponential approach (lambda in 1/s). */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export type LabelSide = 'left' | 'right' | 'above' | 'below';

export interface NodeSlot {
  /** Offset from the hub in screen-plane units (1 = the ring's radius). */
  readonly x: number;
  readonly y: number;
  readonly side: LabelSide;
}

/**
 * Where skill `i` of `n` sits when its cluster is open: an ellipse that starts at twelve o'clock and runs clockwise,
 * with alternate nodes pulled in a little so neighbouring labels stagger instead of colliding. The label goes on the
 * outside of the ellipse: left or right on the flanks, above or below near the poles.
 */
export function nodeSlot(i: number, n: number): NodeSlot {
  const a = Math.PI / 2 - (i / Math.max(1, n)) * TAU;
  const pull = i % 2 === 0 ? 1 : 0.82;
  const x = Math.cos(a) * pull;
  const y = Math.sin(a) * pull;
  const c = Math.cos(a);
  const side: LabelSide = c > 0.38 ? 'right' : c < -0.38 ? 'left' : Math.sin(a) >= 0 ? 'above' : 'below';
  return { x, y, side };
}

/** Collapsed orbit of a node around a closed hub, in world units: a slow tilted ring per node. */
export function orbitOffset(i: number, n: number, t: number, radius: number): readonly [number, number, number] {
  const phase = (i / Math.max(1, n)) * TAU + t * (0.35 + (i % 3) * 0.08);
  const tilt = 0.6 + (i % 4) * 0.35;
  const r = radius * (0.85 + (i % 3) * 0.14);
  return [Math.cos(phase) * r, Math.sin(phase) * r * Math.sin(tilt), Math.sin(phase) * r * Math.cos(tilt)];
}
