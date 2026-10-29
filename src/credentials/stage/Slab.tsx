import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBasicMaterial, type Group } from 'three';
import { DIM, type BadgeSpec } from '../slots';
import type { AnimRef } from './anim';
import { FRONT_Z, createFaceMaterial, hdr, type Kit } from './kit';
import { createEmblemTexture, createFaceTexture, emblemPlacement } from './textures';

interface SlabProps {
  readonly spec: BadgeSpec;
  readonly index: number;
  readonly kit: Kit;
  readonly anim: AnimRef;
  readonly still: boolean;
}

/** How far in front of the face the emblem and its rings float, in world units: the parallax that makes the slab read as deep. */
const FLOAT = 0.2;

/**
 * One credential as a holographic glass slab: a smoked-glass body with a fresnel rim and cut corners, a face that carries
 * the institution's wordmark as light (scanlines, a travelling sheen), two ghost frames behind it, and an emblem floating
 * in front inside a tilted orbital ring with a satellite. The wordmark is the hero; everything else frames it.
 */
export function Slab({ spec, index, kit, anim, still }: SlabProps) {
  const { kind } = spec;
  const { w, h } = DIM[kind];
  const gold = spec.metal === 'gold';
  const paper = kind === 'paper';
  const body = useRef<Group>(null);
  const emblem = useRef<Group>(null);
  const spinA = useRef<Group>(null);
  const spinB = useRef<Group>(null);
  const place = useMemo(() => emblemPlacement(spec), [spec]);

  const faceTex = useMemo(() => createFaceTexture(spec, kit.q.tex), [spec, kit.q.tex]);
  const embTex = useMemo(() => createEmblemTexture(spec, kit.q.tex >= 768 ? 384 : 256), [spec, kit.q.tex]);
  const faceMat = useMemo(() => createFaceMaterial(faceTex, gold, index * 0.37), [faceTex, gold, index]);
  const embMat = useMemo(() => new MeshBasicMaterial({ map: embTex, transparent: true, toneMapped: false, color: hdr('#ffffff', 1.6), depthWrite: false }), [embTex]);
  useEffect(
    () => () => {
      faceTex.dispose();
      embTex.dispose();
      faceMat.dispose();
      embMat.dispose();
    },
    [faceTex, embTex, faceMat, embMat],
  );

  const geo = kit.geo[kind];
  const edge = gold ? kit.edgeGold : kit.edge;
  const ghost = gold ? kit.ghostGold : kit.ghost;
  const ringA = gold ? kit.ringAmber : kit.ringCyan;
  const ringB = gold ? kit.ringCyan : kit.ringAmber;
  const satA = gold ? kit.satCyan : kit.satAmber;
  const satB = gold ? kit.satAmber : kit.satCyan;
  const front = FRONT_Z + 0.004;
  const r = place.r;
  const emblemSize = r * 2.3;

  useFrame((_, rawDt) => {
    const a = anim.current;
    const g = body.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    g.rotation.y = a.yaw;
    g.rotation.x = a.pitch;
    g.position.y = still ? 0.02 : Math.sin(a.time * 0.9 + index) * 0.035 + a.hover * 0.05;
    const u = faceMat.uniforms;
    u.uTime.value = still ? 2.4 + index * 0.9 : a.time;
    u.uHover.value = a.hover;
    u.uEnter.value = a.enter;
    if (emblem.current) emblem.current.position.z = front + FLOAT + a.hover * 0.12;
    if (!still) {
      const speed = 1 + a.hover * 2.4;
      if (spinA.current) spinA.current.rotation.z += dt * 0.75 * speed;
      if (spinB.current) spinB.current.rotation.z -= dt * 0.5 * speed;
    }
  });

  return (
    <group ref={body}>
      {/* Ghost frames behind the slab: parallax depth when it leans. */}
      <lineSegments geometry={geo.edges} material={ghost} position={[0.03, -0.02, -0.2]} scale={1.05} renderOrder={1} />
      <lineSegments geometry={geo.edges} material={ghost} position={[0.06, -0.04, -0.42]} scale={1.1} renderOrder={1} />
      <mesh geometry={geo.body} material={paper ? kit.glassPaper : kit.glass} renderOrder={2} />
      <mesh geometry={geo.body} material={gold ? kit.rimGold : kit.rim} renderOrder={3} />
      <lineSegments geometry={geo.edges} material={edge} renderOrder={4} />
      <mesh position={[0, 0, front]} material={faceMat} renderOrder={5}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <group ref={emblem} position={[place.x, place.y, front + FLOAT]} renderOrder={6}>
        <mesh material={embMat} renderOrder={6}>
          <planeGeometry args={[emblemSize, emblemSize]} />
        </mesh>
        <group rotation={[1.05, 0, 0.35]}>
          <group ref={spinA}>
            <lineLoop geometry={kit.circle} material={ringA} scale={r * 1.22} renderOrder={7} />
            <mesh geometry={kit.sat} material={satA} position={[r * 1.22, 0, 0]} scale={r * 0.075} renderOrder={8} />
          </group>
        </group>
        <group rotation={[0.45, -0.95, 0]}>
          <group ref={spinB} rotation={[0, 0, 1.6]}>
            <lineLoop geometry={kit.circle} material={ringB} scale={r * 1.4} renderOrder={7} />
            <mesh geometry={kit.sat} material={satB} position={[r * 1.4, 0, 0]} scale={r * 0.05} renderOrder={8} />
          </group>
        </group>
        <lineLoop geometry={kit.circle} material={ghost} scale={r * 1.0} renderOrder={7} />
      </group>
    </group>
  );
}
