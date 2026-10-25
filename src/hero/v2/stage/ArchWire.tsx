import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { travelDeskArchitecture } from '../../../data/traveldesk-architecture';
import { smoothstep, store } from '../store';

/**
 * Rotating wireframe of the 18-service TravelDesk architecture: 1 front end, 1 gateway, 16 domain services, then the
 * integrations. Node ids and edges come from src/data/traveldesk-architecture.ts. Boxes are EdgesGeometry in cyan,
 * amber packets ride the real edges.
 *
 * Not mounted in the hero: the service city is the architecture there. Kept as a component for the Architecture
 * section, which can mount it in its own canvas and drive `store.progress` / `store.intro` itself.
 */

interface Placed {
  id: string;
  kind: string;
  pos: THREE.Vector3;
  size: [number, number, number];
}

function layout(): { nodes: Placed[]; edges: [THREE.Vector3, THREE.Vector3][] } {
  const { nodes, edges } = travelDeskArchitecture;
  const placed = new Map<string, Placed>();
  const domain = nodes.filter((n) => n.kind === 'domain');
  placed.set('gateway', { id: 'gateway', kind: 'gateway', pos: new THREE.Vector3(0, 0, 0), size: [0.5, 0.34, 0.5] });
  placed.set('frontend', { id: 'frontend', kind: 'frontend', pos: new THREE.Vector3(0, 1.15, 0), size: [0.66, 0.26, 0.4] });
  const angleOf = new Map<string, number>();
  domain.forEach((n, i) => {
    const a = (i / domain.length) * Math.PI * 2;
    angleOf.set(n.id, a);
    const r = 1.18;
    placed.set(n.id, {
      id: n.id,
      kind: 'domain',
      pos: new THREE.Vector3(Math.cos(a) * r, i % 2 === 0 ? 0.3 : -0.3, Math.sin(a) * r),
      size: [0.24, 0.24, 0.24],
    });
  });
  const adapterFor: Record<string, string> = { hris: 'hris-adapter', quest2travel: 'vendor-adapter', sap: 'sap-adapter' };
  nodes
    .filter((n) => n.kind === 'integration' || n.kind === 'integration-phase2')
    .forEach((n, i) => {
      const adapter = adapterFor[n.id];
      const a = adapter ? (angleOf.get(adapter) ?? 0) : (i * 2.4 + 0.5) % (Math.PI * 2);
      const r = 2.05;
      const phase2 = n.kind === 'integration-phase2';
      placed.set(n.id, {
        id: n.id,
        kind: n.kind,
        pos: new THREE.Vector3(Math.cos(a) * r, phase2 ? 0.75 : 0, Math.sin(a) * r),
        size: phase2 ? [0.3, 0.2, 0.3] : [0.34, 0.34, 0.34],
      });
    });
  const segs: [THREE.Vector3, THREE.Vector3][] = [];
  for (const e of edges) {
    const a = placed.get(e.from);
    const b = placed.get(e.to);
    if (a && b) segs.push([a.pos, b.pos]);
  }
  return { nodes: [...placed.values()], edges: segs };
}

const PACKETS = 34;
const BASE_Y = 0.85;
const WIRE_SCALE = 0.7;
const BASE_Z = -1.5;

const packetVert = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  varying float vAlpha;
  uniform float uScale;
  void main() {
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale * (1.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const packetFrag = /* glsl */ `
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.0, d);
    float glow = pow(core, 2.4);
    vec3 col = mix(vec3(1.0, 0.55, 0.05), vec3(1.0, 0.9, 0.55), pow(core, 6.0));
    gl_FragColor = vec4(col * (0.6 + 2.4 * glow), glow * vAlpha);
  }
`;

export function ArchWire({ visible = true }: { visible?: boolean }) {
  const root = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const { nodes, edges } = useMemo(layout, []);

  const boxEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), []);
  const edgeGeo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (const [a, b] of edges) pts.push(a, b);
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [edges]);

  const packets = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PACKETS * 3), 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(PACKETS).fill(1), 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(PACKETS).fill(1), 1));
    const state = Array.from({ length: PACKETS }, (_, i) => ({
      edge: Math.floor(Math.random() * edges.length),
      t: Math.random(),
      speed: 0.28 + Math.random() * 0.5,
      dir: i % 5 === 0 ? -1 : 1,
      size: 70 + Math.random() * 60,
    }));
    return { geo, state };
  }, [edges.length]);

  const lineMats = useRef<THREE.Material[]>([]);
  const packetMat = useRef<THREE.ShaderMaterial>(null);

  useEffect(
    () => () => {
      boxEdges.dispose();
      edgeGeo.dispose();
      packets.geo.dispose();
    },
    [boxEdges, edgeGeo, packets],
  );

  useFrame((s, dt) => {
    const g = root.current;
    const sp = spin.current;
    if (!g || !sp) return;
    const { progress, intro, reduced, px: mx, py: my } = store;
    const t = s.clock.elapsedTime;
    const fp = smoothstep(0.1, 0.9, progress);
    if (!reduced) sp.rotation.y = t * 0.16 + mx * 0.35;
    else sp.rotation.y = 0.6;
    sp.rotation.x = 0.2 + my * -0.08;
    const iv = smoothstep(0.18, 0.8, intro);
    const base = WIRE_SCALE * (0.9 + 0.1 * iv);
    g.scale.setScalar(base * (1 + 0.9 * fp));
    g.position.set(-2.3 * fp, BASE_Y + 0.7 * fp, BASE_Z - 3.2 * fp);
    const op = (0.2 + 0.8 * iv) * (1 - 0.82 * fp);
    for (const m of lineMats.current) (m as THREE.LineBasicMaterial).opacity = m.userData.o * op;
    if (packetMat.current) packetMat.current.uniforms.uScale.value = 160 * op * (s.size.height / 900);
    g.visible = visible;

    // packets
    const pos = packets.geo.attributes.position as THREE.BufferAttribute;
    const al = packets.geo.attributes.aAlpha as THREE.BufferAttribute;
    const step = reduced ? 0 : Math.min(dt, 0.05);
    packets.state.forEach((p, i) => {
      p.t += step * p.speed * p.dir;
      if (p.t > 1 || p.t < 0) {
        p.edge = Math.floor(Math.random() * edges.length);
        p.t = p.dir > 0 ? 0 : 1;
      }
      const [a, b] = edges[p.edge];
      pos.setXYZ(i, a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t, a.z + (b.z - a.z) * p.t);
      al.setX(i, Math.sin(p.t * Math.PI) * 0.9 + 0.1);
    });
    pos.needsUpdate = true;
    al.needsUpdate = true;
  });

  const register = (m: THREE.Material | null, o: number) => {
    if (!m) return;
    m.userData.o = o;
    if (!lineMats.current.includes(m)) lineMats.current.push(m);
  };

  return (
    <group ref={root} position={[0, BASE_Y, BASE_Z]}>
      <group ref={spin}>
        <lineSegments geometry={edgeGeo} renderOrder={3}>
          <lineBasicMaterial ref={(m) => register(m, 0.42)} color={new THREE.Color('#22d3ee').multiplyScalar(1.5)} transparent toneMapped={false} fog={false} depthWrite={false} />
        </lineSegments>
        {nodes.map((n) => {
          const strong = n.kind === 'gateway' || n.kind === 'frontend';
          const ghost = n.kind === 'integration-phase2';
          return (
            <group key={n.id} position={n.pos} scale={n.size}>
              <lineSegments geometry={boxEdges} renderOrder={3}>
                <lineBasicMaterial
                  ref={(m) => register(m, strong ? 1 : ghost ? 0.4 : 0.8)}
                  color={new THREE.Color(strong ? '#a5f3fc' : '#22d3ee').multiplyScalar(strong ? 2.2 : 1.6)}
                  transparent
                  toneMapped={false}
                  fog={false}
                  depthWrite={false}
                />
              </lineSegments>
              <mesh renderOrder={2}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial
                  ref={(m) => register(m, strong ? 0.2 : 0.09)}
                  color="#0aa5c0"
                  transparent
                  toneMapped={false}
                  fog={false}
                  depthWrite={false}
                />
              </mesh>
            </group>
          );
        })}
        <points geometry={packets.geo} renderOrder={4} frustumCulled={false}>
          <shaderMaterial
            ref={packetMat}
            vertexShader={packetVert}
            fragmentShader={packetFrag}
            uniforms={{ uScale: { value: 160 } }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      </group>
      {/* HUD rings around the system */}
      <Ring radius={2.55} speed={0.12} opacity={0.22} register={register} />
      <Ring radius={2.8} speed={-0.07} opacity={0.12} register={register} />
    </group>
  );
}

function Ring({
  radius,
  speed,
  opacity,
  register,
}: {
  radius: number;
  speed: number;
  opacity: number;
  register: (m: THREE.Material | null, o: number) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 180; i += 1) {
      const a = (i / 180) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return g;
  }, [radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((s) => {
    if (ref.current && !store.reduced) ref.current.rotation.y = s.clock.elapsedTime * speed;
  });
  return (
    <group ref={ref} rotation={[0.2, 0, 0]}>
      <lineLoop geometry={geo}>
        <lineBasicMaterial ref={(m) => register(m, opacity)} color="#22d3ee" transparent toneMapped={false} fog={false} />
      </lineLoop>
    </group>
  );
}
