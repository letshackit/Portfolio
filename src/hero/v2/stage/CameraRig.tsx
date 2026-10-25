import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { smoothstep, store } from '../store';
import { useLayout, v3 } from './layout';

const lerp = THREE.MathUtils.lerp;
const damp = THREE.MathUtils.damp;

/**
 * One camera for the whole hero: 3/4 on the operator, then, as the page scrolls, it orbits to frontal and pushes past
 * him into the city. The off-centre framing slides the camera and its target together along the screen axes rather
 * than using a view offset, because the reflective floor mis-projects with a skewed frustum.
 */
export function CameraRig() {
  const L = useLayout();
  const { camera, size } = useThree();
  const s = useRef({ p: 0, px: 0, py: 0 });
  const target = useMemo(() => new THREE.Vector3(), []);
  const t0 = useMemo(() => v3(L.target[0]), [L]);
  const t1 = useMemo(() => v3(L.target[1]), [L]);
  const right = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const st = s.current;
    st.p = damp(st.p, store.progress, 5, dt);
    // Cursor parallax. Reduced motion keeps the camera still.
    st.px = damp(st.px, store.reduced ? 0 : store.px, 2.5, dt);
    st.py = damp(st.py, store.reduced ? 0 : store.py, 2.5, dt);
    const p = smoothstep(0, 1, st.p);
    // Push in on the way: the dolly leads the orbit slightly, so he is passed rather than orbited.
    const q = smoothstep(0.1, 1, st.p);

    const az = lerp(L.azimuth[0], L.azimuth[1], p) + st.px * 0.075;
    const el = lerp(L.elevation[0], L.elevation[1], p) + st.py * 0.03;
    const intro = 1 - smoothstep(0, 1, store.intro);
    const dist = lerp(L.dist[0], L.dist[1], q) + intro * 1.6;
    target.lerpVectors(t0, t1, q);

    cam.fov = lerp(L.fov[0], L.fov[1], p);
    cam.position.set(
      target.x + Math.sin(az) * Math.cos(el) * dist,
      target.y + Math.sin(el) * dist,
      target.z + Math.cos(az) * Math.cos(el) * dist,
    );
    cam.lookAt(target);

    // Frame off-centre: slide camera and target along the screen axes by a fraction of the viewport. Positive shiftX
    // pushes the scene right, positive shiftY pushes it down.
    right.set(1, 0, 0).applyQuaternion(cam.quaternion);
    up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    const unitsPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))) / size.height;
    const sx = size.width * lerp(L.shiftX[0], L.shiftX[1], p) * unitsPerPx;
    const sy = size.height * lerp(L.shiftY[0], L.shiftY[1], p) * unitsPerPx;
    cam.position.addScaledVector(right, -sx).addScaledVector(up, sy);
    target.addScaledVector(right, -sx).addScaledVector(up, sy);
    // Parallax on the camera itself, weaker once inside the city.
    const amp = 1 - p * 0.55;
    cam.position.addScaledVector(right, st.px * 0.28 * amp).addScaledVector(up, st.py * 0.14 * amp);
    cam.lookAt(target);
    cam.updateProjectionMatrix();
  });
  return null;
}
