import { useEffect, useLayoutEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';
import { hstore } from '../historyStore';
import type { TimelineModel } from '../timelineModel';
import { focusBack, monthsBack, pathPoint, pathTangent } from './path';

/**
 * tunnel: behind the visitor's station, looking down the path into the past (desktop).
 * side: beside the path, time running left to right, for the compact strip on a phone.
 * overview: the whole career at once, for reduced motion.
 */
export type RigMode = 'tunnel' | 'side' | 'overview';

interface RigProps {
  readonly model: TimelineModel;
  readonly mode: RigMode;
  readonly reduced: boolean;
}

const UP = new Vector3(0, 1, 0);

/** The camera: it follows the continuous station index, easing between stations, with a little cursor parallax. */
export function Rig({ model, mode, reduced }: RigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  const v = useMemo(
    () => ({ p: new Vector3(), t: new Vector3(), r: new Vector3(), pos: new Vector3(), look: new Vector3(), tmp: new Vector3() }),
    [],
  );

  useLayoutEffect(() => {
    camera.fov = mode === 'tunnel' ? 30 : mode === 'side' ? 30 : 36;
    camera.clearViewOffset();
    camera.updateProjectionMatrix();
    invalidate();
    return () => camera.clearViewOffset();
  }, [camera, mode, size.width, size.height, invalidate]);

  // Frame the first pose before the first paint, so the stage never flashes the default camera.
  useEffect(() => {
    hstore.fs = reduced ? 0 : hstore.f;
  }, [reduced]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (reduced) hstore.fs = 0;
    else {
      hstore.fs += (hstore.f - hstore.fs) * (1 - Math.exp(-3.4 * dt));
      hstore.time += dt;
    }
    const back = focusBack(model, hstore.fs);
    pathPoint(back, v.p);
    pathTangent(back, v.t);
    v.r.crossVectors(v.t, UP).normalize();
    const px = reduced ? 0 : hstore.px;
    const py = reduced ? 0 : hstore.py;
    const sway = reduced ? 0 : Math.sin(hstore.time * 0.35) * 0.18;

    if (mode === 'tunnel') {
      // Stand behind the gate on the path's own axis and look down it into the tenure that lies ahead.
      v.pos.copy(v.p).addScaledVector(v.t, -9.8).addScaledVector(v.r, -0.2 + px * 1.1 + sway);
      v.pos.y += 1.35 + py * 0.5;
      v.look.copy(v.p).addScaledVector(v.t, 6);
      v.look.y -= 1.15;
    } else if (mode === 'side') {
      // Three-quarter view from the present side: time runs left to right, and the gates show their faces.
      v.pos.copy(v.p).addScaledVector(v.r, -8.5).addScaledVector(v.t, -6.5);
      v.pos.y += 2.4;
      v.look.copy(v.p).addScaledVector(v.t, 1.2);
      v.look.y -= 0.1;
    } else {
      const mid = pathPoint(monthsBack(model, (model.min + model.max) / 2), v.tmp);
      if (size.height > 420) {
        // A full-height stage: stand behind and to the side of the present and look down the whole path, so the gates
        // nest into one another, big, the newest in front (the same composition as the poster).
        v.pos.set(-6.6, 3.6, 11.5);
        v.look.set(mid.x + 2.6, mid.y - 0.3, mid.z + 6);
      } else {
        // A strip (phone): the whole career side-on, time running left to right.
        const k = size.width / size.height > 1.5 ? 0.78 : 1.32;
        v.pos.set(mid.x - 19 * k, mid.y + 10.5 * k, mid.z + 22 * k);
        v.look.set(mid.x + 0.5, mid.y - 0.3, mid.z + 5);
      }
    }
    camera.position.copy(v.pos);
    camera.lookAt(v.look);
  });

  return null;
}
