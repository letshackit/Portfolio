import { Curve, Vector3 } from 'three';
import type { TimelineModel } from '../timelineModel';

/** World units per month of career. The present is at z = 0 and the past recedes along -z. */
export const UNITS_PER_MONTH = 0.42;

/** Months back from the present: 0 is now, larger is older. The one axis every object in the scene is placed on. */
export const monthsBack = (model: TimelineModel, month: number): number => model.max - month;

/** A gentle S-bend, so the path reads as a route through time rather than a ruler. */
export function pathPoint(back: number, out: Vector3 = new Vector3()): Vector3 {
  return out.set(0.8 * Math.sin(back * 0.1), 0.4 * Math.sin(back * 0.08 + 0.6), -back * UNITS_PER_MONTH);
}

/** Unit tangent pointing into the past. */
export function pathTangent(back: number, out: Vector3 = new Vector3()): Vector3 {
  const a = pathPoint(back - 0.25);
  const b = pathPoint(back + 0.25);
  return out.copy(b).sub(a).normalize();
}

/** A stretch of the path between two month-back values, for TubeGeometry. */
export class SpineCurve extends Curve<Vector3> {
  constructor(
    private readonly from: number,
    private readonly to: number,
  ) {
    super();
  }

  getPoint(t: number, target: Vector3 = new Vector3()): Vector3 {
    return pathPoint(this.from + (this.to - this.from) * t, target);
  }
}

/**
 * Where along the path (months back) the camera stands for a continuous station index `f`. A station's gate is where its
 * tenure begins as the visitor travels back in time: the gate sits at the end of the tenure, and the tenure (with its
 * promotion) stretches ahead of it into the past.
 */
export function focusBack(model: TimelineModel, f: number): number {
  const stops = model.stations.map((s) => monthsBack(model, s.end));
  const last = stops.length - 1;
  if (last < 0) return 0;
  const clamped = Math.min(last, Math.max(0, f));
  const i = Math.min(last - 1, Math.floor(clamped));
  const a = stops[Math.max(0, i)] ?? 0;
  const b = stops[Math.min(last, i + 1)] ?? a;
  const k = clamped - Math.max(0, i);
  // An ease between stations: the camera lingers at each one and travels between them.
  const eased = k * k * (3 - 2 * k);
  return a + (b - a) * (last === 0 ? 0 : eased);
}
