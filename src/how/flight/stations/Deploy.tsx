import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  InstancedMesh,
  LineBasicMaterial,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  PointsMaterial,
  Quaternion,
  TetrahedronGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import type { PipelineStage } from '../../../data/content.types';
import { COLORS, easeOutBack, range } from '../common';
import { useStationFrame } from '../useStationFrame';
import { metricTexture, softTexture, tagTexture } from '../textures';
import { cameraArc, pathFrame, pathPoint, type TrackLayout } from '../track';
import { flight, smoothstep } from '../timeline';

/**
 * Deploy: a release pad where the six-engineer team (2 backend, 2 frontend, 2 QA) orbits, and a bright pulse that
 * rushes down the conduit to a distant server rack, which lights up row by row as the pulse lands.
 */
interface Props {
  readonly stage: PipelineStage;
}

const ROLE_TAGS = [
  { text: '2 BACKEND', x: -1.35, tone: 'cyan' },
  { text: '2 FRONTEND', x: 0, tone: 'cyan' },
  { text: '2 QA', x: 1.35, tone: 'amber' },
] as const;

export function Deploy({ stage }: Props) {
  const pad = useRef<Group>(null);
  const cubes = useRef<InstancedMesh>(null);
  const octas = useRef<InstancedMesh>(null);
  const tetras = useRef<InstancedMesh>(null);
  const beam = useRef<Mesh>(null);

  const cubeGeo = useMemo(() => new BoxGeometry(0.2, 0.2, 0.2), []);
  const octGeo = useMemo(() => new OctahedronGeometry(0.15, 0), []);
  const tetGeo = useMemo(() => new TetrahedronGeometry(0.17, 0), []);
  const matCyan = useMemo(() => new MeshBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(2.2), toneMapped: false, fog: true }), []);
  const matHi = useMemo(() => new MeshBasicMaterial({ color: new Color('#d8fbff').multiplyScalar(2), toneMapped: false, fog: true }), []);
  const matAmber = useMemo(() => new MeshBasicMaterial({ color: COLORS.amberHi.clone().multiplyScalar(2.2), toneMapped: false, fog: true }), []);
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(1.1), transparent: true, opacity: 0, toneMapped: false, fog: true }), []);
  const discMat = useMemo(
    () => new MeshBasicMaterial({ map: softTexture(), color: COLORS.cyan.clone().multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: true }),
    [],
  );
  const beamMat = useMemo(
    () => new MeshBasicMaterial({ color: COLORS.amberHi.clone().multiplyScalar(1.6), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: true }),
    [],
  );
  const tags = useMemo(() => ROLE_TAGS.map((r) => new MeshBasicMaterial({ map: tagTexture(r.text, r.tone, 8), transparent: true, opacity: 0, toneMapped: false, fog: true })), []);
  const big = stage.numbers[0];
  const bigMat = useMemo(
    () => new MeshBasicMaterial({ map: metricTexture(big?.value ?? '6', 'engineers led', '#fbbf24'), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: true }),
    [big?.value],
  );
  useEffect(
    () => () => {
      cubeGeo.dispose();
      octGeo.dispose();
      tetGeo.dispose();
      matCyan.dispose();
      matHi.dispose();
      matAmber.dispose();
      ringMat.dispose();
      discMat.dispose();
      beamMat.dispose();
      tags.forEach((t) => t.dispose());
      bigMat.dispose();
    },
    [cubeGeo, octGeo, tetGeo, matCyan, matHi, matAmber, ringMat, discMat, beamMat, tags, bigMat],
  );

  const o = useMemo(() => new Object3D(), []);
  useStationFrame(6, (a, _b, t) => {
    const f = range(a, 0.05, 0.6);
    ringMat.opacity = f * 0.9;
    discMat.opacity = f * 0.5;
    beamMat.opacity = range(a, 0.3, 0.8) * (0.5 + 0.2 * Math.sin(t * 3));
    if (beam.current) beam.current.scale.y = Math.max(0.001, range(a, 0.3, 0.9));
    if (pad.current) pad.current.rotation.y = t * 0.25;
    // Six nodes on two interleaved orbits: pairs of the same kind sit opposite each other.
    const place = (m: InstancedMesh | null, base: number) => {
      if (!m) return;
      for (let k = 0; k < 2; k += 1) {
        const idx = base + k * 3;
        const d = 0.25 + idx * 0.06;
        const e = easeOutBack(range(a, d, d + 0.3), 1.8);
        const ang = (idx / 6) * Math.PI * 2 + t * 0.55;
        const r = 1.15 * e;
        o.position.set(Math.cos(ang) * r, -0.25 + Math.sin(t * 1.3 + idx) * 0.07 + (1 - e) * 1.5, Math.sin(ang) * r);
        o.rotation.set(t * (0.8 + idx * 0.1), t * 1.1, 0);
        o.scale.setScalar(Math.max(0.0001, e));
        o.updateMatrix();
        m.setMatrixAt(k, o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    };
    place(cubes.current, 0);
    place(octas.current, 1);
    place(tetras.current, 2);
    tags.forEach((m, i) => {
      m.opacity = range(a, 0.55 + i * 0.1, 0.8 + i * 0.1);
    });
    bigMat.opacity = range(a, 0.5, 0.9);
  });

  return (
    <group position={[0, 0, 0]} scale={0.82}>
      <group position={[0, -0.95, 0]}>
        <group ref={pad}>
          <mesh material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.55, 0.02, 6, 96]} />
          </mesh>
          <mesh material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.95, 0.014, 6, 80, Math.PI * 1.5]} />
          </mesh>
          <group position={[0, 0.7, 0]}>
            <instancedMesh ref={cubes} args={[cubeGeo, matCyan, 2]} frustumCulled={false} />
            <instancedMesh ref={octas} args={[octGeo, matHi, 2]} frustumCulled={false} />
            <instancedMesh ref={tetras} args={[tetGeo, matAmber, 2]} frustumCulled={false} />
          </group>
        </group>
        <mesh material={discMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[3.8, 3.8]} />
        </mesh>
        <mesh ref={beam} material={beamMat} position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.6, 8, 1, true]} />
        </mesh>
      </group>
      <mesh material={bigMat} position={[0, 1.45, 0.1]}>
        <planeGeometry args={[1.4, 0.7]} />
      </mesh>
      {ROLE_TAGS.map((r, i) => (
        <mesh key={r.text} material={tags[i]} position={[r.x, -1.62, 0.4]}>
          <planeGeometry args={[1.1, 0.14]} />
        </mesh>
      ))}
    </group>
  );
}

const SLABS = 9;
const LEDS = 6;
const PULSE_POINTS = 20;

/** The far end of the conduit: a tall rack that lights up row by row as the pulse lands. World space. */
export function DeployServer({ layout }: { layout: TrackLayout }) {
  const root = useRef<Group>(null);
  const slabs = useRef<InstancedMesh>(null);
  const leds = useRef<InstancedMesh>(null);
  const halo = useRef<Mesh>(null);

  const slabGeo = useMemo(() => new BoxGeometry(1.7, 0.36, 1.0), []);
  const slabMat = useMemo(() => new MeshBasicMaterial({ color: new Color('#0d1d24'), transparent: true, opacity: 0, fog: false }), []);
  const ledGeo = useMemo(() => new BoxGeometry(0.13, 0.055, 0.02), []);
  const ledMat = useMemo(() => new MeshBasicMaterial({ toneMapped: false, transparent: true, opacity: 0, fog: false }), []);
  const frameGeo = useMemo(() => new EdgesGeometry(new BoxGeometry(1.95, SLABS * 0.44 + 0.2, 1.15)), []);
  const frameMat = useMemo(() => new LineBasicMaterial({ color: COLORS.cyanHi.clone().multiplyScalar(1.5), transparent: true, opacity: 0, fog: false }), []);
  const haloMat = useMemo(
    () => new MeshBasicMaterial({ map: softTexture(), color: COLORS.cyan.clone().multiplyScalar(1.4), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }),
    [],
  );
  const plateMat = useMemo(() => new MeshBasicMaterial({ map: tagTexture('TRAVELDESK MVP · DEPLOYED', 'amber', 14), transparent: true, opacity: 0, toneMapped: false, fog: false }), []);
  const pulseGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(PULSE_POINTS * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(PULSE_POINTS * 3), 3));
    return g;
  }, []);
  const pulseMat = useMemo(
    () => new PointsMaterial({ map: softTexture(), size: 0.42, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }),
    [],
  );
  useEffect(
    () => () => {
      slabGeo.dispose();
      slabMat.dispose();
      ledGeo.dispose();
      ledMat.dispose();
      frameGeo.dispose();
      frameMat.dispose();
      haloMat.dispose();
      plateMat.dispose();
      pulseGeo.dispose();
      pulseMat.dispose();
    },
    [slabGeo, slabMat, ledGeo, ledMat, frameGeo, frameMat, haloMat, plateMat, pulseGeo, pulseMat],
  );

  const scale = layout.portrait ? 0.56 : 2.7;
  const pos = useMemo(() => new Vector3(), []);
  const quat = useMemo(() => new Quaternion(), []);
  useLayoutEffect(() => {
    const T = new Vector3();
    const R = new Vector3();
    const U = new Vector3();
    pathPoint(layout, layout.serverArc, pos);
    if (layout.portrait) {
      pos.z = 0;
      quat.identity();
    }
    else {
      pathFrame(layout, layout.serverArc, T, R, U);
      quat.setFromRotationMatrix(new Matrix4().makeBasis(R, U, T.clone().negate()));
    }
    const g = root.current;
    if (g) {
      g.position.copy(pos);
      g.quaternion.copy(quat);
      g.scale.setScalar(scale);
    }
    const sl = slabs.current;
    const ld = leds.current;
    const dummy = new Object3D();
    for (let i = 0; i < SLABS; i += 1) {
      dummy.position.set(0, (i - (SLABS - 1) / 2) * 0.44, 0);
      dummy.updateMatrix();
      sl?.setMatrixAt(i, dummy.matrix);
      for (let k = 0; k < LEDS; k += 1) {
        dummy.position.set(-0.55 + k * 0.22, (i - (SLABS - 1) / 2) * 0.44, 0.51);
        dummy.updateMatrix();
        ld?.setMatrixAt(i * LEDS + k, dummy.matrix);
        ld?.setColorAt(i * LEDS + k, new Color('#0c242c'));
      }
    }
    if (sl) sl.instanceMatrix.needsUpdate = true;
    if (ld) {
      ld.instanceMatrix.needsUpdate = true;
      if (ld.instanceColor) ld.instanceColor.needsUpdate = true;
    }
  }, [layout, pos, quat, scale]);

  const col = useMemo(() => new Color(), []);
  const P = useMemo(() => new Vector3(), []);
  useFrame((state) => {
    const s = flight.s;
    const g = root.current;
    const near = s > 3.4;
    if (g) g.visible = near;
    if (!near) return;
    const t = state.clock.elapsedTime;
    const lit = smoothstep(5.2, 6.15, s);
    const appear = smoothstep(4.8, 5.6, s);
    slabMat.opacity = appear;
    ledMat.opacity = appear;
    frameMat.opacity = appear * 0.8;
    const phase = (t * 0.34) % 1;
    const flash = phase > 0.88 ? (phase - 0.88) / 0.12 : Math.max(0, 1 - phase * 7);
    haloMat.opacity = lit * (0.35 + 0.35 * flash);
    plateMat.opacity = smoothstep(5.7, 6.2, s);
    if (halo.current) halo.current.scale.setScalar(1 + 0.12 * flash);
    const total = SLABS * LEDS;
    const ld = leds.current;
    if (ld) {
      const count = Math.floor(lit * total);
      for (let i = 0; i < total; i += 1) {
        const row = Math.floor(i / LEDS);
        // Rows light from the bottom up; the amber ones are "in flight" and flicker.
        const on = i < count;
        if (!on) col.set('#0c242c');
        else if ((i * 7 + Math.floor(t * 2.2)) % 11 === 0) col.copy(COLORS.amberHi).multiplyScalar(2.6);
        else col.copy(COLORS.cyanHi).multiplyScalar(1.7 + 1.3 * flash * (row === SLABS - 1 ? 1 : 0.4));
        ld.setColorAt(i, col);
      }
      if (ld.instanceColor) ld.instanceColor.needsUpdate = true;
    }
    // The pulse: a bright comet from just ahead of the packet to the rack, looping while the deploy station is on.
    const active = smoothstep(4.9, 5.7, s);
    const startArc = cameraArc(layout, s) + layout.packetAhead + 0.8;
    const e = phase * phase * (3 - 2 * phase);
    const head = startArc + (layout.serverArc - 1.2 - startArc) * e;
    const pp = pulseGeo.getAttribute('position') as BufferAttribute;
    const pc = pulseGeo.getAttribute('color') as BufferAttribute;
    for (let i = 0; i < PULSE_POINTS; i += 1) {
      const arc = Math.max(startArc - 0.4, head - i * (0.3 + e * 1.0));
      pathPoint(layout, arc, P);
      if (layout.portrait) P.z = 0.4;
      pp.setXYZ(i, P.x, P.y + 0.03, P.z);
      const f = Math.pow(1 - i / PULSE_POINTS, 1.8) * active * (phase > 0.97 ? 0 : 1);
      pc.setXYZ(i, 1.8 * f, 3.4 * f, 3.9 * f);
    }
    pp.needsUpdate = true;
    pc.needsUpdate = true;
  });

  return (
    <>
      <group ref={root} visible={false}>
        <mesh ref={halo} material={haloMat} position={[0, 0, -0.9]}>
          <planeGeometry args={[9, 9]} />
        </mesh>
        <instancedMesh ref={slabs} args={[slabGeo, slabMat, SLABS]} frustumCulled={false} />
        <instancedMesh ref={leds} args={[ledGeo, ledMat, SLABS * LEDS]} frustumCulled={false} />
        <lineSegments geometry={frameGeo} material={frameMat} />
        <mesh material={plateMat} position={[0, SLABS * 0.22 + 0.55, 0.1]}>
          <planeGeometry args={[2.6, 0.186]} />
        </mesh>
      </group>
      <points geometry={pulseGeo} material={pulseMat} frustumCulled={false} />
    </>
  );
}
