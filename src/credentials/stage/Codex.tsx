import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBasicMaterial, type Group } from 'three';
import type { BadgeSpec } from '../slots';
import type { AnimRef } from './anim';
import { frontZ, hdr, type Kit } from './kit';
import { Plinth } from './Plinth';
import { createPageTexture } from './textures';

interface CodexProps {
  readonly spec: BadgeSpec;
  readonly kit: Kit;
  readonly anim: AnimRef;
  readonly still: boolean;
}

/**
 * The publication: a glass-bound paper standing over an amber plinth, two more sheets behind it as lit edges, its cover
 * (title, journal, ruled lines) on the front. Y is up; the plinth's top is at -1.25.
 */
export function Codex({ spec, kit, anim, still }: CodexProps) {
  const body = useRef<Group>(null);
  const page = useMemo(() => createPageTexture(spec), [spec]);
  const coverMat = useMemo(() => new MeshBasicMaterial({ map: page, toneMapped: false, color: hdr('#ffffff', 1.5) }), [page]);
  useEffect(
    () => () => {
      page.dispose();
      coverMat.dispose();
    },
    [page, coverMat],
  );
  const front = frontZ('paper') + 0.01;
  useFrame(() => {
    const b = body.current;
    if (!b) return;
    b.rotation.y = anim.current.yaw;
    b.rotation.x = anim.current.pitch;
    b.position.y = 0.15 + (still ? 0 : Math.sin(anim.current.time * 0.9) * 0.04) + anim.current.hover * 0.1;
  });
  return (
    <group>
      <group position={[0, -1.25, 0]}>
        <Plinth
          kit={kit}
          anim={anim}
          still={still}
          hex="#f59e0b"
          beam={2.6}
          tiers={[
            { r: 1.16, h: 0.1 },
            { r: 0.98, h: 0.14 },
          ]}
        />
      </group>
      <group ref={body} position={[0, 0.15, 0]}>
        {[2, 1].map((n) => (
          <lineSegments key={n} geometry={kit.geo.paperEdges} material={kit.amberEdge} position={[0.05 * n, -0.03 * n, -0.2 * n]} scale={1 - 0.02 * n} />
        ))}
        <mesh geometry={kit.geo.paper} material={kit.glassPaper} />
        <mesh geometry={kit.geo.paper} material={kit.rimPaper} />
        <lineSegments geometry={kit.geo.paperEdges} material={kit.amberEdge} />
        <mesh position={[0, 0, front]} material={coverMat}>
          <planeGeometry args={[1.2, 1.8]} />
        </mesh>
        <mesh position={[0, 0, -front]} rotation={[0, Math.PI, 0]} material={coverMat}>
          <planeGeometry args={[1.2, 1.8]} />
        </mesh>
      </group>
    </group>
  );
}
