import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, EdgesGeometry, IcosahedronGeometry, type Group, type Mesh, type ShaderMaterial } from 'three';
import { COLORS, createAura, type StageState } from './scene';

const HOT = new Color('#22d3ee').multiplyScalar(0.95);
const RING_RADII = [1.22, 1.5, 1.82] as const;

/**
 * The core the four domains orbit: a hot centre, a Fresnel aura, a wireframe geodesic shell and three gyroscope rings
 * turning on different axes. Cyan only; amber belongs to the agent work on the AI-native cluster.
 */
export function Core({ state, segments }: { readonly state: StageState; readonly segments: number }) {
  const shell = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const centre = useRef<Mesh>(null);
  const aura = useMemo<ShaderMaterial>(() => createAura(COLORS.cyan.base, 2.6, 0.8), []);
  const edges = useMemo(() => new EdgesGeometry(new IcosahedronGeometry(1.0, 1), 1), []);
  useEffect(
    () => () => {
      aura.dispose();
      edges.dispose();
    },
    [aura, edges],
  );

  useFrame(() => {
    const t = state.time;
    const spin = 1 + state.scroll * 0.8;
    if (shell.current) {
      shell.current.rotation.y = t * 0.18 * spin;
      shell.current.rotation.x = Math.sin(t * 0.21) * 0.25;
    }
    if (rings.current) {
      const [a, b, c] = rings.current.children;
      if (a) a.rotation.set(t * 0.31 * spin, 0, t * 0.12);
      if (b) b.rotation.set(Math.PI / 2.4, t * 0.27 * spin, 0);
      if (c) c.rotation.set(t * 0.1, t * 0.17, Math.PI / 3 + t * 0.2 * spin);
    }
    if (centre.current) centre.current.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
  });

  return (
    <group>
      <mesh ref={centre}>
        <sphereGeometry args={[0.26, segments, segments]} />
        <meshBasicMaterial color={HOT} toneMapped={false} />
      </mesh>
      <mesh material={aura}>
        <sphereGeometry args={[0.74, segments, segments]} />
      </mesh>
      <group ref={shell}>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color={COLORS.cyan.hot} transparent opacity={0.45} toneMapped={false} />
        </lineSegments>
        <mesh>
          <icosahedronGeometry args={[0.98, 1]} />
          <meshBasicMaterial color={COLORS.cyan.base} transparent opacity={0.07} depthWrite={false} />
        </mesh>
      </group>
      <group ref={rings}>
        {RING_RADII.map((r, i) => (
          <mesh key={r}>
            <torusGeometry args={[r, 0.007, 6, 96]} />
            <meshBasicMaterial color={COLORS.cyan.hot} transparent opacity={0.4 - i * 0.09} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight color="#22d3ee" intensity={26} distance={18} decay={2} />
    </group>
  );
}
