import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  TorusGeometry,
  type Group,
  type Mesh,
} from 'three';
import { COLORS, range } from '../common';
import { useStationFrame } from '../useStationFrame';
import { checkTexture, softTexture, tagTexture } from '../textures';

/**
 * QA + UAT: three gates in a row, QA coverage, infosec review and UAT readiness (the three named in the artifact).
 * The camera looks down the line of them; each lights its checks one by one as the station assembles, with a scan
 * beam sweeping the open gate. The amber packet flies through all three on the way out.
 */
const GATES = [
  { name: 'QA COVERAGE', z: 0.5, x: -1.5 },
  { name: 'INFOSEC REVIEW', z: 0.0, x: 0.0 },
  { name: 'UAT READINESS', z: -0.5, x: 1.5 },
] as const;
const CHECKS = 10;
const RADIUS = 0.82;

function Gate({ i }: { i: number }) {
  const g = GATES[i]!;
  const checks = useRef<InstancedMesh>(null);
  const beam = useRef<Mesh>(null);
  const grp = useRef<Group>(null);
  const ringGeo = useMemo(() => new TorusGeometry(RADIUS, 0.03, 8, 96), []);
  const ringMat = useMemo(() => new MeshBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(0.7), toneMapped: false, fog: true }), []);
  const discMat = useMemo(
    () => new MeshBasicMaterial({ map: softTexture(), color: COLORS.cyanHi.clone().multiplyScalar(1.2), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false, fog: true }),
    [],
  );
  const checkMat = useMemo(
    () => new MeshBasicMaterial({ map: checkTexture(), transparent: true, depthWrite: false, toneMapped: false, fog: true, side: DoubleSide }),
    [],
  );
  const beamMat = useMemo(
    () => new MeshBasicMaterial({ color: COLORS.amberHi.clone().multiplyScalar(2.2), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: true }),
    [],
  );
  const tagMat = useMemo(() => new MeshBasicMaterial({ map: tagTexture(g.name, 'cyan', 10), transparent: true, opacity: 0, toneMapped: false, fog: true }), [g.name]);
  const leaderGeo = useMemo(() => {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute([0, -RADIUS, 0, 0, -RADIUS - 0.3, 0], 3));
    return geo;
  }, []);
  const leaderMat = useMemo(() => new LineBasicMaterial({ color: COLORS.cyan.clone().multiplyScalar(0.8), transparent: true, opacity: 0, fog: true }), []);
  const checkGeo = useMemo(() => {
    // A plain square carrying the check texture.
    const geo = new BufferGeometry();
    const s = 0.09;
    geo.setAttribute('position', new Float32BufferAttribute([-s, -s, 0, s, -s, 0, s, s, 0, -s, -s, 0, s, s, 0, -s, s, 0], 3));
    geo.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
    return geo;
  }, []);
  useEffect(
    () => () => {
      ringGeo.dispose();
      ringMat.dispose();
      discMat.dispose();
      checkMat.dispose();
      beamMat.dispose();
      tagMat.dispose();
      leaderGeo.dispose();
      leaderMat.dispose();
      checkGeo.dispose();
    },
    [ringGeo, ringMat, discMat, checkMat, beamMat, tagMat, leaderGeo, leaderMat, checkGeo],
  );

  const dummy = useMemo(() => new Object3D(), []);
  const m4 = useMemo(() => new Matrix4(), []);
  const col = useMemo(() => new Color(), []);

  useEffect(() => {
    const m = checks.current;
    if (!m) return;
    for (let k = 0; k < CHECKS; k += 1) {
      const ang = (k / CHECKS) * Math.PI * 2 + Math.PI / CHECKS;
      dummy.position.set(Math.cos(ang) * (RADIUS + 0.0), Math.sin(ang) * RADIUS, 0.01);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      m4.copy(dummy.matrix);
      m.setMatrixAt(k, m4);
      m.setColorAt(k, col.set('#1b3a44'));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [dummy, m4, col]);

  useStationFrame(5, (a, _b, t) => {
    const start = 0.12 + i * 0.24;
    const L = range(a, start, start + 0.22);
    const lit = Math.floor(L * CHECKS + 1e-6);
    const m = checks.current;
    if (m) {
      for (let k = 0; k < CHECKS; k += 1) {
        if (k < lit) col.set('#d8fbff').multiplyScalar(2.4);
        else if (k === lit && L > 0 && L < 1) col.copy(COLORS.amberHi).multiplyScalar(3);
        else col.set('#1b3a44');
        m.setColorAt(k, col);
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    ringMat.color.copy(COLORS.cyan).multiplyScalar(0.6 + L * 1.6);
    discMat.opacity = L >= 1 ? 0.22 + 0.06 * Math.sin(t * 2 + i) : L * 0.12;
    beamMat.opacity = L > 0 ? 0.85 : 0;
    if (beam.current) beam.current.position.x = Math.sin(t * 1.5 + i * 1.7) * (RADIUS - 0.1);
    if (grp.current) grp.current.rotation.z = (1 - range(a, 0, 0.5)) * 1.6 * (i % 2 ? -1 : 1);
    const gateIn = range(a, i * 0.1, i * 0.1 + 0.35);
    ringGeo.setDrawRange(0, Math.floor(gateIn * ringGeo.index!.count));
    tagMat.opacity = range(a, 0.45 + i * 0.12, 0.7 + i * 0.12);
    leaderMat.opacity = tagMat.opacity * 0.6;
  });

  return (
    <group position={[g.x, 0.05, g.z]}>
      <group ref={grp}>
        <mesh geometry={ringGeo} material={ringMat} />
        <instancedMesh ref={checks} args={[checkGeo, checkMat, CHECKS]} frustumCulled={false} />
      </group>
      <mesh material={discMat} position={[0, 0, -0.02]}>
        <planeGeometry args={[RADIUS * 2.15, RADIUS * 2.15]} />
      </mesh>
      <mesh ref={beam} material={beamMat} position={[0, 0, 0.01]}>
        <planeGeometry args={[0.014, RADIUS * 1.7]} />
      </mesh>
      <lineSegments geometry={leaderGeo} material={leaderMat} />
      <mesh material={tagMat} position={[0, -RADIUS - 0.4, 0]}>
        <planeGeometry args={[1.3, 0.13]} />
      </mesh>
    </group>
  );
}

export function Qa() {
  return (
    <group position={[0, 0.1, 0]} rotation={[0, 0.12, 0]}>
      {GATES.map((_, i) => (
        <Gate key={i} i={i} />
      ))}
    </group>
  );
}
