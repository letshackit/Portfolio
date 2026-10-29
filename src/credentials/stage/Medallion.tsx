import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MeshPhysicalMaterial, type Group, type Mesh } from 'three';
import type { BadgeSpec } from '../slots';
import type { AnimRef } from './anim';
import { hdr, type Kit } from './kit';
import { Plinth } from './Plinth';
import { createCoinTextures } from './textures';

interface MedallionProps {
  readonly spec: BadgeSpec;
  readonly kit: Kit;
  readonly anim: AnimRef;
  readonly still: boolean;
}

const COIN_Y = 0.5;
const FACE_Z = 0.122;

/**
 * A certification as a struck medallion: a gold or steel rim, a dark machined face with the title running round it, an
 * abstract emblem and the issuer's wordmark, levitating over a lit plinth. It turns on its axis, lifts and spins on hover.
 */
export function Medallion({ spec, kit, anim, still }: MedallionProps) {
  const coin = useRef<Group>(null);
  const halo = useRef<Mesh>(null);
  const tex = useMemo(() => createCoinTextures(spec, kit.q.tex), [spec, kit.q.tex]);
  const gold = spec.metal === 'gold';
  const faceMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        map: tex.map,
        emissiveMap: tex.glow,
        emissive: new Color('#ffffff'),
        emissiveIntensity: 1.15,
        bumpMap: tex.glow,
        bumpScale: 2.4,
        metalness: 0.55,
        roughness: 0.36,
        clearcoat: 0.8,
        clearcoatRoughness: 0.18,
        envMapIntensity: 1.1,
      }),
    [tex],
  );
  const haloMat = useMemo(() => kit.cyanBasic.clone(), [kit.cyanBasic]);
  useEffect(() => {
    haloMat.color.copy(hdr(gold ? '#f59e0b' : '#22d3ee', 2));
  }, [haloMat, gold]);
  useEffect(
    () => () => {
      tex.map.dispose();
      tex.glow.dispose();
      faceMat.dispose();
      haloMat.dispose();
    },
    [tex, faceMat, haloMat],
  );

  useFrame(() => {
    const a = anim.current;
    const c = coin.current;
    if (c) {
      c.rotation.y = a.yaw;
      c.rotation.x = a.pitch - 0.04;
      c.position.y = COIN_Y + (still ? 0 : Math.sin(a.time * 1.2) * 0.05) + a.hover * 0.2;
    }
    faceMat.emissiveIntensity = 1.1 + a.hover * 0.8;
    if (halo.current) {
      halo.current.scale.setScalar(1.02 + a.hover * 0.08 + (still ? 0 : Math.sin(a.time * 1.6) * 0.015));
      haloMat.opacity = 0.35 + a.hover * 0.5;
    }
  });

  return (
    <group>
      <group position={[0, -1.15, 0]}>
        <Plinth
          kit={kit}
          anim={anim}
          still={still}
          hex={gold ? '#f59e0b' : '#22d3ee'}
          beam={1.9}
          tiers={[
            { r: 1.08, h: 0.1 },
            { r: 0.92, h: 0.12 },
            { r: 0.72, h: 0.16 },
          ]}
        />
      </group>
      <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.62, 0]} material={haloMat}>
        <torusGeometry args={[0.9, 0.012, 8, 100]} />
      </mesh>
      <group ref={coin} position={[0, COIN_Y, 0]}>
        <mesh geometry={kit.geo.coin} material={gold ? kit.gold : kit.steel} />
        <mesh position={[0, 0, FACE_Z]} material={faceMat}>
          <circleGeometry args={[0.845, 72]} />
        </mesh>
        <mesh position={[0, 0, -FACE_Z]} rotation={[0, Math.PI, 0]} material={faceMat}>
          <circleGeometry args={[0.845, 72]} />
        </mesh>
      </group>
    </group>
  );
}
