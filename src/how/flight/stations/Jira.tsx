import { useEffect, useMemo, useRef } from 'react';
import { BoxGeometry, Color, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3, type Mesh } from 'three';
import type { PipelineStage } from '../../../data/content.types';
import { COLORS, easeInOutCubic, easeOutCubic, range, rng } from '../common';
import { createGlassMaterial } from '../glass';
import { useStationFrame } from '../useStationFrame';
import { labelTexture, metricTexture, specTexture } from '../textures';

/**
 * Jira + Confluence: the real counts, drawn literally. 94 source stories stream in; 38 of them merge into others and
 * vanish; the remaining 56 settle into 10 epic columns (6,6,6,6,6,6,5,5,5,5) in front of the Confluence spec page.
 */
const CARD_W = 0.34;
const CARD_H = 0.17;
const COL_STEP = 0.41;
const ROW_STEP = 0.23;

interface Props {
  readonly stage: PipelineStage;
}

function num(stage: PipelineStage, i: number, fallback: number): number {
  const n = Number(stage.numbers[i]?.value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function Jira({ stage }: Props) {
  const source = num(stage, 0, 94);
  const ready = num(stage, 1, 56);
  const epics = num(stage, 2, 10);
  const ref = useRef<InstancedMesh>(null);
  const page = useRef<Mesh>(null);

  const data = useMemo(() => {
    const rand = rng(303);
    // Column sizes: as even as possible, the larger ones first.
    const sizes = Array.from({ length: epics }, (_, c) => Math.floor(ready / epics) + (c < ready % epics ? 1 : 0));
    const slots: Array<{ x: number; y: number; col: number }> = [];
    sizes.forEach((n, c) => {
      for (let r = 0; r < n; r += 1) {
        slots.push({ x: (c - (epics - 1) / 2) * COL_STEP, y: 0.62 - r * ROW_STEP, col: c });
      }
    });
    const cards: Array<{ start: Vector3; end: Vector3; merge: boolean; delay: number; col: number; spin: number }> = [];
    // Survivors first (one per slot), then the merged ones, each pointed at a random survivor.
    const order = Array.from({ length: source }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j]!, order[i]!];
    }
    order.forEach((_, k) => {
      const merge = k >= ready;
      const slot = merge ? slots[Math.floor(rand() * slots.length)]! : slots[k]!;
      const side = rand() < 0.5 ? -1 : 1;
      cards.push({
        start: new Vector3(side * (3 + rand() * 3.2), (rand() - 0.5) * 4.2, -1.5 + rand() * 3.6),
        end: new Vector3(slot.x + (merge ? (rand() - 0.5) * 0.05 : 0), slot.y, 0.06 + (merge ? 0.05 : 0)),
        merge,
        delay: rand() * 0.38,
        col: slot.col,
        spin: (rand() - 0.5) * 2.4,
      });
    });
    return { cards, sizes };
  }, [source, ready, epics]);

  const geo = useMemo(() => new BoxGeometry(CARD_W, CARD_H, 0.03), []);
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false, fog: true }), []);
  const pageMat = useMemo(() => createGlassMaterial({ width: 4.7, height: 2.5, radius: 0.1, map: specTexture(), glow: 0.9 }), []);
  const headers = useMemo(
    () =>
      Array.from({ length: epics }, (_, c) =>
        new MeshBasicMaterial({ map: labelTexture({ text: `E${String(c + 1).padStart(2, '0')}`, color: '#fbbf24', aspect: 3, plate: 'rgba(5,9,12,0.9)' }), transparent: true, depthTest: false, opacity: 0, toneMapped: false, fog: true }),
      ),
    [epics],
  );
  const bigMat = useMemo(
    () => new MeshBasicMaterial({ map: metricTexture(`${source} → ${ready}`, `source stories → Jira-ready`), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: true }),
    [source, ready],
  );
  const epicMat = useMemo(
    () => new MeshBasicMaterial({ map: metricTexture(String(epics), 'epics', '#fbbf24'), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: true }),
    [epics],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
      pageMat.dispose();
      headers.forEach((h) => h.dispose());
      bigMat.dispose();
      epicMat.dispose();
    },
    [geo, mat, pageMat, headers, bigMat, epicMat],
  );

  // Epic tints: a walk from cyan toward ice, so neighbouring columns read as distinct without leaving the palette.
  const tints = useMemo(
    () =>
      Array.from({ length: epics }, (_, c) => {
        const k = c / Math.max(1, epics - 1);
        return new Color().copy(COLORS.cyan).lerp(COLORS.cyanHi, k * 0.6).lerp(COLORS.white, (c % 2) * 0.18);
      }),
    [epics],
  );
  const gray = useMemo(() => new Color('#3b6a75'), []);

  const m4 = useMemo(() => new Matrix4(), []);
  const q = useMemo(() => new Quaternion(), []);
  const p = useMemo(() => new Vector3(), []);
  const sc = useMemo(() => new Vector3(), []);
  const col = useMemo(() => new Color(), []);
  const lastA = useRef(-1);

  useStationFrame(4, (a, _b, t) => {
    const m = ref.current;
    if (!m) return;
    if (Math.abs(a - lastA.current) > 0.0004 || (a > 0.98 && lastA.current < 1)) {
      lastA.current = a > 0.98 ? 1 : a;
      data.cards.forEach((c, i) => {
        const e = easeInOutCubic(range(a, c.delay * 0.8, c.delay * 0.8 + 0.5));
        const arch = Math.sin(Math.PI * e);
        p.lerpVectors(c.start, c.end, e);
        p.y += arch * 0.5;
        q.setFromAxisAngle(AXIS_Z, c.spin * (1 - e));
        // Merging cards shrink away in the last stretch of their flight (they have been folded into the card they land on).
        const fold = c.merge ? easeOutCubic(range(a, c.delay * 0.8 + 0.34, c.delay * 0.8 + 0.62)) : 0;
        sc.setScalar(Math.max(0.0001, Math.min(1, e * 6) * (0.55 + 0.45 * e) * (1 - fold)));
        m4.compose(p, q, sc);
        m.setMatrixAt(i, m4);
        if (c.merge) col.copy(gray).lerp(COLORS.amberHi, fold * 0.9).multiplyScalar(1.1 + fold);
        else col.copy(tints[c.col]!).multiplyScalar(0.45 + 0.25 * e);
        m.setColorAt(i, col);
      });
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    const pf = range(a, 0.1, 0.65);
    const u = pageMat.uniforms as Record<string, { value: number }>;
    u.uReveal!.value = pf;
    u.uTime!.value = t;
    if (page.current) page.current.position.z = -0.3 - (1 - pf) * 0.8;
    headers.forEach((h, c) => {
      h.opacity = range(a, 0.7 + c * 0.015, 0.85 + c * 0.015);
    });
    bigMat.opacity = range(a, 0.55, 0.95);
    epicMat.opacity = range(a, 0.75, 1);
  });

  return (
    <group position={[0, -0.12, 0]}>
      <mesh ref={page} material={pageMat} position={[0, 0.05, -0.3]}>
        <planeGeometry args={[4.7, 2.5]} />
      </mesh>
      <instancedMesh ref={ref} args={[geo, mat, data.cards.length]} frustumCulled={false} />
      {headers.map((h, c) => (
        <mesh key={c} material={h} position={[(c - (epics - 1) / 2) * COL_STEP, 0.92, 0.08]}>
          <planeGeometry args={[0.3, 0.1]} />
        </mesh>
      ))}
      <mesh material={bigMat} position={[-1.1, 1.78, 0.1]}>
        <planeGeometry args={[1.9, 0.95]} />
      </mesh>
      <mesh material={epicMat} position={[1.5, 1.78, 0.1]}>
        <planeGeometry args={[1.3, 0.65]} />
      </mesh>
    </group>
  );
}

const AXIS_Z = new Vector3(0, 0, 1);
