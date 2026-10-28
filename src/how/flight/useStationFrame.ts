import { useRef } from 'react';
import { useFrame, type RootState } from '@react-three/fiber';
import { assemble, flight, passed, stationVisible } from './timeline';

/**
 * Runs `tick` once per frame while station `index` is near the camera, with its assembly progress `a` (0..1), how far
 * the camera has flown past it `b` (0..1) and the scene clock in seconds. `tick` may be a fresh closure every render.
 */
export function useStationFrame(index: number, tick: (a: number, b: number, t: number, state: RootState) => void): void {
  const latest = useRef(tick);
  latest.current = tick;
  useFrame((state) => {
    const s = flight.s;
    if (!stationVisible(index, s)) return;
    latest.current(assemble(index, s), passed(index, s), state.clock.elapsedTime, state);
  });
}
