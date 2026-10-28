import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  EdgesGeometry,
  Euler,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
  type Mesh,
} from 'three';
import type { PipelineStage } from '../../../data/content.types';
import { COLORS, easeOutCubic, range, rng } from '../common';
import { useStationFrame } from '../useStationFrame';
import { coverTexture, metricTexture } from '../textures';

/**
 * PRD: translucent-looking sheets fly in and stack into thick documents. The page counts are the real ones
 * (116 for TravelDesk, 461 for HRMS) and both stacks use the same sheet thickness, so the ratio between them is true.
 */
const PAGE_W = 1.3;
const PAGE_H = 1.84;
const THICK = 0.0062;

interface StackSpec {
  readonly pages: number;
  readonly x: number;
  readonly title: string;
  readonly sub: string;
  readonly seed: number;
}

interface Props {
  readonly stage: PipelineStage;
}

function pagesOf(stage: PipelineStage, i: number, fallback: number): number {
  const n = Number(stage.numbers[i]?.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function Stack({ spec, index, labelFigure, labelCaption }: { spec: StackSpec; index: number; labelFigure: string; labelCaption: string }) {
  const ref = useRef<InstancedMesh>(null);
  const edges = useRef<LineSegments>(null);
  const cover = useRef<Mesh>(null);
  const n = spec.pages;
  const depth = n * THICK;
  const front = 0.25;

  const data = useMemo(() => {
    const rand = rng(spec.seed);
    const start = new Float32Array(n * 3);
    const rot = new Float32Array(n * 3);
    const delay = new Float32Array(n);
    for (let k = 0; k < n; k += 1) {
      start.set([(rand() - 0.5) * 11 - spec.x * 0.3, (rand() - 0.5) * 6.5, (rand() - 0.5) * 7 - 0.5], k * 3);
      rot.set([(rand() - 0.5) * 2.6, (rand() - 0.5) * 3.2, (rand() - 0.5) * 2.6], k * 3);
      delay[k] = (k / n) * 0.52;
    }
    return { start, rot, delay };
  }, [n, spec.seed, spec.x]);

  const geo = useMemo(() => new BoxGeometry(PAGE_W, PAGE_H, THICK * 0.82), []);
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false, fog: true }), []);
  const edgeGeo = useMemo(() => new EdgesGeometry(new BoxGeometry(PAGE_W, PAGE_H, depth)), [depth]);
  const edgeMat = useMemo(
    () => new LineBasicMaterial({ color: COLORS.cyanHi.clone().multiplyScalar(1.5), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    [],
  );
  const coverMat = useMemo(
    () => new MeshBasicMaterial({ map: coverTexture(spec.title, spec.sub, `${n} pp`), transparent: true, opacity: 0, toneMapped: false, fog: true }),
    [spec.title, spec.sub, n],
  );
  const labelMat = useMemo(
    () => new MeshBasicMaterial({ map: metricTexture(labelFigure, labelCaption), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: true }),
    [labelFigure, labelCaption],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      edgeGeo.dispose();
      edgeMat.dispose();
      coverMat.dispose();
      labelMat.dispose();
    },
    [geo, mat, edgeGeo, edgeMat, coverMat, labelMat],
  );

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new Color();
    const a = new Color('#1f5766');
    const b = new Color('#2a7385');
    for (let k = 0; k < n; k += 1) m.setColorAt(k, c.copy(k % 2 ? a : b).multiplyScalar(k % 10 === 0 ? 2.1 : 1.15));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [n]);

  const m4 = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const eu = useMemo(() => new Euler(), []);
  const p = useMemo(() => new Vector3(), []);
  const sc = useMemo(() => new Vector3(), []);
  const lastA = useRef(-1);

  useStationFrame(1, (a, _b, t) => {
    const m = ref.current;
    if (!m) return;
    if (Math.abs(a - lastA.current) > 0.0004 || (a > 0.98 && lastA.current < 1)) {
      lastA.current = a > 0.98 ? 1 : a;
      for (let k = 0; k < n; k += 1) {
        const e = easeOutCubic(range(a, data.delay[k]!, data.delay[k]! + 0.46));
        const ex = spec.x;
        const ey = 0;
        const ez = front - (n - 1 - k) * THICK;
        const lift = Math.sin(Math.PI * e) * 0.35;
        p.set(data.start[k * 3]! + (ex - data.start[k * 3]!) * e, data.start[k * 3 + 1]! + (ey - data.start[k * 3 + 1]!) * e + lift, data.start[k * 3 + 2]! + (ez - data.start[k * 3 + 2]!) * e);
        eu.set(data.rot[k * 3]! * (1 - e), data.rot[k * 3 + 1]! * (1 - e), data.rot[k * 3 + 2]! * (1 - e));
        q.setFromEuler(eu);
        sc.setScalar(Math.min(1, e * 8));
        m4.compose(p, q, sc);
        m.setMatrixAt(k, m4);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    const done = range(a, 0.86, 1);
    edgeMat.opacity = done * (0.7 + 0.3 * Math.sin(t * 2.4 + index));
    coverMat.opacity = done;
    labelMat.opacity = range(a, 0.7, 1);
  });

  return (
    <group>
      <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />
      <lineSegments ref={edges} geometry={edgeGeo} material={edgeMat} position={[spec.x, 0, front - depth / 2 + THICK / 2]} frustumCulled={false} />
      <mesh ref={cover} material={coverMat} position={[spec.x, 0, front + THICK * 0.5 + 0.004]}>
        <planeGeometry args={[PAGE_W * 0.99, PAGE_H * 0.99]} />
      </mesh>
      <mesh material={labelMat} position={[spec.x, PAGE_H / 2 + 0.52, front + 0.05]}>
        <planeGeometry args={[1.36, 0.68]} />
      </mesh>
    </group>
  );
}

export function Prd({ stage }: Props) {
  const stacks = useMemo<StackSpec[]>(
    () => [
      { pages: pagesOf(stage, 0, 116), x: -1.15, title: 'TravelDesk', sub: 'master PRD', seed: 5 },
      { pages: pagesOf(stage, 1, 461), x: 1.2, title: 'HRMS', sub: `${pagesOf(stage, 2, 13)} modules`, seed: 9 },
    ],
    [stage],
  );
  const labels = [
    { fig: stage.numbers[0]?.value ?? '116', cap: 'pages · TravelDesk' },
    { fig: stage.numbers[1]?.value ?? '461', cap: 'pages · HRMS' },
  ];
  return (
    <group rotation={[0, 0.34, 0]} position={[0, -0.1, 0]}>
      {stacks.map((s, i) => (
        <Stack key={s.title} spec={s} index={i} labelFigure={labels[i]!.fig} labelCaption={labels[i]!.cap} />
      ))}
    </group>
  );
}
