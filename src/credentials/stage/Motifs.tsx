import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferGeometry, EdgesGeometry, BoxGeometry, Float32BufferAttribute, InstancedMesh, MeshBasicMaterial, Object3D, type Group, type Mesh } from 'three';
import type { Motif } from '../slots';
import { hdr, type Kit } from './kit';
import { nearestEdges, spherePoints } from './shapes';

interface MotifProps {
  readonly kit: Kit;
  /** Frozen pose and no motion: reduced motion. */
  readonly still: boolean;
}

/** Slow spin of whatever sits inside the glass, so it stays alive while the glass itself only sways. */
function Spinner({ still, speed = 0.55, tilt = 0, children }: { still: boolean; speed?: number; tilt?: number; children: React.ReactNode }) {
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

/** IIIT-B: a neural lattice, with one amber signal hopping node to node (agent activity; the other badges carry a single amber accent each). */
function Lattice({ kit, still }: MotifProps) {
  const nodes = useMemo(() => spherePoints(20), []);
  const edges = useMemo(() => nearestEdges(nodes, 3), [nodes]);
  const lines = useMemo(() => {
    const g = new BufferGeometry();
    const p: number[] = [];
    for (const [a, b] of edges) p.push(...nodes[a], ...nodes[b]);
    g.setAttribute('position', new Float32BufferAttribute(p, 3));
    return g;
  }, [nodes, edges]);
  useLayoutEffect(() => () => lines.dispose(), [lines]);
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
    <group scale={0.5} position={[0, 0.34, 0]}>
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

/** BCA: a wireframe cube holding a smaller solid one, turned 45 degrees. */
function Cube({ kit, still }: MotifProps) {
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(1, 1, 1)), []);
  useLayoutEffect(() => () => edges.dispose(), [edges]);
  return (
    <group scale={0.52} position={[0, 0.2, 0]}>
      <Spinner still={still} speed={0.5} tilt={0.5}>
        <lineSegments geometry={edges} material={kit.cyanLine} />
        <mesh rotation={[0.6, 0.6, 0]} scale={0.46} material={kit.cyanSolid}>
          <boxGeometry args={[1, 1, 1]} />
        </mesh>
      </Spinner>
    </group>
  );
}

/** Project management: a three-row schedule. */
function Gantt({ kit }: MotifProps) {
  const rows: [number, number, number][] = [
    [-0.18, 0.3, 0.62],
    [0.05, 0, 0.5],
    [0.22, -0.3, 0.66],
  ];
  return (
    <group position={[0, 0.28, 0]} scale={0.72}>
      {rows.map(([x, y, w], i) => (
        <mesh key={y} position={[x, y, 0]} material={i === 1 ? kit.amber : kit.cyanSolid}>
          <boxGeometry args={[w, 0.13, 0.14]} />
        </mesh>
      ))}
      <mesh position={[-0.52, 0, 0]} material={kit.cyanBasic}>
        <boxGeometry args={[0.025, 0.86, 0.04]} />
      </mesh>
    </group>
  );
}

/** Python for data science: a torus knot. */
function Knot({ kit, still }: MotifProps) {
  return (
    <group position={[0, 0.28, 0]} scale={0.9}>
      <Spinner still={still} speed={0.7} tilt={0.3}>
        <mesh material={kit.cyanSolid}>
          <torusKnotGeometry args={[0.3, 0.085, 140, 14, 2, 3]} />
        </mesh>
      </Spinner>
    </group>
  );
}

/** Cloud computing: three overlapping spheres. */
function Cloud({ kit, still }: MotifProps) {
  return (
    <group position={[0, 0.3, 0]} scale={0.78}>
      <Spinner still={still} speed={0.35}>
        {(
          [
            [-0.3, -0.04, 0.27],
            [0.03, 0.1, 0.37],
            [0.36, -0.04, 0.27],
          ] as const
        ).map(([x, y, r]) => (
          <mesh key={x} position={[x, y, 0]} material={kit.cyanSolid}>
            <sphereGeometry args={[r, 24, 16]} />
          </mesh>
        ))}
        <mesh position={[0.02, 0.5, 0.1]} material={kit.amber}>
          <sphereGeometry args={[0.085, 16, 12]} />
        </mesh>
      </Spinner>
    </group>
  );
}

/** Information security: a faceted core in a wire shell. */
function Shield({ kit, still }: MotifProps) {
  return (
    <group position={[0, 0.3, 0]} scale={0.8}>
      <Spinner still={still} speed={0.6} tilt={0.35}>
        <mesh>
          <icosahedronGeometry args={[0.5, 0]} />
          <meshBasicMaterial color={kit.cyanLine.color} wireframe />
        </mesh>
        <mesh material={kit.amber}>
          <octahedronGeometry args={[0.22, 0]} />
        </mesh>
      </Spinner>
    </group>
  );
}

/** Analytics 360: a ring with a satellite. */
function Orbit({ kit, still }: MotifProps) {
  const sat = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (sat.current) sat.current.rotation.z = still ? 0.9 : clock.elapsedTime * 1.1;
  });
  return (
    <group position={[0, 0.3, 0]} scale={0.85} rotation={[0.9, 0.2, 0]}>
      <mesh material={kit.cyanBasic}>
        <torusGeometry args={[0.46, 0.022, 10, 80]} />
      </mesh>
      <mesh material={kit.cyanSolid}>
        <sphereGeometry args={[0.17, 20, 14]} />
      </mesh>
      <group ref={sat}>
        <mesh position={[0.46, 0, 0]} material={kit.amber}>
          <sphereGeometry args={[0.085, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
}

/** The publication: lines of text on a page. */
function Page({ kit }: MotifProps) {
  const widths = [0.78, 0.9, 0.62, 0.9, 0.84, 0.5];
  // A lit sheet under the lines: the paper is the one object with nothing but dark wall behind it, and read as a grey slab.
  const sheet = useMemo(() => new MeshBasicMaterial({ color: hdr('#22d3ee', 0.55), transparent: true, opacity: 0.5, toneMapped: false, depthWrite: false }), []);
  useLayoutEffect(() => () => sheet.dispose(), [sheet]);
  return (
    <group position={[0, 0.1, 0]}>
      <mesh position={[0, 0.0, -0.03]} material={sheet}>
        <planeGeometry args={[1.14, 1.76]} />
      </mesh>
      <mesh position={[-0.2, 0.62, 0]} material={kit.amber}>
        <boxGeometry args={[0.55, 0.1, 0.03]} />
      </mesh>
      {widths.map((w, i) => (
        <mesh key={i} position={[(w - 0.9) / 2 - 0.0, 0.3 - i * 0.18, 0]} material={i === 2 ? kit.amber : kit.cyanBasic}>
          <boxGeometry args={[w, 0.045, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

export function MotifBody({ motif, ...rest }: MotifProps & { readonly motif: Motif }) {
  switch (motif) {
    case 'lattice':
      return <Lattice {...rest} />;
    case 'cube':
      return <Cube {...rest} />;
    case 'gantt':
      return <Gantt {...rest} />;
    case 'knot':
      return <Knot {...rest} />;
    case 'cloud':
      return <Cloud {...rest} />;
    case 'shield':
      return <Shield {...rest} />;
    case 'orbit':
      return <Orbit {...rest} />;
    case 'page':
      return <Page {...rest} />;
  }
}
