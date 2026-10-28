import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Object3D,
  Points,
  PointsMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import { COLORS, rng } from './common';
import { createRailMaterial } from './glass';
import type { Quality } from './quality';
import { softTexture } from './textures';
import { flight } from './timeline';
import { arcStart, cameraArc, pathFrame, pathPoint, type TrackLayout } from './track';

interface ConduitProps {
  readonly layout: TrackLayout;
  readonly quality: Quality;
}

const T = new Vector3();
const R = new Vector3();
const U = new Vector3();
const P = new Vector3();

/** Three rails (centre and a pair either side), a glowing portion behind the camera and an amber bead ahead of it. */
function Rails({ layout }: { layout: TrackLayout }) {
  const { geometries, material, length } = useMemo(() => {
    const a0 = arcStart(layout);
    const step = 1.6;
    const offsets = layout.portrait ? [0] : [-0.46, 0, 0.46];
    const out: TubeGeometry[] = [];
    let len = 1;
    for (const off of offsets) {
      const pts: Vector3[] = [];
      for (let arc = a0; arc <= layout.totalArc + step; arc += step) {
        pathFrame(layout, arc, T, R, U);
        pathPoint(layout, arc, P);
        pts.push(P.clone().addScaledVector(R, off).addScaledVector(U, -0.02));
      }
      const curve = new CatmullRomCurve3(pts, false, 'centripetal');
      len = curve.getLength();
      out.push(new TubeGeometry(curve, pts.length * 2, off === 0 ? 0.022 : 0.012, 5, false));
    }
    return { geometries: out, material: createRailMaterial(COLORS.cyan, COLORS.amberHi), length: len };
  }, [layout]);

  useEffect(
    () => () => {
      for (const g of geometries) g.dispose();
      material.dispose();
    },
    [geometries, material],
  );

  useFrame((state) => {
    const camArc = cameraArc(layout, flight.s);
    const a0 = arcStart(layout);
    const u = material.uniforms as Record<string, { value: number }>;
    u.uHead!.value = (camArc - a0) / length;
    u.uPacket!.value = (camArc + layout.packetAhead - a0) / length;
    u.uTime!.value = state.clock.elapsedTime;
  });

  return (
    <group>
      {geometries.map((g, i) => (
        <mesh key={i} geometry={g} material={material} frustumCulled={false} />
      ))}
    </group>
  );
}

/** Cross-ties between the rails, spaced evenly: the cue that makes the camera's speed readable. Warm near the packet. */
function Ties({ layout }: { layout: TrackLayout }) {
  const ref = useRef<InstancedMesh>(null);
  const spec = useMemo(() => {
    const a0 = arcStart(layout);
    const spacing = layout.portrait ? 1.1 : 1.25;
    const arcs: number[] = [];
    for (let a = a0; a < layout.totalArc; a += spacing) arcs.push(a);
    return { arcs };
  }, [layout]);
  const geo = useMemo(() => new BoxGeometry(layout.portrait ? 0.36 : 0.98, 0.012, 0.04), [layout.portrait]);
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false, fog: true }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    const c = new Color();
    spec.arcs.forEach((arc, i) => {
      pathFrame(layout, arc, T, R, U);
      pathPoint(layout, arc, P);
      P.addScaledVector(U, -0.02);
      m.makeBasis(R, U, T.clone().negate());
      m.setPosition(P);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, c.set('#22d3ee'));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [spec, layout]);

  const tmp = useMemo(() => new Color(), []);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh?.instanceColor) return;
    const camArc = cameraArc(layout, flight.s);
    const packetArc = camArc + layout.packetAhead;
    spec.arcs.forEach((arc, i) => {
      const behind = arc < camArc ? 0.75 : 0.12;
      const near = Math.exp(-Math.pow((arc - packetArc) / 1.3, 2));
      tmp.copy(COLORS.cyan).multiplyScalar(behind);
      tmp.r += COLORS.amberHi.r * near * 0.28;
      tmp.g += COLORS.amberHi.g * near * 0.28;
      tmp.b += COLORS.amberHi.b * near * 0.28;
      mesh.setColorAt(i, tmp);
    });
    mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, spec.arcs.length]} frustumCulled={false} />;
}

/** Open ring segments spaced down the whole conduit; they turn with scroll and brighten as the packet reaches them. */
function Rings({ layout, quality }: ConduitProps) {
  const ref = useRef<InstancedMesh>(null);
  const spec = useMemo(() => {
    const rand = rng(11);
    const a0 = arcStart(layout);
    const spacing = (layout.portrait ? 1.9 : 2.5) / Math.max(0.6, quality.density);
    const items: { arc: number; radius: number; phase: number; arcLen: number; base: Matrix4 }[] = [];
    const b = new Matrix4();
    for (let arc = a0; arc < layout.totalArc; arc += spacing) {
      pathFrame(layout, arc, T, R, U);
      pathPoint(layout, arc, P);
      b.makeBasis(R, U, T.clone().negate());
      b.setPosition(P);
      items.push({
        arc,
        radius: (layout.portrait ? 2.5 : 4.5) + rand() * (layout.portrait ? 0.7 : 1.2),
        phase: rand() * Math.PI * 2,
        arcLen: 0,
        base: b.clone(),
      });
    }
    return items;
  }, [layout, quality.density]);
  const geo = useMemo(() => new TorusGeometry(1, 0.0034, 5, 120, Math.PI * 1.55), []);
  const mat = useMemo(
    () => new MeshBasicMaterial({ toneMapped: false, transparent: true, blending: AdditiveBlending, depthWrite: false, fog: true }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  const dummy = useMemo(() => new Object3D(), []);
  const m = useMemo(() => new Matrix4(), []);
  const col = useMemo(() => new Color(), []);
  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const camArc = cameraArc(layout, flight.s);
    const packetArc = camArc + layout.packetAhead;
    const t = state.clock.elapsedTime;
    spec.forEach((r, i) => {
      dummy.rotation.set(0, 0, r.phase + flight.s * 0.8 + t * 0.04 * (i % 2 ? 1 : -1));
      dummy.scale.setScalar(r.radius);
      dummy.updateMatrix();
      m.multiplyMatrices(r.base, dummy.matrix);
      mesh.setMatrixAt(i, m);
      const wave = Math.exp(-Math.pow((r.arc - packetArc - 2) / 5, 2));
      const behind = r.arc < camArc ? 0.55 : 0.2;
      col.copy(COLORS.cyan).multiplyScalar(behind + wave * 1.9);
      col.r += COLORS.amber.r * wave * 0.55;
      col.g += COLORS.amber.g * wave * 0.55;
      mesh.setColorAt(i, col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, spec.length]} frustumCulled={false} />;
}

/** Specks of data hanging in the dark around the conduit: the parallax that makes the flight feel like depth. */
function Dust({ layout, quality }: ConduitProps) {
  const spec = useMemo(() => {
    const rand = rng(23);
    const a0 = arcStart(layout);
    const build = (count: number) => {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const arc = a0 + rand() * (layout.totalArc - a0);
        const radius = (layout.portrait ? 1.0 : 0.9) + Math.pow(rand(), 0.7) * (layout.portrait ? 4.2 : 7.5);
        const th = rand() * Math.PI * 2;
        pathFrame(layout, arc, T, R, U);
        pathPoint(layout, arc, P);
        P.addScaledVector(R, Math.cos(th) * radius).addScaledVector(U, Math.sin(th) * radius * 0.8);
        pos.set([P.x, P.y, P.z], i * 3);
      }
      const g = new BufferGeometry();
      g.setAttribute('position', new BufferAttribute(pos, 3));
      return g;
    };
    return { cyan: build(quality.dust), amber: build(Math.round(quality.dust / 9)) };
  }, [layout, quality.dust]);
  const mats = useMemo(() => {
    const base = { map: softTexture(), transparent: true, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true, fog: true } as const;
    return {
      cyan: new PointsMaterial({ ...base, size: layout.portrait ? 0.09 : 0.075, color: COLORS.cyanHi.clone().multiplyScalar(0.8), opacity: 0.9 }),
      amber: new PointsMaterial({ ...base, size: layout.portrait ? 0.14 : 0.12, color: COLORS.amberHi.clone().multiplyScalar(1.3), opacity: 0.95 }),
    };
  }, [layout.portrait]);
  useEffect(
    () => () => {
      spec.cyan.dispose();
      spec.amber.dispose();
      mats.cyan.dispose();
      mats.amber.dispose();
    },
    [spec, mats],
  );
  const group = useRef<Group>(null);
  useFrame((state) => {
    if (group.current) group.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.06;
  });
  return (
    <group ref={group}>
      <points geometry={spec.cyan} material={mats.cyan} frustumCulled={false} />
      <points geometry={spec.amber} material={mats.amber} frustumCulled={false} />
    </group>
  );
}

const TRAIL = 12;

/** The amber work packet: it rides just ahead of the camera the whole way and carries each artifact to the next station. */
function Packet({ layout }: { layout: TrackLayout }) {
  const group = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const trail = useRef<Points>(null);
  const trailGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute('color', new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    return g;
  }, []);
  const trailMat = useMemo(
    () =>
      new PointsMaterial({
        map: softTexture(),
        size: layout.portrait ? 0.1 : 0.085,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
        fog: false,
      }),
    [layout.portrait],
  );
  useEffect(
    () => () => {
      trailGeo.dispose();
      trailMat.dispose();
    },
    [trailGeo, trailMat],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const camArc = cameraArc(layout, flight.s);
    const head = camArc + layout.packetAhead;
    pathPoint(layout, head, P);
    pathFrame(layout, head, T, R, U);
    if (layout.portrait) P.z = 0.4;
    if (group.current) {
      group.current.position.copy(P).addScaledVector(U, Math.sin(t * 2.2) * 0.04 - 0.02);
    }
    if (core.current) {
      core.current.rotation.set(t * 1.4, t * 1.9, 0);
      core.current.scale.setScalar(1 + 0.08 * Math.sin(t * 6));
    }
    if (ring.current) {
      ring.current.rotation.set(Math.PI / 2 + Math.sin(t * 0.9) * 0.4, t * 1.2, 0);
    }
    const pos = trailGeo.getAttribute('position') as BufferAttribute;
    const colr = trailGeo.getAttribute('color') as BufferAttribute;
    for (let i = 0; i < TRAIL; i += 1) {
      const arc = head - 0.18 - i * 0.1;
      pathPoint(layout, arc, P);
      if (layout.portrait) P.z = 0.4;
      pos.setXYZ(i, P.x, P.y, P.z);
      const f = Math.pow(1 - i / TRAIL, 2.2);
      colr.setXYZ(i, 0.95 * f, 0.42 * f, 0.04 * f);
    }
    pos.needsUpdate = true;
    colr.needsUpdate = true;
  });

  return (
    <>
      <group ref={group}>
        <mesh ref={core}>
          <octahedronGeometry args={[0.085, 0]} />
          <meshBasicMaterial color={[1.55, 0.8, 0.08]} toneMapped={false} fog={false} />
        </mesh>
        <mesh ref={ring}>
          <torusGeometry args={[0.17, 0.006, 6, 40]} />
          <meshBasicMaterial color={[1.3, 0.7, 0.07]} toneMapped={false} fog={false} />
        </mesh>
      </group>
      <points ref={trail} geometry={trailGeo} material={trailMat} frustumCulled={false} />
    </>
  );
}

export function Conduit({ layout, quality }: ConduitProps) {
  return (
    <>
      <Rails layout={layout} />
      <Ties layout={layout} />
      <Rings layout={layout} quality={quality} />
      <Dust layout={layout} quality={quality} />
      <Packet layout={layout} />
    </>
  );
}
