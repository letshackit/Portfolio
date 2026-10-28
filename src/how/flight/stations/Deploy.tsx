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
import { softTexture, specCardTexture, tagTexture } from '../textures';
import { cameraArc, pathFrame, pathPoint, type TrackLayout } from '../track';
import { flight, smoothstep } from '../timeline';

/**
 * Deploy, the finale: three orbital rings around a warm amber core, one per role pair of the six-engineer team
 * (2 backend, 2 frontend, 2 QA), over an amber floor-glow. Three spec cards dock around it, an amber dot walks the
 * INFOSEC / UAT / QA gate chain to a LIVE target, and a bright pulse rushes down the conduit to a distant server rack,
 * which lights up row by row as the pulse lands.
 */
interface Props {
  readonly stage: PipelineStage;
  /** Narrow, vertical layout. */
  readonly portrait: boolean;
}

/** The release gates, in order; LIVE is the destination, drawn as a target and never as a completed check. */
const GATES = ['INFOSEC', 'UAT', 'QA', 'LIVE'] as const;
const GATE_X = [-2.0, -1.0, 0.0, 1.0] as const;
const GATE_Y = -1.25;

/** Three orbital rings, one per role pair: two nodes ride each (2 backend, 2 frontend, 2 QA). */
const ORBITS = [
  { radius: 1.45, tilt: [1.2, 0.0, 0.25], speed: 0.32, kind: 'cube' },
  { radius: 1.12, tilt: [0.55, 0.9, -0.35], speed: -0.45, kind: 'octa' },
  { radius: 0.8, tilt: [-0.15, 0.25, 0.6], speed: 0.6, kind: 'tetra' },
] as const;

/** Docking spec cards: where each ends up, and the direction it arrives from. */
const CARD_ASPECT = 324 / 576;

/**
 * Docking spec cards: where each ends up, and the direction it arrives from. The narrow layout has little room between
 * the rail and the panel, so it docks the two figure cards side by side above a smaller gyroscope and drops the third.
 */
function layoutCards(portrait: boolean) {
  const w = portrait ? 1.75 : 1.4;
  const cards = portrait
    ? ([
        { x: -0.95, y: 1.7, from: [-0.6, 0.9, 0.7], show: true },
        { x: 0.95, y: 1.7, from: [0.6, 0.9, 0.7], show: true },
        { x: 0, y: 0, from: [0, 0, 0], show: false },
      ] as const)
    : ([
        { x: -0.82, y: 2.2, from: [-0.6, 0.9, 0.7], show: true },
        { x: 0.82, y: 2.2, from: [0.6, 0.9, 0.7], show: true },
        { x: 1.62, y: 0.95, from: [1, 0.25, 0.7], show: true },
      ] as const);
  return { w, h: w * CARD_ASPECT, cards };
}

export function Deploy({ stage, portrait }: Props) {
  const { w: CARD_W, h: CARD_H, cards: CARDS } = useMemo(() => layoutCards(portrait), [portrait]);
  const gyro = portrait ? 0.74 : 1;
  const cy0 = portrait ? 0.1 : 0.25;
  const spins = useRef<Array<Group | null>>([]);
  const core = useRef<Mesh>(null);
  const cards = useRef<Array<Mesh | null>>([]);
  const dot = useRef<Mesh>(null);
  const gateMeshes = useRef<Array<Mesh | null>>([]);

  const nodeGeos = useMemo(() => [new BoxGeometry(0.2, 0.2, 0.2), new OctahedronGeometry(0.15, 0), new TetrahedronGeometry(0.17, 0)], []);
  const nodeMats = useMemo(
    () => [
      new MeshBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(2.2), toneMapped: false, fog: true }),
      new MeshBasicMaterial({ color: new Color('#d8fbff').multiplyScalar(2), toneMapped: false, fog: true }),
      new MeshBasicMaterial({ color: COLORS.amberHi.clone().multiplyScalar(1.8), toneMapped: false, fog: true }),
    ],
    [],
  );
  const ringMats = useMemo(
    () => [COLORS.cyan, COLORS.cyanHi, COLORS.amber].map((c, i) => new MeshBasicMaterial({ color: c.clone().multiplyScalar(i === 2 ? 1.0 : 1.1), transparent: true, opacity: 0, toneMapped: false, fog: true })),
    [],
  );
  const coreMat = useMemo(() => new MeshBasicMaterial({ color: new Color(1.9, 1.0, 0.1), toneMapped: false, transparent: true, opacity: 0, fog: true }), []);
  // The warm amber floor-glow: a wide soft pool on the floor and a taller bloom-free wash behind the rings.
  const floorMat = useMemo(
    () => new MeshBasicMaterial({ map: softTexture(), color: COLORS.amber.clone().multiplyScalar(1.5), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: true }),
    [],
  );
  const washMat = useMemo(
    () => new MeshBasicMaterial({ map: softTexture(), color: COLORS.amber.clone().multiplyScalar(0.8), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: true }),
    [],
  );
  const team = stage.numbers[0];
  const bss = stage.numbers[1];
  const cardMats = useMemo(
    () =>
      [
        specCardTexture('Engineers led', team?.value ?? '6', '2 backend · 2 frontend · 2 QA', 'cyan'),
        specCardTexture('TravelDesk MVP', 'SOLO', 'built and deployed, now a team', 'cyan'),
        specCardTexture('BSS build', bss?.value ?? '60%', 'delivered personally', 'amber'),
      ].map((map) => new MeshBasicMaterial({ map, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: true })),
    [team?.value, bss?.value],
  );
  const gateMats = useMemo(
    () => GATES.map((g) => new MeshBasicMaterial({ map: tagTexture(g === 'LIVE' ? '→ LIVE' : g, g === 'LIVE' ? 'amber' : 'cyan', 4), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: true })),
    [],
  );
  const railMat = useMemo(() => new MeshBasicMaterial({ color: COLORS.amber.clone().multiplyScalar(1.2), transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: true }), []);
  const dotMat = useMemo(() => new MeshBasicMaterial({ color: new Color(1.9, 1.0, 0.1), transparent: true, opacity: 0, depthTest: false, toneMapped: false, fog: true }), []);
  const leaderGeo = useMemo(() => {
    const g = new BufferGeometry();
    const v: number[] = [];
    // From the edge of each card toward the gyroscope's centre (which sits a little above the station origin).
    for (const c of CARDS) {
      if (!c.show) {
        v.push(0, 0, 0, 0, 0, 0);
        continue;
      }
      const dx = -c.x;
      const dy = cy0 - c.y;
      const len = Math.hypot(dx, dy);
      const t = Math.min(CARD_W / 2 / Math.max(1e-3, Math.abs(dx)), CARD_H / 2 / Math.max(1e-3, Math.abs(dy)));
      v.push(c.x + dx * t, c.y - cy0 + dy * t, 0, (-dx / len) * 1.15 * gyro, (-dy / len) * 1.15 * gyro, 0);
    }
    g.setAttribute('position', new BufferAttribute(new Float32Array(v), 3));
    return g;
  }, [CARDS, CARD_W, CARD_H, cy0, gyro]);
  const leaderMat = useMemo(() => new LineBasicMaterial({ color: COLORS.amberHi.clone().multiplyScalar(0.9), transparent: true, opacity: 0, fog: true }), []);
  useEffect(
    () => () => {
      nodeGeos.forEach((g) => g.dispose());
      nodeMats.forEach((m) => m.dispose());
      ringMats.forEach((m) => m.dispose());
      coreMat.dispose();
      floorMat.dispose();
      washMat.dispose();
      cardMats.forEach((m) => m.dispose());
      gateMats.forEach((m) => m.dispose());
      railMat.dispose();
      dotMat.dispose();
      leaderGeo.dispose();
      leaderMat.dispose();
    },
    [nodeGeos, nodeMats, ringMats, coreMat, floorMat, washMat, cardMats, gateMats, railMat, dotMat, leaderGeo, leaderMat],
  );

  useStationFrame(6, (a, _b, t) => {
    const f = range(a, 0.05, 0.55);
    ringMats.forEach((m, i) => {
      m.opacity = range(a, 0.04 + i * 0.08, 0.4 + i * 0.08) * 0.95;
    });
    coreMat.opacity = f;
    floorMat.opacity = range(a, 0.1, 0.7) * (0.62 + 0.08 * Math.sin(t * 1.6)) * (portrait ? 0.45 : 1);
    washMat.opacity = range(a, 0.2, 0.8) * 0.4;
    if (core.current) {
      core.current.rotation.set(t * 0.9, t * 1.3, 0);
      core.current.scale.setScalar(Math.max(0.0001, easeOutBack(range(a, 0.15, 0.5), 1.8)) * (1 + 0.07 * Math.sin(t * 3)));
    }
    ORBITS.forEach((o, i) => {
      const g = spins.current[i];
      if (g) {
        g.rotation.z = t * o.speed + i * 2.1;
        const e = easeOutBack(range(a, 0.1 + i * 0.1, 0.5 + i * 0.1), 1.4);
        g.scale.setScalar(Math.max(0.0001, e));
      }
    });
    CARDS.forEach((c, i) => {
      const m = cards.current[i];
      if (!m) return;
      const d = 0.28 + i * 0.12;
      const e = easeOutBack(range(a, d, d + 0.34), 1.3);
      const k = 1 - e;
      m.position.set(c.x + c.from[0] * k * 1.6, c.y + c.from[1] * k * 1.6, 0.35 + c.from[2] * k * 1.2);
      cardMats[i]!.opacity = c.show ? range(a, d, d + 0.14) : 0;
    });
    leaderMat.opacity = range(a, 0.62, 0.8) * 0.55;
    // The gate chain: the amber dot walks INFOSEC > UAT > QA, each lights as it passes; LIVE pulses as the target.
    const walk = range(a, 0.5, 0.95) * 3.6;
    railMat.opacity = range(a, 0.45, 0.6) * 0.5;
    dotMat.opacity = range(a, 0.5, 0.6);
    if (dot.current) dot.current.position.x = -2.0 + Math.min(3, walk) * 1.0;
    gateMats.forEach((m, i) => {
      const appear = range(a, 0.42 + i * 0.05, 0.56 + i * 0.05);
      if (i === 3) m.opacity = appear * (0.88 + 0.12 * Math.sin(t * 3.2));
      else m.opacity = appear * (walk > i - 0.2 ? 1 : 0.5);
      const mesh = gateMeshes.current[i];
      if (mesh) mesh.scale.setScalar(walk > i - 0.2 && walk < i + 0.7 ? 1.07 : 1);
    });
  });

  return (
    <group scale={0.82}>
      <mesh material={washMat} position={[0, -0.3, -0.6]}>
        <planeGeometry args={[7.2, 5.6]} />
      </mesh>
      <mesh material={floorMat} position={[0, -1.85, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.4, 5.2]} />
      </mesh>
      <group position={[0, cy0, 0]} scale={gyro}>
        {ORBITS.map((o, i) => (
          <group key={i} rotation={[o.tilt[0], o.tilt[1], o.tilt[2]]}>
            <group
              ref={(el) => {
                spins.current[i] = el;
              }}
            >
              <mesh material={ringMats[i]}>
                <torusGeometry args={[o.radius, 0.017, 6, 110]} />
              </mesh>
              {[0, Math.PI].map((ang) => (
                <mesh key={ang} geometry={nodeGeos[i]} material={nodeMats[i]} position={[Math.cos(ang) * o.radius, Math.sin(ang) * o.radius, 0]} />
              ))}
            </group>
          </group>
        ))}
        <mesh ref={core} material={coreMat}>
          <octahedronGeometry args={[0.2, 0]} />
        </mesh>
      </group>
      <lineSegments geometry={leaderGeo} material={leaderMat} position={[0, cy0, 0.3]} renderOrder={19} />
      {CARDS.map((c, i) => (
        <mesh
          key={i}
          ref={(el) => {
            cards.current[i] = el;
          }}
          material={cardMats[i]}
          position={[c.x, c.y, 0.35]}
          renderOrder={20}
        >
          <planeGeometry args={[CARD_W, CARD_H]} />
        </mesh>
      ))}
      <mesh material={railMat} position={[-0.5, GATE_Y - 0.17, 0.3]}>
        <planeGeometry args={[3.2, 0.014]} />
      </mesh>
      <mesh ref={dot} material={dotMat} position={[-2.0, GATE_Y - 0.17, 0.34]} renderOrder={21}>
        <circleGeometry args={[0.06, 16]} />
      </mesh>
      {GATES.map((g, i) => (
        <mesh
          key={g}
          ref={(el) => {
            gateMeshes.current[i] = el;
          }}
          material={gateMats[i]}
          position={[GATE_X[i], GATE_Y, 0.4]}
          renderOrder={20}
        >
          <planeGeometry args={[0.8, 0.2]} />
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
  const plateMat = useMemo(() => new MeshBasicMaterial({ map: tagTexture('TRAVELDESK MVP · DEPLOYED', 'amber', 14), transparent: true, depthTest: false, depthWrite: false, opacity: 0, toneMapped: false, fog: false }), []);
  const pulseGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(PULSE_POINTS * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(PULSE_POINTS * 3), 3));
    return g;
  }, []);
  const pulseMat = useMemo(
    () => new PointsMaterial({ map: softTexture(), size: 0.26, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: false }),
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
      pc.setXYZ(i, 1.0 * f, 1.9 * f, 2.2 * f);
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
        <mesh material={plateMat} renderOrder={20} position={[0, SLABS * 0.22 + 0.55, 0.1]}>
          <planeGeometry args={[2.6, 0.186]} />
        </mesh>
      </group>
      <points geometry={pulseGeo} material={pulseMat} frustumCulled={false} />
    </>
  );
}
