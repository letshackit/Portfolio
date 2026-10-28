import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  OctahedronGeometry,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import type { PipelineStage } from '../../../data/content.types';
import { COLORS, easeInOutCubic, range, rng } from '../common';
import type { Quality } from '../quality';
import { useStationFrame } from '../useStationFrame';
import { labelTexture, metricTexture, softTexture } from '../textures';

/**
 * Research: scattered data points converge into a cluster, and the vendors named in the artifact land around it.
 * The vendor names are the real ones from the stage text; amber tags are the benchmarks it was measured against.
 */
const VENDORS = ['Keka', 'greytHR', 'ZingHR', 'Zoho', 'Rippling', 'HiBob', 'BambooHR', 'Deel'] as const;
const BENCHMARKS = ['Workday', 'Darwinbox', 'Incumbent HRIS'] as const;

const SLOTS: ReadonlyArray<readonly [number, number]> = [
  [-2.05, 1.3],
  [2.05, 1.3],
  [-2.2, 0.72],
  [2.2, 0.72],
  [-2.2, 0.14],
  [2.2, 0.14],
  [-2.05, -0.44],
  [2.05, -0.44],
  [-1.7, -1.02],
  [0, -1.28],
  [1.7, -1.02],
];

interface Props {
  readonly stage: PipelineStage;
  readonly quality: Quality;
}

export function Research({ stage, quality }: Props) {
  const count = Math.max(70, Math.round(250 * quality.density));
  const mesh = useRef<InstancedMesh>(null);
  const cluster = useRef<Group>(null);
  const lines = useRef<LineSegments>(null);
  const glow = useRef<Mesh>(null);
  const leaders = useRef<LineSegments>(null);

  const data = useMemo(() => {
    const rand = rng(101);
    const start = new Float32Array(count * 3);
    const end = new Float32Array(count * 3);
    const curl = new Float32Array(count * 3);
    const delay = new Float32Array(count);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i += 1) {
      // Scattered shell (wide, flat) -> fuzzy ball.
      const th = rand() * Math.PI * 2;
      const rad = 2.4 + rand() * 4.6;
      start.set([Math.cos(th) * rad, (rand() - 0.5) * 4.2, Math.sin(th) * rad * 0.7 - 0.4], i * 3);
      const y = 1 - (i / (count - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const ph = golden * i;
      const k = 0.32 + 0.68 * Math.cbrt(rand());
      end.set([Math.cos(ph) * rr * k * 1.05, y * k * 1.05 + 0.1, Math.sin(ph) * rr * k * 1.05], i * 3);
      curl.set([(rand() - 0.5) * 1.6, (rand() - 0.5) * 1.6, (rand() - 0.5) * 1.6], i * 3);
      delay[i] = rand() * 0.42;
    }
    // Links between near neighbours in the final cluster.
    const pairs: number[] = [];
    const maxPairs = Math.round(110 * quality.density);
    for (let i = 0; i < count && pairs.length / 2 < maxPairs; i += 1) {
      let best = -1;
      let bd = 0.32;
      for (let j = i + 1; j < count; j += 1) {
        const dx = end[i * 3]! - end[j * 3]!;
        const dy = end[i * 3 + 1]! - end[j * 3 + 1]!;
        const dz = end[i * 3 + 2]! - end[j * 3 + 2]!;
        const d = Math.hypot(dx, dy, dz);
        if (d < bd && d > 0.05) {
          bd = d;
          best = j;
        }
      }
      if (best >= 0) pairs.push(i, best);
    }
    return { start, end, curl, delay, pairs };
  }, [count, quality.density]);

  const geo = useMemo(() => new OctahedronGeometry(0.048, 0), []);
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false, fog: true }), []);
  const lineGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(data.pairs.length * 3), 3));
    return g;
  }, [data.pairs.length]);
  const lineMat = useMemo(
    () => new LineBasicMaterial({ color: COLORS.cyanHi.clone().multiplyScalar(1.2), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    [],
  );
  const glowMat = useMemo(
    () => new MeshBasicMaterial({ map: softTexture(), color: COLORS.cyanHi.clone().multiplyScalar(0.7), transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false, opacity: 0 }),
    [],
  );

  // Vendor tags: each flies in from a scattered start to its slot.
  const tags = useMemo(() => {
    const rand = rng(7);
    const names = [...VENDORS.map((n) => ({ n, bench: false })), ...BENCHMARKS.map((n) => ({ n, bench: true }))];
    return names.map((t, i) => {
      const slot = SLOTS[i] ?? [0, 0];
      return {
        ...t,
        tex: labelTexture({
          text: t.n,
          color: t.bench ? '#fbbf24' : '#67e8f9',
          plate: 'rgba(7,12,16,0.7)',
          edge: t.bench ? 'rgba(245,158,11,0.7)' : 'rgba(34,211,238,0.5)',
        }),
        end: new Vector3(slot[0], slot[1], 0.3),
        start: new Vector3((rand() - 0.5) * 9, (rand() - 0.5) * 5, -2 + rand() * 5),
        delay: 0.18 + i * 0.04,
      };
    });
  }, []);
  const tagMeshes = useRef<Array<Mesh | null>>([]);
  const tagMats = useMemo(
    () => tags.map((t) => new MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, toneMapped: false, fog: true, side: DoubleSide })),
    [tags],
  );
  const leaderGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(tags.length * 6), 3));
    return g;
  }, [tags.length]);
  const leaderMat = useMemo(
    () => new LineBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(0.9), transparent: true, opacity: 0, depthWrite: false, fog: true }),
    [],
  );

  const metric = stage.numbers[0];
  const metricMat = useMemo(
    () => (metric ? new MeshBasicMaterial({ map: metricTexture(metric.value, metric.label), transparent: true, depthWrite: false, toneMapped: false, fog: true, opacity: 0 }) : null),
    [metric],
  );

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      glowMat.dispose();
      leaderGeo.dispose();
      leaderMat.dispose();
      tagMats.forEach((m) => m.dispose());
      metricMat?.dispose();
    },
    [geo, mat, lineGeo, lineMat, glowMat, leaderGeo, leaderMat, tagMats, metricMat],
  );

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const c = new Color();
    for (let i = 0; i < count; i += 1) {
      const r = i % 13 === 0 ? COLORS.amberHi.clone().multiplyScalar(2.2) : i % 5 === 0 ? COLORS.white.clone().multiplyScalar(1.6) : COLORS.cyanHi.clone().multiplyScalar(1.7);
      m.setColorAt(i, c.copy(r));
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [count]);

  const cur = useMemo(() => new Float32Array(count * 3), [count]);
  const m4 = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const p = useMemo(() => new Vector3(), []);
  const sc = useMemo(() => new Vector3(), []);
  const lastA = useRef(-1);

  useStationFrame(0, (a, _b, t) => {
    const m = mesh.current;
    if (!m) return;
    if (cluster.current) cluster.current.rotation.y = t * 0.16 * easeInOutCubic(range(a, 0.6, 1));
    if (Math.abs(a - lastA.current) > 0.0004 || a > 0.98) {
      lastA.current = a;
      for (let i = 0; i < count; i += 1) {
        const e = easeInOutCubic(range(a, data.delay[i]! * 0.7, data.delay[i]! * 0.7 + 0.5));
        const arch = Math.sin(Math.PI * e);
        for (let k = 0; k < 3; k += 1) {
          cur[i * 3 + k] = data.start[i * 3 + k]! + (data.end[i * 3 + k]! - data.start[i * 3 + k]!) * e + data.curl[i * 3 + k]! * arch;
        }
        p.set(cur[i * 3]!, cur[i * 3 + 1]!, cur[i * 3 + 2]!);
        sc.setScalar(0.35 + 0.65 * e + 0.35 * arch);
        m4.compose(p, q, sc);
        m.setMatrixAt(i, m4);
      }
      m.instanceMatrix.needsUpdate = true;
      const lp = lineGeo.getAttribute('position') as BufferAttribute;
      for (let k = 0; k < data.pairs.length; k += 1) {
        const idx = data.pairs[k]!;
        lp.setXYZ(k, cur[idx * 3]!, cur[idx * 3 + 1]!, cur[idx * 3 + 2]!);
      }
      lp.needsUpdate = true;
    }
    lineMat.opacity = Math.pow(range(a, 0.55, 1), 2) * 0.55;
    glowMat.opacity = range(a, 0.35, 0.95) * (0.75 + 0.25 * Math.sin(t * 2));
    if (glow.current) glow.current.scale.setScalar(0.4 + 2.6 * easeInOutCubic(range(a, 0.3, 1)));
    const la = leaderGeo.getAttribute('position') as BufferAttribute;
    tags.forEach((tg, i) => {
      const e = easeInOutCubic(range(a, tg.delay, tg.delay + 0.5));
      const mm = tagMeshes.current[i];
      if (mm) {
        mm.position.lerpVectors(tg.start, tg.end, e);
        mm.visible = e > 0.001;
      }
      tagMats[i]!.opacity = Math.min(1, e * 1.4);
      la.setXYZ(i * 2, tg.end.x * 0.8, tg.end.y * 0.8, tg.end.z);
      la.setXYZ(i * 2 + 1, tg.end.x * 0.3, tg.end.y * 0.3 + 0.1, 0.1);
    });
    la.needsUpdate = true;
    leaderMat.opacity = Math.pow(range(a, 0.7, 1), 2) * 0.35;
    if (metricMat) metricMat.opacity = range(a, 0.6, 0.95);
  });

  return (
    <group>
      <mesh ref={glow} material={glowMat} position={[0, 0.1, -0.2]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group ref={cluster} position={[0, 0.1, 0]}>
        <instancedMesh ref={mesh} args={[geo, mat, count]} frustumCulled={false} />
        <lineSegments ref={lines} geometry={lineGeo} material={lineMat} frustumCulled={false} />
      </group>
      <lineSegments ref={leaders} geometry={leaderGeo} material={leaderMat} frustumCulled={false} />
      {tags.map((t, i) => (
        <mesh
          key={t.n}
          ref={(el) => {
            tagMeshes.current[i] = el;
          }}
          material={tagMats[i]}
          visible={false}
        >
          <planeGeometry args={[t.bench ? 1.5 : 1.06, t.bench ? 0.19 : 0.135]} />
        </mesh>
      ))}
      {metricMat ? (
        <mesh material={metricMat} position={[0, 1.7, 0.1]}>
          <planeGeometry args={[1.5, 0.75]} />
        </mesh>
      ) : null}
    </group>
  );
}
