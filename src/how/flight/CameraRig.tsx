import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, MeshBasicMaterial, Vector3, type Mesh, type PerspectiveCamera } from 'three';
import { COLORS } from './common';
import { softTexture } from './textures';
import { flight, smoothstep } from './timeline';
import { cameraArc, pathFrame, pathPoint, type TrackLayout } from './track';

const T = new Vector3();
const R = new Vector3();
const U = new Vector3();
const P = new Vector3();
const L = new Vector3();
const S = new Vector3();

/**
 * First-person flight. Landscape: the camera rides a little behind and above the packet, offset to the left of the
 * rails, looking down the conduit and a touch to the right where the station stands. Portrait: the camera sits in
 * front of the vertical shaft and slides down it. The cursor (or a slow idle sway) adds parallax; the frustum is
 * shifted so the subject clears the HUD panel (right of centre on desktop, above the panel on a phone).
 */
export function CameraRig({ layout }: { layout: TrackLayout }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const ptr = useRef({ x: 0, y: 0 });
  // How much of the frame's width the glass panel covers on the left, measured on resize rather than per frame.
  const panel = useRef(0.34);
  useLayoutEffect(() => {
    const el = document.querySelector('.flight__panels');
    const frame = document.querySelector('.flight__frame');
    if (layout.portrait || !el || !frame) {
      panel.current = 0.34;
      return;
    }
    const f = frame.getBoundingClientRect().width;
    panel.current = f > 0 ? Math.min(0.5, (el.getBoundingClientRect().width + 24) / f) : 0.34;
  }, [layout.portrait, size.width, size.height]);

  useLayoutEffect(() => {
    camera.fov = layout.fov;
    camera.near = 0.1;
    camera.far = 260;
    camera.updateProjectionMatrix();
    return () => camera.clearViewOffset();
  }, [camera, layout.fov]);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-4 * Math.min(dt, 0.1));
    ptr.current.x += (flight.px - ptr.current.x) * k;
    ptr.current.y += (flight.py - ptr.current.y) * k;
    const t = state.clock.elapsedTime;
    const sway = Math.sin(t * 0.35) * 0.18;
    const px = ptr.current.x + sway;
    const py = ptr.current.y + Math.cos(t * 0.27) * 0.08;
    const arc = cameraArc(layout, flight.s);
    pathPoint(layout, arc, P);
    if (layout.portrait) {
      camera.position.set(P.x + px * 0.5, P.y + 1.2 + py * 0.3, 9.4);
      camera.up.set(0, 1, 0);
      camera.lookAt(P.x, P.y - 0.25, 0);
    } else {
      pathFrame(layout, arc, T, R, U);
      camera.position.copy(P).addScaledVector(R, -0.55 + px * 0.55).addScaledVector(U, 0.66 + py * 0.32);
      pathPoint(layout, arc + 11, L);
      L.addScaledVector(R, Math.min(4.2, Math.max(2, 2.8 * (panel.current / 0.34))));
      // On the last station the camera turns to look down the conduit at the server it is about to deploy to.
      pathPoint(layout, layout.serverArc, S);
      S.y += 1.2;
      L.lerp(S, smoothstep(5.2, 6.1, flight.s) * 0.6);
      camera.up.set(0, 1, 0);
      camera.lookAt(L);
    }
    // Less free width beside the panel (a small laptop): open the lens a little so a station still fits in it.
    camera.fov = layout.portrait ? layout.fov : layout.fov * Math.min(1.25, Math.max(1, 0.66 / (1 - panel.current)));
    const w = size.width;
    const h = size.height;
    const shiftX = layout.portrait ? 0 : 0.3 * panel.current;
    const shiftY = layout.portrait ? 0.17 : 0;
    camera.setViewOffset(w, h, -w * shiftX, h * shiftY, w, h);
  });
  return null;
}

/** A large soft glow at the vanishing point: the light at the end of the conduit. */
export function Horizon({ layout }: { layout: TrackLayout }) {
  const cyan = useRef<Mesh>(null);
  const amber = useRef<Mesh>(null);
  const cam = useThree((s) => s.camera);
  const cyanMat = useMemo(
    () => new MeshBasicMaterial({ map: softTexture(), color: COLORS.cyan.clone().multiplyScalar(0.16), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }),
    [],
  );
  const amberMat = useMemo(
    () => new MeshBasicMaterial({ map: softTexture(), color: COLORS.amber.clone().multiplyScalar(0.1), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }),
    [],
  );
  useLayoutEffect(
    () => () => {
      cyanMat.dispose();
      amberMat.dispose();
    },
    [cyanMat, amberMat],
  );
  useFrame(() => {
    const arc = cameraArc(layout, flight.s);
    if (layout.portrait) {
      P.set(0, -arc - 1, -10);
    } else {
      pathPoint(layout, arc + 120, P);
    }
    const c = cyan.current;
    const a = amber.current;
    if (c) {
      c.position.copy(P);
      c.quaternion.copy(cam.quaternion);
      c.scale.setScalar(layout.portrait ? 22 : 150);
    }
    if (a) {
      a.position.copy(P);
      a.quaternion.copy(cam.quaternion);
      a.scale.setScalar(layout.portrait ? 9 : 55);
    }
  });
  return (
    <>
      <mesh ref={cyan} material={cyanMat} renderOrder={-2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={amber} material={amberMat} renderOrder={-1}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </>
  );
}
