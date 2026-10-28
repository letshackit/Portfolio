import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  MeshBasicMaterial,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import { COLORS, easeOutBack, range, rng } from '../common';
import { createGlassMaterial, type GlassMaterial } from '../glass';
import { useStationFrame } from '../useStationFrame';
import { screenTexture, tagTexture, type ScreenKind } from '../textures';

/**
 * UX: wireframe screens fly in from all directions and snap into a flow, joined by drawn-on connectors, with the
 * design-system swatches and the configuration switches laid out underneath.
 */
interface PanelSpec {
  readonly kind: ScreenKind;
  readonly w: number;
  readonly h: number;
  readonly pos: readonly [number, number, number];
  readonly yaw: number;
}

const PANELS: readonly PanelSpec[] = [
  { kind: 'dash', w: 1.5, h: 1.0, pos: [-1.65, 0.75, 0.05], yaw: 0.1 },
  { kind: 'approval', w: 1.5, h: 1.0, pos: [0.02, 0.8, -0.12], yaw: 0 },
  { kind: 'list', w: 1.5, h: 1.0, pos: [1.69, 0.72, 0.08], yaw: -0.1 },
  { kind: 'form', w: 1.5, h: 1.0, pos: [-1.65, -0.5, -0.1], yaw: 0.1 },
  { kind: 'settings', w: 1.5, h: 1.0, pos: [0.02, -0.44, 0.1], yaw: 0 },
  { kind: 'mobile', w: 0.6, h: 1.05, pos: [1.52, -0.47, -0.05], yaw: -0.1 },
];

/** Connectors between panels, as pairs of panel indices. */
const LINKS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 2],
  [3, 4],
  [4, 5],
  [0, 3],
  [1, 4],
  [2, 5],
];

const SWATCHES = ['#191c20', '#22262b', '#2c3137', '#8a929c', '#0891b2', '#22d3ee', '#d97706', '#fbbf24'];

function Panel({ spec, i }: { spec: PanelSpec; i: number }) {
  const ref = useRef<Mesh>(null);
  const tex = useMemo(() => screenTexture(spec.kind), [spec.kind]);
  const mat = useMemo<GlassMaterial>(
    () => createGlassMaterial({ width: spec.w, height: spec.h, radius: 0.07, map: tex, tint: i === 1 || i === 4 ? COLORS.cyanHi : COLORS.cyan }),
    [spec.w, spec.h, tex, i],
  );
  const start = useMemo(() => {
    const r = rng(40 + i * 3);
    return {
      pos: new Vector3((r() - 0.5) * 11, (r() - 0.5) * 6, -3 + r() * 5),
      rot: [(r() - 0.5) * 2.2, (r() - 0.5) * 2.6, (r() - 0.5) * 1.6] as const,
    };
  }, [i]);
  useEffect(() => () => mat.dispose(), [mat]);

  useStationFrame(2, (a, _b, t) => {
    const m = ref.current;
    if (!m) return;
    const d = i * 0.07;
    const e = easeOutBack(range(a, d, d + 0.5), 1.4);
    m.position.set(
      start.pos.x + (spec.pos[0] - start.pos.x) * e,
      start.pos.y + (spec.pos[1] - start.pos.y) * e,
      start.pos.z + (spec.pos[2] - start.pos.z) * e,
    );
    const k = 1 - e;
    m.rotation.set(start.rot[0] * k, start.rot[1] * k + spec.yaw * e, start.rot[2] * k);
    m.visible = a > d;
    const u = mat.uniforms as Record<string, { value: number }>;
    u.uReveal!.value = range(a, d + 0.08, d + 0.7);
    u.uTime!.value = t;
  });

  return (
    <mesh ref={ref} material={mat} visible={false}>
      <planeGeometry args={[spec.w, spec.h]} />
    </mesh>
  );
}

function Connectors() {
  const geo = useMemo(() => {
    const g = new BufferGeometry();
    const pts: number[] = [];
    for (const [a, b] of LINKS) {
      const pa = PANELS[a]!;
      const pb = PANELS[b]!;
      const horizontal = Math.abs(pa.pos[1] - pb.pos[1]) < 0.2;
      if (horizontal) {
        pts.push(pa.pos[0] + pa.w / 2, pa.pos[1], pa.pos[2], pb.pos[0] - pb.w / 2, pb.pos[1], pb.pos[2]);
      } else {
        pts.push(pa.pos[0], pa.pos[1] - pa.h / 2, pa.pos[2], pb.pos[0], pb.pos[1] + pb.h / 2, pb.pos[2]);
      }
    }
    g.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    return g;
  }, []);
  const mat = useMemo(
    () => new LineBasicMaterial({ color: COLORS.amberHi.clone().multiplyScalar(1.4), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useStationFrame(2, (a, _b, t) => {
    const e = range(a, 0.62, 0.98);
    geo.setDrawRange(0, Math.floor(e * LINKS.length * 2));
    mat.opacity = e * (0.65 + 0.35 * Math.sin(t * 3));
  });
  return <lineSegments geometry={geo} material={mat} frustumCulled={false} />;
}

function Swatches() {
  const group = useRef<Group>(null);
  const mats = useMemo(() => SWATCHES.map((c) => new MeshBasicMaterial({ color: new Color(c).multiplyScalar(c === '#22d3ee' || c === '#fbbf24' ? 1.6 : 1), transparent: true, opacity: 0, toneMapped: false, fog: true })), []);
  const tagA = useMemo(() => new MeshBasicMaterial({ map: tagTexture('OBSIDIAN COMMAND · DESIGN SYSTEM', 'cyan', 16), transparent: true, opacity: 0, toneMapped: false, fog: true }), []);
  const tagB = useMemo(() => new MeshBasicMaterial({ map: tagTexture('CONFIGURATION ENGINE', 'amber', 10), transparent: true, opacity: 0, toneMapped: false, fog: true }), []);
  const knobs = useRef<Array<Mesh | null>>([]);
  const trackMat = useMemo(() => new MeshBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(0.5), transparent: true, opacity: 0, toneMapped: false, fog: true }), []);
  const knobMat = useMemo(() => new MeshBasicMaterial({ color: COLORS.amberHi.clone().multiplyScalar(2), transparent: true, opacity: 0, toneMapped: false, fog: true }), []);
  useEffect(
    () => () => {
      mats.forEach((m) => m.dispose());
      tagA.dispose();
      tagB.dispose();
      trackMat.dispose();
      knobMat.dispose();
    },
    [mats, tagA, tagB, trackMat, knobMat],
  );
  useStationFrame(2, (a, _b, t) => {
    const e = range(a, 0.7, 1);
    mats.forEach((m, i) => {
      m.opacity = range(a, 0.68 + i * 0.02, 0.9 + i * 0.01);
    });
    tagA.opacity = e;
    tagB.opacity = e;
    trackMat.opacity = e;
    knobMat.opacity = e;
    knobs.current.forEach((k, i) => {
      if (k) k.position.x = Math.sin(t * 1.1 + i * 2.1) * 0.15;
    });
    if (group.current) group.current.position.y = -1.42 - (1 - e) * 0.2;
  });
  return (
    <group ref={group} position={[0, -1.42, 0.1]}>
      <mesh material={tagA} position={[-1.05, 0.24, 0]}>
        <planeGeometry args={[1.9, 0.12]} />
      </mesh>
      {SWATCHES.map((c, i) => (
        <mesh key={c} material={mats[i]} position={[-1.88 + i * 0.26, 0, 0]}>
          <planeGeometry args={[0.21, 0.21]} />
        </mesh>
      ))}
      <mesh material={tagB} position={[1.35, 0.24, 0]}>
        <planeGeometry args={[1.2, 0.12]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} position={[0.95 + i * 0.52, 0, 0]}>
          <mesh material={trackMat}>
            <planeGeometry args={[0.4, 0.07]} />
          </mesh>
          <mesh
            material={knobMat}
            ref={(el) => {
              knobs.current[i] = el;
            }}
          >
            <circleGeometry args={[0.055, 16]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Ux() {
  return (
    <group position={[0, 0.2, 0]}>
      {PANELS.map((spec, i) => (
        <Panel key={spec.kind} spec={spec} i={i} />
      ))}
      <Connectors />
      <Swatches />
    </group>
  );
}
