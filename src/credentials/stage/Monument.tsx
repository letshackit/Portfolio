import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  type Group,
  type Mesh,
} from 'three';
import type { BadgeSpec } from '../slots';
import type { AnimRef } from './anim';
import { frontZ, hdr, type Kit } from './kit';
import { Plinth } from './Plinth';
import { nearestEdges, spherePoints } from './shapes';
import { createPlateTexture } from './textures';

interface ObjectProps {
  readonly spec: BadgeSpec;
  readonly kit: Kit;
  readonly anim: AnimRef;
  /** Reduced motion: a fixed, flattering pose; nothing moves. */
  readonly still: boolean;
}

/** Slow spin of whatever sits inside the glass, so it stays alive while the glass itself only sways. */
function Spinner({ still, speed, tilt, children }: { still: boolean; speed: number; tilt: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (still || !ref.current) return;
    ref.current.rotation.y += Math.min(dt, 0.05) * speed;
  });
  return (
    <group rotation={[tilt, still ? 0.6 : 0, 0]} ref={ref}>
      {children}
    </group>
  );
}

/** IIIT-B: a neural lattice, with one amber signal hopping node to node (agent activity). */
function Lattice({ kit, still }: { kit: Kit; still: boolean }) {
  const nodes = useMemo(() => spherePoints(22), []);
  const edges = useMemo(() => nearestEdges(nodes, 3), [nodes]);
  const lines = useMemo(() => {
    const g = new BufferGeometry();
    const p: number[] = [];
    for (const [a, b] of edges) p.push(...nodes[a], ...nodes[b]);
    g.setAttribute('position', new Float32BufferAttribute(p, 3));
    return g;
  }, [nodes, edges]);
  useEffect(() => () => lines.dispose(), [lines]);
  const inst = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = inst.current;
    if (!m) return;
    const o = new Object3D();
    nodes.forEach((n, i) => {
      o.position.set(n[0], n[1], n[2]);
      o.scale.setScalar(i % 5 === 0 ? 0.1 : 0.065);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [nodes]);
  const pulse = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = pulse.current;
    if (!m) return;
    const t = still ? 0.35 : clock.elapsedTime / 0.62;
    const i = Math.floor(t) % edges.length;
    const f = t - Math.floor(t);
    const [a, b] = edges[i];
    const e = f * f * (3 - 2 * f);
    m.position.set(nodes[a][0] + (nodes[b][0] - nodes[a][0]) * e, nodes[a][1] + (nodes[b][1] - nodes[a][1]) * e, nodes[a][2] + (nodes[b][2] - nodes[a][2]) * e);
  });
  return (
    <group scale={0.46} position={[0, 0.24, 0]}>
      <Spinner still={still} speed={0.4} tilt={0.25}>
        <lineSegments geometry={lines} material={kit.cyanLine} />
        <instancedMesh ref={inst} args={[undefined, undefined, nodes.length]} material={kit.cyanBasic}>
          <sphereGeometry args={[1, 14, 10]} />
        </instancedMesh>
        <mesh ref={pulse} material={kit.amber}>
          <sphereGeometry args={[0.16, 14, 10]} />
        </mesh>
      </Spinner>
    </group>
  );
}

/** Two tilted rings and a satellite on each, crossing the glass. */
function Orbits({ kit, still }: { kit: Kit; still: boolean }) {
  const sat = useRef<Group>(null);
  const sat2 = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = still ? 1.6 : clock.elapsedTime;
    if (sat.current) sat.current.rotation.z = t * 0.5;
    if (sat2.current) sat2.current.rotation.z = -t * 0.35 + 1;
  });
  return (
    <group position={[0, 0.1, 0]}>
      <group rotation={[1.2, 0.15, 0.35]}>
        <mesh material={kit.cyanBasic}>
          <torusGeometry args={[1.55, 0.0075, 8, 220]} />
        </mesh>
        <group ref={sat}>
          <mesh position={[1.55, 0, 0]} material={kit.cyanBasic}>
            <sphereGeometry args={[0.05, 12, 10]} />
          </mesh>
        </group>
      </group>
      <group rotation={[1.0, -0.5, -0.5]}>
        <mesh material={kit.ring}>
          <torusGeometry args={[1.42, 0.005, 8, 220]} />
        </mesh>
        <group ref={sat2}>
          <mesh position={[1.42, 0, 0]} material={kit.amber}>
            <sphereGeometry args={[0.032, 10, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** A cyan band that travels up the glass and fades at both ends: the monument being read. */
function Scan({ still, anim }: { still: boolean; anim: AnimRef }) {
  const ref = useRef<Mesh>(null);
  const mat = useMemo(() => new MeshBasicMaterial({ color: hdr('#67e8f9', 2.4), transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const period = 4.6 - anim.current.hover * 2.2;
    const f = still ? 0.62 : (clock.elapsedTime % period) / period;
    m.position.y = -1 + f * 2;
    mat.opacity = Math.sin(f * Math.PI) * (0.5 + 0.3 * anim.current.hover);
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} scale={[0.7, 0.34, 1]} material={mat}>
      <torusGeometry args={[1, 0.012, 6, 64]} />
    </mesh>
  );
}

/**
 * The centrepiece: a stele of smoked cyan glass on a stepped plinth, a neural lattice floating inside it, the IIIT-B
 * wordmark lit on its face, two orbits round it and a shaft of light over the plinth. Y is up; the plinth's top is at -1.5.
 */
export function Monument({ spec, kit, anim, still }: ObjectProps) {
  const body = useRef<Group>(null);
  const plate = useMemo(() => createPlateTexture(spec), [spec]);
  const plateMat = useMemo(
    () => new MeshBasicMaterial({ map: plate, transparent: true, depthWrite: false, toneMapped: false, color: hdr('#ffffff', 2.1) }),
    [plate],
  );
  useEffect(
    () => () => {
      plate.dispose();
      plateMat.dispose();
    },
    [plate, plateMat],
  );
  const front = frontZ('hero') + 0.012;
  useFrame(() => {
    const b = body.current;
    if (!b) return;
    b.rotation.y = anim.current.yaw;
    b.rotation.x = anim.current.pitch;
    b.position.y = Math.sin(anim.current.time * 0.8) * 0.03 * (still ? 0 : 1) + anim.current.hover * 0.06;
  });
  return (
    <group>
      <group position={[0, -1.5, 0]}>
        <Plinth
          kit={kit}
          anim={anim}
          still={still}
          hex="#22d3ee"
          beam={3.9}
          tiers={[
            { r: 1.5, h: 0.12 },
            { r: 1.32, h: 0.12 },
            { r: 1.1, h: 0.16 },
          ]}
        />
      </group>
      <group ref={body}>
        <group scale={1.5} position={[0, 0, 0]}>
          <mesh geometry={kit.geo.hero} material={kit.glassHero} />
          <mesh geometry={kit.geo.hero} material={kit.rimHero} />
          <lineSegments geometry={kit.geo.heroEdges} material={kit.edge} />
          <Lattice kit={kit} still={still} />
          <Scan still={still} anim={anim} />
          <mesh position={[0, -0.56, front]} material={plateMat}>
            <planeGeometry args={[1.16, 0.58]} />
          </mesh>
          <mesh position={[0, -0.56, -front]} rotation={[0, Math.PI, 0]} material={plateMat}>
            <planeGeometry args={[1.16, 0.58]} />
          </mesh>
        </group>
        <Orbits kit={kit} still={still} />
      </group>
    </group>
  );
}
