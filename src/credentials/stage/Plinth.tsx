import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, MeshBasicMaterial, type Group } from 'three';
import type { AnimRef } from './anim';
import { beamMaterial, hdr, type Kit } from './kit';

interface Tier {
  readonly r: number;
  readonly h: number;
}

interface PlinthProps {
  readonly kit: Kit;
  readonly anim: AnimRef;
  readonly still: boolean;
  /** Tiers from the top down; the top surface of the first sits at y = 0. */
  readonly tiers: readonly Tier[];
  /** Light colour: cyan for the cyan half of the palette, amber for the other. */
  readonly hex: '#22d3ee' | '#f59e0b';
  /** Height of the shaft of light over the plinth; 0 for none. */
  readonly beam: number;
}

/**
 * A stepped, machined plinth: dark metal tiers with a lit edge on each, the etched top slowly turning, a pool of light
 * under it and (optionally) a shaft of light over it. Hover brightens the lot.
 */
export function Plinth({ kit, anim, still, tiers, hex, beam }: PlinthProps) {
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: hdr(hex, 2.1), toneMapped: false }), [hex]);
  const discMat = useMemo(
    () => new MeshBasicMaterial({ map: kit.plinthTex, color: hdr(hex, 1.2), transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [kit.plinthTex, hex],
  );
  const poolMat = useMemo(
    () => new MeshBasicMaterial({ map: kit.soft, color: hdr(hex, 1.2), transparent: true, opacity: 0.4, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [kit.soft, hex],
  );
  const beamMat = useMemo(() => beamMaterial(hex), [hex]);
  useEffect(
    () => () => {
      ringMat.dispose();
      discMat.dispose();
      poolMat.dispose();
      beamMat.dispose();
    },
    [ringMat, discMat, poolMat, beamMat],
  );
  const base = useMemo(() => new Color(hex), [hex]);
  const disc = useRef<Group>(null);

  useFrame((_, rawDt) => {
    const h = anim.current.hover;
    ringMat.color.copy(base).multiplyScalar(2.1 + h * 1.6);
    discMat.opacity = 0.75 + 0.25 * h;
    poolMat.opacity = 0.28 + 0.26 * h;
    beamMat.uniforms.uOpacity.value = 0.34 + 0.3 * h;
    if (!still && disc.current) disc.current.rotation.y += Math.min(rawDt, 0.05) * (0.12 + h * 0.5);
  });

  let y = 0;
  const total = tiers.reduce((a, t) => a + t.h, 0);
  const top = tiers[0];
  return (
    <group>
      {tiers.map((t, i) => {
        const cy = y - t.h / 2;
        const edge = y;
        y -= t.h;
        return (
          <group key={i}>
            <mesh geometry={kit.geo.tier} material={kit.plinth} position={[0, cy, 0]} scale={[t.r, t.h, t.r]} />
            <mesh geometry={kit.geo.tierRing} material={ringMat} position={[0, edge - 0.004, 0]} rotation={[Math.PI / 2, 0, 0]} scale={t.r} />
          </group>
        );
      })}
      <group ref={disc} position={[0, 0.004, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={discMat} scale={top.r * 0.97}>
          <circleGeometry args={[1, 72]} />
        </mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -total - 0.02, 0]} material={poolMat} scale={top.r * 2.1}>
        <circleGeometry args={[1, 48]} />
      </mesh>
      {beam > 0 ? <mesh geometry={kit.geo.beam} material={beamMat} position={[0, beam / 2, 0]} scale={[top.r * 0.86, beam, top.r * 0.86]} /> : null}
    </group>
  );
}
