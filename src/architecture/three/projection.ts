/**
 * Camera maths shared by the 3D scene and the DOM overlay. The overlay buttons (the keyboard and screen-reader layer)
 * sit over the blocks, so both sides must project world positions identically. Pure: no three.js import, so it stays
 * out of the entry chunk and can be unit-tested without WebGL.
 */
import type { Block3D, Layout3D, Vec3 } from './layout3d';

/** Base tilt of the whole assembly, radians. Euler 'XYZ' like three.js: rotate about y first, then x. */
export const BASE_ROT = { x: 0.14, y: -0.2 } as const;
export const CAMERA_FOV = 28;
const FIT_X = 0.94;
const FIT_Y = 0.9;

export interface Projection {
  readonly distance: number;
  readonly fov: number;
  readonly aspect: number;
  readonly cy: number;
}

function rotate(p: Vec3, cy: number): Vec3 {
  const x0 = p[0];
  const y0 = p[1] - cy;
  const z0 = p[2];
  const cyA = Math.cos(BASE_ROT.y);
  const syA = Math.sin(BASE_ROT.y);
  const x1 = x0 * cyA + z0 * syA;
  const z1 = -x0 * syA + z0 * cyA;
  const cxA = Math.cos(BASE_ROT.x);
  const sxA = Math.sin(BASE_ROT.x);
  const y2 = y0 * cxA - z1 * sxA;
  const z2 = y0 * sxA + z1 * cxA;
  return [x1, y2, z2];
}

/** Normalised device coordinates (-1..1, y up) of a world point, or null when it is behind the camera. */
export function projectPoint(p: Vec3, proj: Projection): readonly [number, number] | null {
  const [x, y, z] = rotate(p, proj.cy);
  const depth = proj.distance - z;
  if (depth <= 0.01) return null;
  const tan = Math.tan((proj.fov * Math.PI) / 360);
  return [x / (depth * tan * proj.aspect), y / (depth * tan)];
}

function corners(b: Block3D): Vec3[] {
  const out: Vec3[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        out.push([b.pos[0] + (sx * b.size[0]) / 2, b.pos[1] + (sy * b.size[1]) / 2, b.pos[2] + (sz * b.size[2]) / 2]);
      }
    }
  }
  return out;
}

function fits(layout: Layout3D, proj: Projection): boolean {
  for (const b of layout.blocks) {
    for (const c of corners(b)) {
      const n = projectPoint(c, proj);
      if (!n || Math.abs(n[0]) > FIT_X || Math.abs(n[1]) > FIT_Y) return false;
    }
  }
  return true;
}

/** Smallest camera distance at which every block corner lies inside the frame, found by bisection. */
export function fitProjection(layout: Layout3D, aspect: number): Projection {
  const base = { fov: CAMERA_FOV, aspect: Math.max(0.5, aspect), cy: layout.extent.cy };
  let lo = 4;
  let hi = 120;
  for (let i = 0; i < 28; i += 1) {
    const mid = (lo + hi) / 2;
    if (fits(layout, { ...base, distance: mid })) hi = mid;
    else lo = mid;
  }
  return { ...base, distance: hi };
}

export interface BlockRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** Percentage rectangle (of the frame) that bounds a block's front face, for the overlay buttons. */
export function blockRect(b: Block3D, proj: Projection): BlockRect {
  const z = b.pos[2] + b.size[2] / 2;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const n = projectPoint([b.pos[0] + (sx * b.size[0]) / 2, b.pos[1] + (sy * b.size[1]) / 2, z], proj);
      if (!n) continue;
      minX = Math.min(minX, n[0]);
      maxX = Math.max(maxX, n[0]);
      minY = Math.min(minY, n[1]);
      maxY = Math.max(maxY, n[1]);
    }
  }
  return {
    left: ((minX + 1) / 2) * 100,
    top: ((1 - maxY) / 2) * 100,
    width: ((maxX - minX) / 2) * 100,
    height: ((maxY - minY) / 2) * 100,
  };
}
