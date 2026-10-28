import { useEffect, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CAM_AZIMUTH_OFFSET, CAM_RADIUS, damp, hubAngle, hubPosition, unwrapAngle } from './layout';
import type { StageState } from './scene';

interface RigProps {
  readonly state: StageState;
  readonly active: number;
  readonly count: number;
  /** Pixels on the left of the canvas covered by the DOM rail: the scene is centred on what remains. */
  readonly railPx: number;
  readonly frameRef: RefObject<HTMLElement | null>;
}

/**
 * The camera. It flies round the ring to the active hub (azimuth and look-at ease with an exponential, so an
 * interrupted flight turns smoothly), rises and falls a little with the scroll position, and leans with the cursor.
 */
export function Rig({ state, active, count, railPx, frameRef }: RigProps) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  // Centre the scene in the space the rail leaves free: shift the projection, not the world.
  useEffect(() => {
    const shift = railPx / 2;
    if ('setViewOffset' in camera) {
      (camera as typeof camera & { setViewOffset: (...a: number[]) => void }).setViewOffset(
        size.width,
        size.height,
        -shift,
        0,
        size.width,
        size.height,
      );
    }
    return () => {
      if ('clearViewOffset' in camera) (camera as typeof camera & { clearViewOffset: () => void }).clearViewOffset();
    };
  }, [camera, size.width, size.height, railPx]);

  // Place the camera on its first frame, so the opening flight starts from the active hub rather than from the origin.
  useEffect(() => {
    state.camAz = hubAngle(active, count) + CAM_AZIMUTH_OFFSET;
    const [x, y, z] = hubPosition(active, count);
    state.look.set(x, y, z);
    // Runs once per mount: later changes of `active` are flown, not jumped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((frame, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    state.time += dt;

    const frameEl = frameRef.current;
    if (frameEl) {
      const r = frameEl.getBoundingClientRect();
      const vh = window.innerHeight;
      state.scroll = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
    }

    const targetAz = unwrapAngle(state.camAz, hubAngle(active, count) + CAM_AZIMUTH_OFFSET);
    state.camAz = damp(state.camAz, targetAz, 1.9, dt);
    const [hx, hy, hz] = hubPosition(active, count);
    state.look.x = damp(state.look.x, hx, 2.4, dt);
    state.look.y = damp(state.look.y, hy, 2.4, dt);
    state.look.z = damp(state.look.z, hz, 2.4, dt);

    const lift = 2.4 + (state.scroll - 0.5) * 1.5;
    const px = frame.pointer.x;
    const py = frame.pointer.y;
    camera.position.set(
      Math.sin(state.camAz) * CAM_RADIUS + Math.cos(state.camAz) * px * 0.55,
      lift + py * 0.35,
      Math.cos(state.camAz) * CAM_RADIUS - Math.sin(state.camAz) * px * 0.55,
    );
    camera.lookAt(state.look);
  });

  return null;
}
