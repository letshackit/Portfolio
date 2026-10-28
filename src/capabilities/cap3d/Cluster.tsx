import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  BoxGeometry,
  EdgesGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  TetrahedronGeometry,
  type BufferGeometry,
  type Group,
  type LineBasicMaterial,
  type LineSegments,
  type Mesh,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
  type MeshStandardMaterial,
  type PointLight,
  type ShaderMaterial,
} from 'three';
import type { CapabilityGroup } from '../../data/content.types';
import type { DomainLook, Shape } from '../domains';
import { damp, hubPosition, nodeSlot, orbitOffset, smooth } from './layout';
import { COLORS, createAura, type StageState } from './scene';

const HUB_R = 0.42;
const HUB_R_ACTIVE = 0.6;

function shapeGeometry(shape: Shape): BufferGeometry {
  switch (shape) {
    case 'tetra':
      return new TetrahedronGeometry(1.15);
    case 'cube':
      return new BoxGeometry(1.25, 1.25, 1.25);
    case 'icosa':
      return new IcosahedronGeometry(1.0, 0);
    case 'octa':
      return new OctahedronGeometry(1.1);
  }
}

const SOLID: Readonly<Record<DomainLook['tone'], string>> = { cyan: '#0a2a31', amber: '#2d1c05' };

export interface ClusterProps {
  readonly index: number;
  readonly count: number;
  readonly group: CapabilityGroup;
  readonly look: DomainLook;
  readonly active: boolean;
  readonly state: StageState;
  readonly segments: number;
  /** World units per CSS pixel at the hub's distance, so the open ring is sized in screen terms. */
  readonly unitsPerPx: number;
  /** Half-width and half-height of the open ring, in CSS pixels. */
  readonly rxPx: number;
  readonly ryPx: number;
  readonly onSelect: (index: number) => void;
}

/**
 * One domain: a faceted hub on the orbit ring and its skills. Closed, the skills are tiny satellites circling the hub.
 * Open (active), they fly out into a ring in the screen plane, tethered to the hub, each carrying its label as DOM.
 * The group turns about the vertical axis to face the camera, so the open ring is always square to the viewer.
 */
export function Cluster({ index, count, group, look, active, state, segments, unitsPerPx, rxPx, ryPx, onSelect }: ClusterProps) {
  const { tone, shape } = look;
  const palette = COLORS[tone];
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const tag = useRef<HTMLDivElement>(null);
  const ndc = useMemo(() => new Vector3(), []);
  const focus = useMemo(() => new Vector3(), []);
  const root = useRef<Group>(null);
  const hub = useRef<Group>(null);
  const solid = useRef<MeshStandardMaterial>(null);
  const edgeMat = useRef<LineBasicMaterial>(null);
  const tetherMat = useRef<LineBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  const shock = useRef<Mesh>(null);
  const shockMat = useRef<MeshBasicMaterial>(null);
  const nodes = useRef<Array<Mesh | null>>([]);
  const tether = useRef<LineSegments>(null);
  const hover = useRef(0);
  const n = group.skills.length;

  const geo = useMemo(() => shapeGeometry(shape), [shape]);
  const edges = useMemo(() => new EdgesGeometry(geo, 1), [geo]);
  const aura = useMemo<ShaderMaterial>(() => createAura(palette.base, 2.3, 1.05), [palette]);
  const slots = useMemo(() => group.skills.map((_, i) => nodeSlot(i, n)), [group.skills, n]);
  const base = hubPosition(index, count);
  const nodeMaterial = useMemo(() => new MeshBasicMaterial({ color: palette.base, toneMapped: false }), [palette]);
  const nodeGeo = useMemo(() => new SphereGeometry(0.075, segments, segments), [segments]);
  const tetherPositions = useMemo(() => new Float32Array(n * 6), [n]);

  useEffect(
    () => () => {
      geo.dispose();
      edges.dispose();
      aura.dispose();
      nodeMaterial.dispose();
      nodeGeo.dispose();
      if (hover.current) window.clearTimeout(hover.current);
    },
    [geo, edges, aura, nodeMaterial, nodeGeo],
  );

  // A fresh activation fires the shockwave ring from the hub.
  useEffect(() => {
    if (active) state.pulse[index] = 0;
  }, [active, index, state]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const t = state.time;
    const act = (state.act[index] = damp(state.act[index], active ? 1 : 0, 3.1, dt));
    const e = smooth(act);
    state.pulse[index] += dt;

    const g = root.current;
    if (!g) return;
    g.position.set(base[0], base[1] + Math.sin(t * 0.6 + index * 1.7) * 0.07, base[2]);
    g.rotation.y = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z);
    state.hubWorld[index].copy(g.position);

    if (hub.current) {
      hub.current.rotation.y = t * (0.25 + e * 0.35) + index;
      hub.current.rotation.x = Math.sin(t * 0.4 + index) * 0.3;
      hub.current.scale.setScalar(HUB_R + (HUB_R_ACTIVE - HUB_R) * e);
    }
    if (solid.current) solid.current.emissiveIntensity = 0.12 + e * 0.42;
    if (edgeMat.current) edgeMat.current.color.copy(palette.hot).multiplyScalar(0.8 + e * 2.6);
    if (light.current) light.current.intensity = 1.2 + e * 14;

    nodeMaterial.color.copy(palette.base).multiplyScalar(0.5 + e * 1.1);
    if (tetherMat.current) tetherMat.current.opacity = 0.1 + e * 0.5;

    const rx = rxPx * unitsPerPx;
    const ry = ryPx * unitsPerPx;
    for (let i = 0; i < n; i++) {
      const mesh = nodes.current[i];
      if (!mesh) continue;
      const [ox, oy, oz] = orbitOffset(i, n, t, 0.78 + (1 - e) * 0.05);
      const s = slots[i];
      const bob = Math.sin(t * 0.9 + i * 1.3) * 0.045 * e;
      const x = ox + (s.x * rx - ox) * e;
      const y = oy + (s.y * ry - oy) * e + bob;
      const z = oz * (1 - e) + Math.sin(i * 2.3) * 0.12 * e;
      mesh.position.set(x, y, z);
      mesh.scale.setScalar(0.62 + e * 0.5);
      tetherPositions[i * 6 + 3] = x;
      tetherPositions[i * 6 + 4] = y;
      tetherPositions[i * 6 + 5] = z;
    }
    const tg = tether.current?.geometry;
    if (tg) tg.attributes.position.needsUpdate = true;

    // An inactive hub's name tag steps aside when its hub sits behind the open cluster or near the frame edge.
    if (tag.current) {
      ndc.copy(g.position).project(camera);
      focus.copy(state.look).project(camera);
      const dx = ((ndc.x - focus.x) * size.width) / 2;
      const dy = ((ndc.y - focus.y) * size.height) / 2;
      const hide = Math.hypot(dx, dy) < 230 || Math.abs(ndc.x) > 0.86 || Math.abs(ndc.y) > 0.88 || ndc.z > 1;
      tag.current.style.opacity = hide ? '0' : '1';
      tag.current.style.pointerEvents = hide ? 'none' : 'auto';
    }

    const k = state.pulse[index];
    if (shock.current && shockMat.current) {
      const p = Math.min(1, k / 1.1);
      shock.current.visible = p < 1;
      shock.current.scale.setScalar(0.7 + p * 3.6);
      shockMat.current.opacity = (1 - p) * (1 - p) * 0.7;
    }
  });

  const select = () => onSelect(index);
  const hoverIn = () => {
    if (active || hover.current) return;
    hover.current = window.setTimeout(() => {
      hover.current = 0;
      onSelect(index);
    }, 170);
  };
  const hoverOut = () => {
    if (hover.current) window.clearTimeout(hover.current);
    hover.current = 0;
  };

  return (
    <group ref={root}>
      <group ref={hub} onClick={select} onPointerOver={hoverIn} onPointerOut={hoverOut}>
        <mesh geometry={geo}>
          <meshStandardMaterial
            ref={solid}
            color={SOLID[tone]}
            emissive={palette.base}
            emissiveIntensity={0.2}
            metalness={0.55}
            roughness={0.32}
            flatShading
            transparent
            opacity={0.94}
          />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial ref={edgeMat} color={palette.hot} toneMapped={false} />
        </lineSegments>
        <mesh material={aura} scale={1.22}>
          <sphereGeometry args={[1.0, segments, segments]} />
        </mesh>
      </group>
      <pointLight ref={light} color={palette.base} distance={5} decay={2} position={[0, 0.3, 1.4]} />
      <mesh ref={shock}>
        <ringGeometry args={[0.86, 0.9, 72]} />
        <meshBasicMaterial ref={shockMat} color={palette.hot} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>

      <lineSegments ref={tether} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={n * 2} array={tetherPositions} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial ref={tetherMat} color={palette.base} transparent opacity={0.1} toneMapped={false} />
      </lineSegments>

      {group.skills.map((skill, i) => (
        <mesh
          key={skill}
          geometry={nodeGeo}
          material={nodeMaterial}
          ref={(m) => {
            nodes.current[i] = m;
          }}
        >
          {active ? (
            <Html zIndexRange={[12, 0]} style={{ pointerEvents: 'none' }}>
              <span
                className={`cc-skill cc-skill--${slots[i].side}`}
                data-tone={tone}
                style={{ '--d': `${300 + i * 55}ms` } as CSSProperties}
              >
                {skill}
              </span>
            </Html>
          ) : null}
        </mesh>
      ))}

      {active ? null : (
        <Html position={[0, -(HUB_R + 0.36), 0]} zIndexRange={[13, 0]}>
          <div ref={tag} className="cc-hubtag" data-tone={tone} onClick={select} onPointerEnter={hoverIn} onPointerLeave={hoverOut}>
            <span className="cc-hubtag__idx">{String(index + 1).padStart(2, '0')}</span>
            <span className="cc-hubtag__name">{group.name}</span>
            <span className="cc-hubtag__n">{n}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
