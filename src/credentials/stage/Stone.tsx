import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, EdgesGeometry, MeshBasicMaterial, type Group } from 'three';
import type { BadgeSpec } from '../slots';
import type { AnimRef } from './anim';
import { frontZ, hdr, type Kit } from './kit';
import { Plinth } from './Plinth';
import { createPlateTexture } from './textures';

interface StoneProps {
  readonly spec: BadgeSpec;
  readonly kit: Kit;
  readonly anim: AnimRef;
  readonly still: boolean;
}

/** A wireframe cube holding a smaller solid one, turned, above the stone: the BCA's "computer applications". */
function FloatingCube({ kit, still, anim }: { kit: Kit; still: boolean; anim: AnimRef }) {
  const ref = useRef<Group>(null);
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(1, 1, 1)), []);
  const line = kit.amberEdge;
  useEffect(() => () => edges.dispose(), [edges]);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (!still) g.rotation.y += Math.min(dt, 0.05) * (0.5 + anim.current.hover * 1.4);
    g.position.y = 1.34 + (still ? 0 : Math.sin(anim.current.time * 1.1) * 0.05) + anim.current.hover * 0.12;
  });
  return (
    <group ref={ref} position={[0, 1.34, 0]} rotation={[0.5, still ? 0.7 : 0, 0.15]} scale={0.4}>
      <lineSegments geometry={edges} material={line} />
      <mesh rotation={[0.6, 0.6, 0]} scale={0.48} material={kit.cyanSolid}>
        <boxGeometry args={[1, 1, 1]} />
      </mesh>
    </group>
  );
}

/**
 * The second degree: a block of polished obsidian on a low plinth, its edges lit amber, the BCA wordmark on its face
 * and a small cube turning over it. Y is up; the plinth's top is at -1.35.
 */
export function Stone({ spec, kit, anim, still }: StoneProps) {
  const body = useRef<Group>(null);
  const plate = useMemo(() => createPlateTexture(spec), [spec]);
  const plateMat = useMemo(() => new MeshBasicMaterial({ map: plate, transparent: true, depthWrite: false, toneMapped: false, color: hdr('#ffffff', 2) }), [plate]);
  useEffect(
    () => () => {
      plate.dispose();
      plateMat.dispose();
    },
    [plate, plateMat],
  );
  const front = frontZ('stone') + 0.012;
  useFrame(() => {
    const b = body.current;
    if (!b) return;
    b.rotation.y = anim.current.yaw;
    b.rotation.x = anim.current.pitch;
  });
  return (
    <group>
      <group position={[0, -1.35, 0]}>
        <Plinth
          kit={kit}
          anim={anim}
          still={still}
          hex="#f59e0b"
          beam={3.3}
          tiers={[
            { r: 1.22, h: 0.12 },
            { r: 1.04, h: 0.14 },
          ]}
        />
      </group>
      <group ref={body}>
        <group scale={1.12} position={[0, -0.23, 0]}>
          <mesh geometry={kit.geo.stone} material={kit.stone} />
          <lineSegments geometry={kit.geo.stoneEdges} material={kit.amberEdge} />
          <mesh position={[0, 0.12, front]} material={plateMat}>
            <planeGeometry args={[1.12, 0.56]} />
          </mesh>
          <mesh position={[0, 0.12, -front]} rotation={[0, Math.PI, 0]} material={plateMat}>
            <planeGeometry args={[1.12, 0.56]} />
          </mesh>
        </group>
        <FloatingCube kit={kit} still={still} anim={anim} />
      </group>
    </group>
  );
}
