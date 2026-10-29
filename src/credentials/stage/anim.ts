import type { MutableRefObject } from 'react';

/**
 * What the placement layer (Badge) tells a slab each frame. The slab reads it in its own useFrame, so poses stay in one
 * place and the shared behaviour (entrance, hover, lean) is written once.
 */
export interface Anim {
  /** 0..1, damped: the slab is under the cursor, focused or held in the spotlight. */
  hover: number;
  /** 0..1: the boot-up wipe of the face on entrance (1 and fixed in reduced motion). */
  enter: number;
  /** Turn about the vertical axis (radians): lean + the hover flip + the entrance turn. */
  yaw: number;
  /** Small nod toward the cursor. */
  pitch: number;
  /** Seconds since the slab appeared (frozen at a fixed value in reduced motion). */
  time: number;
}

export type AnimRef = MutableRefObject<Anim>;

export function createAnim(): Anim {
  return { hover: 0, enter: 0, yaw: 0, pitch: 0, time: 0 };
}
