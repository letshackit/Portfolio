import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Color,
  InstancedMesh,
  Object3D,
  ShaderMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { hstore, smoothstep } from '../historyStore';
import type { TimelineModel } from '../timelineModel';
import { focusBack, monthsBack, pathPoint, pathTangent, SpineCurve } from './path';

const VERT = /* glsl */ `
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

/**
 * One stretch of the spine. `g` is the position in months back. Where g is below the camera's focus the visitor has
 * already travelled: amber, the colour of work happening. Ahead of it the path is cyan structure, with pulses of data
 * flowing from the past toward the present.
 */
const FRAG = /* glsl */ `
uniform vec2 uSpan;
uniform float uFocus;
uniform float uTime;
uniform float uIntensity;
uniform float uTravel;
uniform vec3 uBase;
uniform vec3 uHot;
varying vec2 vUv;
varying float vDepth;
void main() {
  float g = mix(uSpan.x, uSpan.y, vUv.x);
  float trav = (1.0 - smoothstep(uFocus - 0.3, uFocus + 0.3, g)) * uTravel;
  float p = pow(0.5 + 0.5 * sin(g * 5.6 + uTime * 2.4), 7.0);
  float rim = 0.55 + 0.45 * sin(vUv.y * 6.2831 * 2.0 + 1.0);
  vec3 col = mix(uBase, uHot, trav * 0.92) * (0.62 + p * 1.7) * (0.8 + rim * 0.4) * uIntensity;
  float fade = 1.0 - smoothstep(12.0, 32.0, vDepth);
  gl_FragColor = vec4(col * fade, 1.0);
}`;

const CYAN = new Color('#22d3ee');
const AMBER = new Color('#f59e0b');
const AMBER_HOT = new Color('#fbbf24');

function spineMaterial(from: number, to: number, base: Color, hot: Color, intensity: number, travel: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uSpan: { value: new Vector2(from, to) },
      uFocus: { value: 0 },
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uTravel: { value: travel },
      uBase: { value: base.clone() },
      uHot: { value: hot.clone() },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
}

function tube(from: number, to: number, radius: number): TubeGeometry {
  const segments = Math.max(12, Math.ceil(Math.abs(to - from) * 5));
  return new TubeGeometry(new SpineCurve(from, to), segments, radius, 8, false);
}

interface Part {
  readonly geometry: TubeGeometry;
  readonly material: ShaderMaterial;
  /** Index of the station this stretch belongs to, or -1 for the bare path. */
  readonly station: number;
  readonly kind: 'base' | 'employed' | 'promotion';
}

/**
 * The path through time. A hair-thin line runs the whole way (the gaps between jobs stay on the map); each stretch of
 * employment is a thick luminous cable; each promotion window sits over its cable as an amber sleeve, so the nine months
 * are literally the brightest part of the route.
 */
export function Spine({ model, reduced }: { model: TimelineModel; reduced: boolean }) {
  const parts = useMemo<Part[]>(() => {
    const out: Part[] = [];
    const far = monthsBack(model, model.min) + 8;
    out.push({
      geometry: tube(-1.2, far, 0.014),
      material: spineMaterial(-1.2, far, CYAN, AMBER, 0.55, 1),
      station: -1,
      kind: 'base',
    });
    model.stations.forEach((s, i) => {
      const a = monthsBack(model, s.end);
      const b = monthsBack(model, s.start);
      out.push({ geometry: tube(a, b, 0.05), material: spineMaterial(a, b, CYAN, AMBER, 1.25, 1), station: i, kind: 'employed' });
      if (s.promotion) {
        const pa = monthsBack(model, s.promotion.at);
        const pb = monthsBack(model, s.promotion.from);
        out.push({
          geometry: tube(pa, pb, 0.085),
          material: spineMaterial(pa, pb, AMBER, AMBER_HOT, 1, 0),
          station: i,
          kind: 'promotion',
        });
      }
    });
    return out;
  }, [model]);

  useEffect(
    () => () => {
      for (const p of parts) {
        p.geometry.dispose();
        p.material.dispose();
      }
    },
    [parts],
  );

  useFrame(() => {
    const focus = focusBack(model, hstore.fs);
    for (const p of parts) {
      const u = p.material.uniforms;
      if (!u) continue;
      (u.uFocus as { value: number }).value = reduced ? -99 : focus;
      (u.uTime as { value: number }).value = reduced ? 0 : hstore.time;
      if (p.kind === 'promotion') {
        const a = reduced ? 1 : smoothstep(1.1, 0.2, Math.abs(hstore.fs - p.station));
        (u.uIntensity as { value: number }).value = 0.55 + 1.35 * a;
      } else if (p.kind === 'employed') {
        const a = reduced ? 1 : smoothstep(1.2, 0.1, Math.abs(hstore.fs - p.station));
        (u.uIntensity as { value: number }).value = 0.95 + 0.7 * a;
      }
    }
  });

  return (
    <group>
      {parts.map((p, i) => (
        <mesh key={i} geometry={p.geometry} material={p.material} frustumCulled={false} />
      ))}
    </group>
  );
}

/** A notch on the spine for every month, and a larger ring (labelled in the scene) for every January. */
export function MonthTicks({ model }: { model: TimelineModel }) {
  const months = useRef<InstancedMesh>(null);
  const years = useRef<InstancedMesh>(null);
  const monthGeo = useMemo(() => new TorusGeometry(0.13, 0.0055, 5, 20), []);
  const yearGeo = useMemo(() => new TorusGeometry(0.22, 0.01, 6, 36), []);

  useLayoutEffect(() => {
    const dummy = new Object3D();
    const p = new Vector3();
    const t = new Vector3();
    const place = (mesh: InstancedMesh | null, backs: readonly number[]) => {
      if (!mesh) return;
      backs.forEach((b, i) => {
        pathPoint(b, p);
        pathTangent(b, t);
        dummy.position.copy(p);
        dummy.lookAt(p.clone().add(t));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.count = backs.length;
      mesh.instanceMatrix.needsUpdate = true;
    };
    const monthBacks: number[] = [];
    const first = Math.ceil(model.min);
    for (let m = first; m <= Math.floor(model.max); m += 1) {
      if (m % 12 !== 0) monthBacks.push(monthsBack(model, m));
    }
    place(months.current, monthBacks);
    place(years.current, model.years.map((y) => monthsBack(model, y.at)));
  }, [model]);

  useEffect(
    () => () => {
      monthGeo.dispose();
      yearGeo.dispose();
    },
    [monthGeo, yearGeo],
  );

  const count = Math.ceil(model.span) + 2;
  return (
    <group>
      <instancedMesh ref={months} args={[monthGeo, undefined, count]} frustumCulled={false}>
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} toneMapped={false} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={years} args={[yearGeo, undefined, Math.max(1, model.years.length)]} frustumCulled={false}>
        <meshBasicMaterial color={[0.25, 1.15, 1.35]} transparent opacity={0.6} toneMapped={false} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
