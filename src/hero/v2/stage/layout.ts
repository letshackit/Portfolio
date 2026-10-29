import { useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { onStage, START_AZIMUTH } from './city/layout';

type V3 = readonly [number, number, number];

export interface CityPlacement {
  position: V3;
  scale: number;
  rotationY: number;
}

export interface Layout {
  mobile: boolean;
  /** Camera orbit around the look target: [start, end of the scroll beat]. */
  dist: readonly [number, number];
  azimuth: readonly [number, number];
  elevation: readonly [number, number];
  fov: readonly [number, number];
  /** Look target at the start (the portrait's chest) and at the end (the city). */
  target: readonly [V3, V3];
  /** Fraction of the viewport the scene is pushed right / up by, start and end of the beat. */
  shiftX: readonly [number, number];
  shiftY: readonly [number, number];
  city: CityPlacement;
  /** The portrait card: x offset of its centre line, height of its foot above the floor, and its height (width follows the photo). */
  card: { x: number; y: number; height: number };
  /** Satellite positions are authored in the stage frame for desktop; mobile pulls them in with this factor. */
  nodeSpread: number;
  /** Floor ring radii scale, so the portrait's rings stay inside the frame on a phone. */
  sparkles: number;
}

/** Where the city stands: right of the operator and behind him, so he reads as standing in front of what he built. */
const CITY_AT = onStage(1.35, 1.6);

const desktop: Layout = {
  mobile: false,
  dist: [4.95, 3.3],
  azimuth: [START_AZIMUTH, 0.03],
  elevation: [0.075, 0.12],
  fov: [28, 40],
  target: [
    [0, 0.95, 0],
    [CITY_AT[0], 0.45, CITY_AT[2]],
  ],
  shiftX: [0.1, 0],
  shiftY: [0, 0],
  city: { position: [CITY_AT[0], 0.012, CITY_AT[2]], scale: 0.22, rotationY: 0.3 },
  card: { x: -0.3, y: 0.22, height: 1.72 },
  nodeSpread: 1,
  sparkles: 1,
};

/** Phones: headline above, the operator in the lower 60 % standing clear of it, the city small and behind him. */
const MOBILE_CITY_AT = onStage(0.55, 1.5);

const mobile: Layout = {
  mobile: true,
  dist: [9.0, 4.4],
  azimuth: [0.5, 0.03],
  elevation: [0.06, 0.14],
  fov: [30, 44],
  target: [
    [0, 0.93, 0],
    [MOBILE_CITY_AT[0], 0.4, MOBILE_CITY_AT[2]],
  ],
  shiftX: [0, 0],
  shiftY: [0.09, 0],
  city: { position: [MOBILE_CITY_AT[0], 0.012, MOBILE_CITY_AT[2]], scale: 0.2, rotationY: 0.3 },
  card: { x: 0.33, y: 0.2, height: 1.5 },
  nodeSpread: 0.75,
  sparkles: 0.5,
};

/** One layout for wide viewports, one for portrait phones. Recomputed only when the breakpoint flips. */
export function useLayout(): Layout {
  const aspect = useThree((s) => s.size.width / s.size.height);
  const isMobile = aspect < 0.85;
  return isMobile ? mobile : desktop;
}

export function v3(v: V3): Vector3 {
  return new Vector3(v[0], v[1], v[2]);
}

export function useCityVectors(city: CityPlacement): { position: Vector3; scale: number; rotationY: number } {
  return useMemo(() => ({ position: v3(city.position), scale: city.scale, rotationY: city.rotationY }), [city]);
}
