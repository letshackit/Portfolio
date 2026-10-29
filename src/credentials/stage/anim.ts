import type { MutableRefObject } from 'react';

/**
 * What the placement layer (Badge) tells an object each frame. The object reads it in its own useFrame, so poses stay
 * in one place per object and the shared behaviour (entrance, hover, lean, scroll turn) is written once.
 */
export interface Anim {
  /** 0..1, damped: the object is under the cursor, focused or held in the spotlight. */
  hover: number;
  /** Turntable angle (radians) for the part that turns: sway + lean + the hover spin + the entrance turn. */
  yaw: number;
  /** Small nod toward the cursor. */
  pitch: number;
  /** Seconds since the object appeared (frozen at a fixed value in reduced motion). */
  time: number;
}

export type AnimRef = MutableRefObject<Anim>;

export function createAnim(): Anim {
  return { hover: 0, yaw: 0, pitch: 0, time: 0 };
}
