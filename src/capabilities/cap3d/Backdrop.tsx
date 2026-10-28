import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, Float32BufferAttribute, type Points } from 'three';
import { COLORS, type StageState } from './scene';
import { RING_RADIUS } from './layout';

/** Deterministic pseudo-random in [0,1): the star field is the same on every mount. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function ringGeometry(radius: number, segments: number, y = 0): BufferGeometry {
  const pts: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    pts.push(Math.cos(a) * radius, y, Math.sin(a) * radius, Math.cos(b) * radius, y, Math.sin(b) * radius);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}

/** The orbit's bezel: a ring of tick marks (every fifth one longer), like the scale on a radar or a watch. */
function tickGeometry(radius: number, count: number): BufferGeometry {
  const pts: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const len = i % 5 === 0 ? 0.26 : 0.1;
    pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius, Math.cos(a) * (radius + len), 0, Math.sin(a) * (radius + len));
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}

/** The polar floor under the orbit: concentric rings and spokes, faint, fading into the fog. */
function floorGeometry(): BufferGeometry {
  const pts: number[] = [];
  for (const r of [2.4, 4.2, 6.2, 8.6, 11.4]) {
    const n = 96;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const b = ((i + 1) / n) * Math.PI * 2;
      pts.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r);
    }
  }
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    pts.push(Math.cos(a) * 2.4, 0, Math.sin(a) * 2.4, Math.cos(a) * 11.4, 0, Math.sin(a) * 11.4);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}

function starGeometry(count: number): BufferGeometry {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 12 + rand(i + 1) * 20;
    const theta = rand(i + 91) * Math.PI * 2;
    const phi = Math.acos(2 * rand(i + 181) - 1);
    pos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    pos[i * 3 + 1] = Math.cos(phi) * r * 0.6;
    pos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

/** Orbit bezel, polar floor and a deep star field: depth cues that make the camera flight legible. */
export function Backdrop({ state, stars }: { readonly state: StageState; readonly stars: number }) {
  const field = useRef<Points>(null);
  const orbit = useMemo(() => ringGeometry(RING_RADIUS, 160), []);
  const ticks = useMemo(() => tickGeometry(RING_RADIUS + 0.55, 120), []);
  const floor = useMemo(() => floorGeometry(), []);
  const sky = useMemo(() => starGeometry(stars), [stars]);

  useEffect(
    () => () => {
      orbit.dispose();
      ticks.dispose();
      floor.dispose();
    },
    [orbit, ticks, floor],
  );
  useEffect(() => () => sky.dispose(), [sky]);

  useFrame(() => {
    if (field.current) field.current.rotation.y = state.time * 0.012;
  });

  return (
    <>
      <lineSegments geometry={orbit}>
        <lineBasicMaterial color={COLORS.cyan.base} transparent opacity={0.42} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={ticks}>
        <lineBasicMaterial color={COLORS.cyan.base} transparent opacity={0.3} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={floor} position={[0, -2.1, 0]}>
        <lineBasicMaterial color={COLORS.cyan.base} transparent opacity={0.13} toneMapped={false} />
      </lineSegments>
      <points ref={field} geometry={sky}>
        <pointsMaterial color="#9fb6c4" size={1.6} sizeAttenuation={false} transparent opacity={0.55} depthWrite={false} />
      </points>
    </>
  );
}
