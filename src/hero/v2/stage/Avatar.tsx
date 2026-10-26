import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { markInteracted, store } from '../store';
import { AVATAR_ENV, ensureSmoothNormals, tuneMaterials } from './materials';
import { beginDrag, createTurntable, dragBy, endDrag, headWeight, nudge, stepTurntable, type Turntable } from './turntable';

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

export const AVATAR_URL = '/hero/character.glb';
const MAX_HEAD = THREE.MathUtils.degToRad(30);
/** Seconds the idle clip blends into its own start before it ends, so the loop has no visible seam. */
const LOOP_FADE = 0.6;
/** Drag distance for a full turn, as a multiple of the canvas width: a drag across the stage turns him ~290 degrees. */
const TURN_PER_WIDTH = Math.PI * 1.6;
/** The scroll beat owns the camera from this progress on: no spin, and he squares up to it. */
const HOLD_PROGRESS = 0.06;

interface IdleLoop {
  /** Poses the skeleton at frame 0 right now, so he is never drawn in the exported T-pose. */
  pose: () => void;
  tick: (dt: number) => void;
  dispose: () => void;
}

/** Two copies of the idle clip, so the end of one can blend into the start of the other. */
function useIdleLoop(scene: THREE.Object3D, clips: THREE.AnimationClip[]): IdleLoop {
  return useMemo(() => {
    const mixer = new THREE.AnimationMixer(scene);
    const clip = clips[0];
    if (!clip) return { tick: () => undefined, dispose: () => undefined, pose: () => undefined };
    const make = (c: THREE.AnimationClip) => {
      const a = mixer.clipAction(c);
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
      return a;
    };
    const pair = [make(clip), make(clip.clone())] as const;
    let current = 0;
    let fading = false;
    pair[0].reset().play();
    return {
      pose: () => mixer.update(0),
      tick: (dt: number) => {
        mixer.update(dt);
        const a = pair[current];
        if (!fading && a.time >= clip.duration - LOOP_FADE) {
          const b = pair[1 - current];
          b.reset().play();
          a.crossFadeTo(b, LOOP_FADE, false);
          fading = true;
          current = 1 - current;
        } else if (fading && pair[current].time > LOOP_FADE + 0.05) {
          fading = false;
        }
      },
      dispose: () => {
        mixer.stopAllAction();
        mixer.uncacheRoot(scene);
      },
    };
  }, [scene, clips]);
}

/**
 * The Avaturn avatar: idle clip looped with a crossfade, breathing, head tracking toward the cursor, and the turntable
 * (slow spin, drag with inertia, arrow keys). The scroll beat is composed on top: his base turn is set by the beat, the
 * turntable adds to it, and the camera rig never knows.
 */
export function Avatar() {
  const root = useRef<THREE.Group>(null);
  const gltf = useGLTF(AVATAR_URL, false, false);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const { gl, invalidate, size } = useThree();
  const idle = useIdleLoop(scene, gltf.animations);

  const bones = useMemo(() => {
    const find = (n: string) => scene.getObjectByName(n) ?? null;
    return { head: find('Head'), neck: find('Neck'), chest: find('Spine2'), hips: find('Hips') };
  }, [scene]);

  const tt = useRef(createTurntable());
  const head = useRef({ yaw: 0, pitch: 0, weight: 0 });
  const base = useRef(0.34);
  const drag = useRef({ id: -1, x: 0, t: 0, last: 0 });
  const hovering = useRef(false);

  // Materials, normals, pose: before the first frame is drawn.
  useLayoutEffect(() => {
    ensureSmoothNormals(scene);
    tuneMaterials(scene, Math.min(8, gl.capabilities.getMaxAnisotropy()));
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      m.castShadow = true;
      m.receiveShadow = true;
    });
    idle.pose();
    // Spin about his hips, not about the file's origin: the idle clip sways the hips a little off the origin.
    scene.position.set(0, 0, 0);
    scene.updateMatrixWorld(true);
    if (bones.hips) {
      const p = new THREE.Vector3();
      bones.hips.getWorldPosition(p);
      scene.position.set(-p.x, 0, -p.z);
    }
  }, [scene, gl, idle, bones.hips]);

  // The studio HDR on the avatar's own materials, so its strength is independent of the rest of the scene. The probe
  // is attached by <Environment> after this component first renders, so it is picked up in the frame loop.
  const envMaterials = useMemo(() => {
    const set = new Set<THREE.MeshStandardMaterial>();
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) set.add(mat as THREE.MeshStandardMaterial);
    });
    return [...set];
  }, [scene]);
  const envApplied = useRef<THREE.Texture | null>(null);

  useEffect(() => () => idle.dispose(), [idle]);

  // QA switch (?quality=...): expose the turntable so screenshot drivers can wait for a settled, front-facing frame.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('quality')) return;
    const w = window as unknown as { __turntable?: Turntable };
    w.__turntable = tt.current;
    return () => {
      delete w.__turntable;
    };
  }, []);

  // Lets the page (arrow keys) wake a demand-rendered stage.
  useEffect(() => {
    store.wake = invalidate;
    return () => {
      store.wake = null;
    };
  }, [invalidate]);

  const setCursor = useCallback(
    (value: string) => {
      gl.domElement.style.cursor = value;
    },
    [gl],
  );

  const stopDrag = useCallback(
    (e: PointerEvent) => {
      const d = drag.current;
      if (e.pointerId !== d.id) return;
      d.id = -1;
      endDrag(tt.current, (performance.now() - d.last) / 1000);
      setCursor(hovering.current ? 'grab' : '');
      window.removeEventListener('pointermove', onMoveRef.current);
      window.removeEventListener('pointerup', stopDragRef.current);
      window.removeEventListener('pointercancel', stopDragRef.current);
      invalidate();
    },
    [invalidate, setCursor],
  );
  const stopDragRef = useRef(stopDrag);
  stopDragRef.current = stopDrag;

  const onMove = useCallback(
    (e: PointerEvent) => {
      const d = drag.current;
      if (e.pointerId !== d.id) return;
      const now = performance.now();
      // Horizontal only: the avatar turns about Y and never tilts.
      dragBy(tt.current, ((e.clientX - d.x) / size.width) * TURN_PER_WIDTH, (now - d.last) / 1000);
      d.x = e.clientX;
      d.last = now;
      invalidate();
    },
    [invalidate, size.width],
  );
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onMoveRef.current);
      window.removeEventListener('pointerup', stopDragRef.current);
      window.removeEventListener('pointercancel', stopDragRef.current);
      setCursor('');
    },
    [setCursor],
  );

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.nativeEvent.button > 0) return;
    e.stopPropagation();
    const d = drag.current;
    if (d.id !== -1) return;
    d.id = e.pointerId;
    d.x = e.nativeEvent.clientX;
    d.last = performance.now();
    beginDrag(tt.current);
    markInteracted();
    setCursor('grabbing');
    window.addEventListener('pointermove', onMoveRef.current);
    window.addEventListener('pointerup', stopDragRef.current);
    window.addEventListener('pointercancel', stopDragRef.current);
    invalidate();
  };

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const t = tt.current;

    // Arrow keys queued by the page.
    while (store.keyTurn !== 0) {
      const dir = store.keyTurn > 0 ? 1 : -1;
      store.keyTurn -= dir;
      if (t.mode === 'drag') continue;
      nudge(t, dir);
      markInteracted();
    }

    if (!store.reduced) idle.tick(dt);
    stepTurntable(t, dt, { reduced: store.reduced, hold: store.progress > HOLD_PROGRESS });

    // Body: the beat turns him toward the 3/4 camera, then squares up as the camera goes frontal; the turntable rides on top.
    base.current = damp(base.current, THREE.MathUtils.lerp(0.34, 0, store.progress), 4, dt);
    g.rotation.y = base.current + t.angle;

    // Head: cursor to a clamped angle, only while he faces front and nobody is turning him; eases in and out of it.
    const h = head.current;
    h.weight = damp(h.weight, store.reduced ? 0 : headWeight(t), 4.5, dt);
    const targetYaw = clamp(store.px * MAX_HEAD, -MAX_HEAD, MAX_HEAD);
    const targetPitch = clamp(-store.py * MAX_HEAD * 0.55, -MAX_HEAD * 0.6, MAX_HEAD * 0.6);
    h.yaw = damp(h.yaw, targetYaw, 5, dt);
    h.pitch = damp(h.pitch, targetPitch, 5, dt);
    if (bones.head) {
      bones.head.rotation.y += h.yaw * h.weight * 0.75;
      bones.head.rotation.x += h.pitch * h.weight * 0.75;
    }
    if (bones.neck) {
      bones.neck.rotation.y += h.yaw * h.weight * 0.25;
      bones.neck.rotation.x += h.pitch * h.weight * 0.25;
    }
    // Breathing: a slow, small lift of the chest on top of the clip (about 15 breaths a minute).
    if (bones.chest && !store.reduced) bones.chest.rotation.x += Math.sin(state.clock.elapsedTime * 1.6) * 0.007;

    // Env: attach the probe once it exists, then follow the lights-on ramp.
    const env = state.scene.environment;
    if (env && env !== envApplied.current) {
      envApplied.current = env;
      for (const m of envMaterials) {
        m.envMap = env;
        m.envMapRotation.set(0, -0.6, 0);
        m.needsUpdate = true;
      }
    }
    const k = 0.4 + 0.6 * THREE.MathUtils.smoothstep(store.intro, 0, 1);
    for (const m of envMaterials) m.envMapIntensity = AVATAR_ENV * k;

    // A demand-rendered stage (reduced motion) keeps drawing only while something is moving.
    if (store.reduced && (t.mode !== 'rest' || drag.current.id !== -1 || h.weight > 0.01)) invalidate();
  });

  return (
    <>
      <group ref={root} dispose={null}>
        <primitive object={scene} />
      </group>
      {/* Hit area: a cheap capsule around him, so the cursor and the drag never ray-cast the skinned mesh. */}
      <mesh
        visible={false}
        position={[0, 0.95, 0]}
        onPointerDown={onDown}
        onPointerOver={() => {
          hovering.current = true;
          if (drag.current.id === -1) setCursor('grab');
        }}
        onPointerOut={() => {
          hovering.current = false;
          if (drag.current.id === -1) setCursor('');
        }}
      >
        <cylinderGeometry args={[0.46, 0.4, 1.95, 12]} />
      </mesh>
    </>
  );
}

useGLTF.preload(AVATAR_URL, false, false);
