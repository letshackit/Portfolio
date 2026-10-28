import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, MeshBasicMaterial, type Group, type Mesh } from 'three';
import type { PipelineStage } from '../../../data/content.types';
import { COLORS, easeOutBack, easeOutCubic, range } from '../common';
import { createGlassMaterial } from '../glass';
import { useStationFrame } from '../useStationFrame';
import { metricTexture, tagTexture, tileTexture, windowTexture } from '../textures';

/**
 * Prototype: a glass app window materialises with a scan-line sweep, then its eight modules light up one by one,
 * floating just in front of the glass so the parallax shows the depth. The module names are the Cloud Commerce ones.
 */
const MODULES = ['Dashboard', 'Orders', 'Products', 'Channels', 'Logs', 'Promotion', 'Payment Gateway', 'Settings'] as const;
const WIN_W = 3.6;
const WIN_H = 2.25;
const TILE = 0.76;

interface Props {
  readonly stage: PipelineStage;
}

function frameGeometry(w: number, h: number): BufferGeometry {
  const g = new BufferGeometry();
  const x = w / 2;
  const y = h / 2;
  g.setAttribute('position', new Float32BufferAttribute([-x, -y, 0, x, -y, 0, x, -y, 0, x, y, 0, x, y, 0, -x, y, 0, -x, y, 0, -x, -y, 0], 3));
  return g;
}

export function Prototype({ stage }: Props) {
  const win = useRef<Mesh>(null);
  const tiles = useRef<Array<Mesh | null>>([]);
  const ghost1 = useRef<Group>(null);
  const ghost2 = useRef<Group>(null);

  const winTex = useMemo(() => windowTexture('cloud-commerce  /  node.js prototype'), []);
  const winMat = useMemo(() => createGlassMaterial({ width: WIN_W, height: WIN_H, radius: 0.1, map: winTex, glow: 1.2 }), [winTex]);
  const tileMats = useMemo(
    () => MODULES.map((name, i) => new MeshBasicMaterial({ map: tileTexture(i + 1, name), transparent: true, opacity: 0, toneMapped: false, fog: true })),
    [],
  );
  const frameGeo = useMemo(() => frameGeometry(WIN_W, WIN_H), []);
  const frameMat = useMemo(
    () => new LineBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(1.2), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    [],
  );
  const months = Number(stage.numbers[1]?.value) || 3;
  const monthMats = useMemo(
    () => Array.from({ length: months }, () => new MeshBasicMaterial({ color: COLORS.amberHi.clone().multiplyScalar(1.7), transparent: true, opacity: 0, toneMapped: false, fog: true })),
    [months],
  );
  const monthTrack = useMemo(() => new MeshBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(0.35), transparent: true, opacity: 0, toneMapped: false, fog: true }), []);
  const tag = useMemo(() => new MeshBasicMaterial({ map: tagTexture('BUILT IN CURSOR · NODE.JS', 'amber', 12), transparent: true, depthTest: false, depthWrite: false, opacity: 0, toneMapped: false, fog: true }), []);
  const big = stage.numbers[0];
  const bigMat = useMemo(
    () => (big ? new MeshBasicMaterial({ map: metricTexture(big.value, big.label), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: true }) : null),
    [big],
  );
  const monthLabel = stage.numbers[1];
  const monthLabelMat = useMemo(
    () => (monthLabel ? new MeshBasicMaterial({ map: tagTexture(`${monthLabel.value} ${monthLabel.label.toUpperCase()}`, 'cyan', 12), transparent: true, depthTest: false, depthWrite: false, opacity: 0, toneMapped: false, fog: true }) : null),
    [monthLabel],
  );

  useEffect(
    () => () => {
      winMat.dispose();
      tileMats.forEach((m) => m.dispose());
      frameGeo.dispose();
      frameMat.dispose();
      monthMats.forEach((m) => m.dispose());
      monthTrack.dispose();
      tag.dispose();
      bigMat?.dispose();
      monthLabelMat?.dispose();
    },
    [winMat, tileMats, frameGeo, frameMat, monthMats, monthTrack, tag, bigMat, monthLabelMat],
  );

  useStationFrame(3, (a, _b, t) => {
    const u = winMat.uniforms as Record<string, { value: number }>;
    u.uReveal!.value = easeOutCubic(range(a, 0, 0.5));
    u.uTime!.value = t;
    if (win.current) {
      const e = easeOutBack(range(a, 0, 0.45), 1.2);
      win.current.scale.setScalar(0.9 + 0.1 * e);
      win.current.rotation.y = Math.sin(t * 0.4) * 0.025;
    }
    const f = range(a, 0.1, 0.55);
    frameMat.opacity = f * 0.8;
    if (ghost1.current) {
      ghost1.current.position.z = -0.28 * f;
      ghost1.current.scale.setScalar(1 + 0.05 * f);
    }
    if (ghost2.current) {
      ghost2.current.position.z = -0.56 * f;
      ghost2.current.scale.setScalar(1 + 0.1 * f);
    }
    tiles.current.forEach((m, i) => {
      if (!m) return;
      const d = 0.38 + i * 0.065;
      const raw = range(a, d, d + 0.2);
      const e = easeOutBack(raw, 2);
      m.scale.setScalar(Math.max(0.0001, e));
      m.position.z = 0.13 + Math.sin(t * 1.2 + i) * 0.012;
      const mat = tileMats[i]!;
      mat.opacity = Math.min(1, raw * 2.2);
      // Amber flash as each module lands, settling to a soft cyan glow.
      const flash = Math.exp(-Math.max(0, a - d - 0.1) * 14) * (a > d ? 1 : 0);
      mat.color.setRGB(1.1 + flash * 2.4, 1.1 + flash * 1.2, 1.1);
    });
    const mf = range(a, 0.7, 1);
    tag.opacity = mf;
    monthTrack.opacity = mf * 0.8;
    monthMats.forEach((m, i) => {
      m.opacity = range(a, 0.72 + i * 0.07, 0.8 + i * 0.07);
    });
    if (bigMat) bigMat.opacity = range(a, 0.5, 0.9);
    if (monthLabelMat) monthLabelMat.opacity = mf;
  });

  const cols = [-1.3, -0.44, 0.44, 1.3];
  return (
    <group position={[0, 0.12, 0]}>
      <mesh ref={win} material={winMat}>
        <planeGeometry args={[WIN_W, WIN_H]} />
      </mesh>
      <group ref={ghost1}>
        <lineSegments geometry={frameGeo} material={frameMat} />
      </group>
      <group ref={ghost2}>
        <lineSegments geometry={frameGeo} material={frameMat} />
      </group>
      {MODULES.map((name, i) => (
        <mesh
          key={name}
          ref={(el) => {
            tiles.current[i] = el;
          }}
          material={tileMats[i]}
          position={[cols[i % 4]!, i < 4 ? 0.28 : -0.62, 0.13]}
        >
          <planeGeometry args={[TILE, TILE]} />
        </mesh>
      ))}
      {bigMat ? (
        <mesh material={bigMat} position={[-1.2, 1.68, 0.2]}>
          <planeGeometry args={[1.2, 0.6]} />
        </mesh>
      ) : null}
      <mesh material={tag} renderOrder={20} position={[0, -1.42, 0.05]}>
        <planeGeometry args={[1.8, 0.15]} />
      </mesh>
      <group position={[0, -1.66, 0.05]}>
        {monthMats.map((m, i) => (
          <group key={i} position={[(i - (months - 1) / 2) * 0.62, 0, 0]}>
            <mesh material={monthTrack}>
              <planeGeometry args={[0.56, 0.06]} />
            </mesh>
            <mesh material={m} position={[0, 0, 0.002]}>
              <planeGeometry args={[0.56, 0.06]} />
            </mesh>
          </group>
        ))}
      </group>
      {monthLabelMat ? (
        <mesh material={monthLabelMat} renderOrder={20} position={[0, -1.9, 0.05]}>
          <planeGeometry args={[1.5, 0.125]} />
        </mesh>
      ) : null}
    </group>
  );
}
