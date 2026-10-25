/** Easings for the city's time-based animation. All take and return 0..1 (back-out overshoots past 1). */
export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

export const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Overshoots then settles; `overshoot` 1.7 is a soft pop, 2.1 a springy one. */
export function easeOutBack(t: number, overshoot = 2.1): number {
  const c3 = overshoot + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + overshoot * u * u;
}
