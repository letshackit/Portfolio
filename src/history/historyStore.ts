/**
 * Mutable state shared between the DOM (scroll position, pointer) and the WebGL scene (useFrame). Mutated outside React
 * because it changes every frame. Framework-free and three-free, so the entry chunk can import it without the 3D chunk.
 */
export const hstore = {
  /** Which station the visitor is at, continuous: 0 = the newest role, n - 1 = the oldest. Set by the scroll loop. */
  f: 0,
  /** `f` after the camera's own smoothing: what the scene actually reads. */
  fs: 0,
  /** Pointer in -1..1, y up. */
  px: 0,
  py: 0,
  /** Scene clock in seconds, advanced only while frames render. */
  time: 0,
};

export const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export const smoothstep = (a: number, b: number, v: number): number => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
