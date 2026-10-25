import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { store } from '../store';

const damp = THREE.MathUtils.damp;
const clamp = THREE.MathUtils.clamp;

export const AVATAR_URL = '/hero/character.glb';
const GLASS_Y = 1.735;
const GLASS_Z = 0.118;
const MAX_HEAD = THREE.MathUtils.degToRad(30);

/** Thin rounded-rectangle frames, bridge and temples: Harshal's real glasses, in place of the exported VR headset. */
function buildGlasses(): { group: THREE.Group; dispose: () => void } {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#16191d', metalness: 0.85, roughness: 0.32 });
  const w = 0.056;
  const h = 0.038;
  const r = 0.011;
  const t = 0.0034;
  const rr = <T extends THREE.Path>(hw: number, hh: number, rad: number, path: T): T => {
    path.moveTo(-hw + rad, -hh);
    path.lineTo(hw - rad, -hh);
    path.quadraticCurveTo(hw, -hh, hw, -hh + rad);
    path.lineTo(hw, hh - rad);
    path.quadraticCurveTo(hw, hh, hw - rad, hh);
    path.lineTo(-hw + rad, hh);
    path.quadraticCurveTo(-hw, hh, -hw, hh - rad);
    path.lineTo(-hw, -hh + rad);
    path.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
    return path;
  };
  const outer = rr(w / 2, h / 2, r, new THREE.Shape());
  outer.holes.push(rr(w / 2 - t, h / 2 - t, r - t * 0.6, new THREE.Path()));
  const rim = new THREE.ExtrudeGeometry(outer, { depth: 0.0036, bevelEnabled: false });
  const lens = new THREE.ShapeGeometry(rr(w / 2 - t, h / 2 - t, r - t * 0.6, new THREE.Shape()));
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: '#cfefff',
    transparent: true,
    opacity: 0.07,
    roughness: 0.02,
    metalness: 0,
    depthWrite: false,
  });
  const templeGeo = new THREE.BoxGeometry(0.0032, 0.0032, 0.125);
  const ipd = 0.064;
  for (const sx of [-1, 1]) {
    const m = new THREE.Mesh(rim, mat);
    m.position.set(sx * ipd * 0.5, 0, 0);
    const l = new THREE.Mesh(lens, lensMat);
    l.position.set(sx * ipd * 0.5, 0, 0.0018);
    g.add(m, l);
    const temple = new THREE.Mesh(templeGeo, mat);
    temple.position.set(sx * (ipd * 0.5 + w / 2 + 0.002), 0.012, -0.0625);
    g.add(temple);
  }
  const bridgeGeo = new THREE.BoxGeometry(ipd - w + 0.004, 0.0032, 0.0032);
  const bridge = new THREE.Mesh(bridgeGeo, mat);
  bridge.position.set(0, 0.008, 0.0018);
  g.add(bridge);
  return {
    group: g,
    dispose: () => {
      for (const geo of [rim, lens, templeGeo, bridgeGeo]) geo.dispose();
      mat.dispose();
      lensMat.dispose();
    },
  };
}

/** The Avaturn avatar: idle clip, head tracking toward the cursor. Never shown in the exported T-pose. */
export function Avatar() {
  const group = useRef<THREE.Group>(null);
  const gltf = useGLTF(AVATAR_URL, false, false);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const { actions, names } = useAnimations(gltf.animations, group);

  const bones = useMemo(() => {
    const find = (n: string) => scene.getObjectByName(n) ?? null;
    return { head: find('Head'), neck: find('Neck') };
  }, [scene]);

  const head = useRef({ yaw: 0, pitch: 0 });

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      // The exported accessory is a VR headset, not Harshal's glasses: hide it if present.
      if (m.name.startsWith('avaturn_glasses')) m.visible = false;
    });
  }, [scene]);

  // Glasses ride on the Head bone so they follow the idle clip and the head tracking. Placed from the rest pose.
  useEffect(() => {
    const headBone = bones.head;
    if (!headBone) return;
    scene.updateMatrixWorld(true);
    const glasses = buildGlasses();
    glasses.group.position.copy(headBone.worldToLocal(new THREE.Vector3(0, GLASS_Y, GLASS_Z)));
    headBone.add(glasses.group);
    return () => {
      headBone.remove(glasses.group);
      glasses.dispose();
    };
  }, [bones, scene]);

  useEffect(() => {
    const clip = actions[names[0]];
    if (!clip) return;
    // Play from frame 0 and pose the skeleton immediately, so he is never seen in the exported T-pose.
    clip.reset().play();
    clip.getMixer().update(0);
    if (store.reduced) clip.paused = true;
    return () => {
      clip.fadeOut(0.2);
    };
  }, [actions, names]);

  // Registered after useAnimations' mixer update, so the head offset is layered on top of the idle clip each frame.
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    // Body turns toward the 3/4 camera, then squares up to it as the camera goes frontal.
    g.rotation.y = damp(g.rotation.y, THREE.MathUtils.lerp(0.34, 0, store.progress), 4, dt);

    // Head: cursor to a clamped angle (+-30 deg), lerped. Still under reduced motion.
    const targetYaw = store.reduced ? 0 : clamp(store.px * MAX_HEAD, -MAX_HEAD, MAX_HEAD);
    const targetPitch = store.reduced ? 0 : clamp(-store.py * MAX_HEAD * 0.55, -MAX_HEAD * 0.6, MAX_HEAD * 0.6);
    head.current.yaw = damp(head.current.yaw, targetYaw, 5, dt);
    head.current.pitch = damp(head.current.pitch, targetPitch, 5, dt);
    if (bones.head) {
      bones.head.rotation.y += head.current.yaw * 0.75;
      bones.head.rotation.x += head.current.pitch * 0.75;
    }
    if (bones.neck) {
      bones.neck.rotation.y += head.current.yaw * 0.25;
      bones.neck.rotation.x += head.current.pitch * 0.25;
    }
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(AVATAR_URL, false, false);
