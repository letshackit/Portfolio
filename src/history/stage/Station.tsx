import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  Quaternion,
  Sprite,
  SpriteMaterial,
  Vector3,
  type CanvasTexture,
  type LineBasicMaterial,
} from 'three';
import { hstore, smoothstep } from '../historyStore';
import type { Station as StationModel, TimelineModel } from '../timelineModel';
import { monthLabel } from '../timelineModel';
import { type GateGeometry, GATE_R, hexPoints } from './gate';
import { drawLabel, MONO, SANS } from './labels';
import { monthsBack, pathPoint, pathTangent } from './path';

const CYAN = new Color('#22d3ee');
const AMBER = new Color('#f59e0b');
const WHITE = new Color('#ffffff');
const hexStuds = hexPoints(GATE_R - 0.075);

interface StationProps {
  readonly station: StationModel;
  readonly index: number;
  readonly model: TimelineModel;
  readonly gate: GateGeometry;
  readonly reduced: boolean;
  readonly glass: boolean;
  readonly halo: CanvasTexture;
  readonly fonts: boolean;
  /** Phone strip: the readout already names the station, so the 3D labels stay off. */
  readonly compact: boolean;
}

/**
 * One employer as a station on the spine: a glass hex gate the path runs through, a core that is cold cyan until the
 * visitor arrives and then lights amber, role orbiters, and a label with the name and dates in mono.
 */
export function Station({ station, index, model, gate, reduced, glass, halo, fonts, compact }: StationProps) {
  const back = monthsBack(model, station.end);
  const { position, quaternion } = useMemo(() => {
    const p = pathPoint(back);
    const t = pathTangent(back);
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), t);
    return { position: p, quaternion: q };
  }, [back]);

  const root = useRef<Group>(null);
  const edgeMat = useRef<LineBasicMaterial>(null);
  const faceMat = useRef<MeshBasicMaterial>(null);
  const core = useRef<MeshBasicMaterial>(null);
  const wire = useRef<MeshBasicMaterial>(null);
  const haloSprite = useRef<Sprite>(null);
  const spin = useRef<Group>(null);
  const studs = useRef<(Mesh | null)[]>([]);
  const orbiters = useRef<(Mesh | null)[]>([]);
  const labelMat = useRef<MeshBasicMaterial>(null);
  const armed = useRef(true);
  const flashAt = useRef(-10);
  const tint = useMemo(() => new Color(), []);
  const camPos = useMemo(() => new Vector3(), []);

  const labelTexture = useMemo(() => {
    if (!fonts || compact) return null;
    return drawLabel(
      [
        { text: station.short.toUpperCase(), font: `600 104px ${SANS}`, color: '#eceef0', y: 0.5, tracking: 2 },
        { text: station.dates.toUpperCase(), font: `500 40px ${MONO}`, color: '#67e8f9', y: 0.86, tracking: 3 },
      ],
      1024,
      256,
    );
  }, [fonts, compact, station.short, station.dates]);
  useEffect(() => () => labelTexture?.dispose(), [labelTexture]);

  const haloMat = useMemo(
    () =>
      new SpriteMaterial({
        map: halo,
        color: CYAN,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [halo],
  );
  useEffect(() => () => haloMat.dispose(), [haloMat]);

  useFrame((state) => {
    const t = hstore.time;
    // Once the visitor has travelled past a station it folds away, so the foreground stays clear for the next one.
    const present = reduced ? 1 : 1 - smoothstep(0.3, 0.95, hstore.fs - index);
    if (root.current) {
      root.current.visible = present > 0.01;
      root.current.scale.setScalar(Math.max(present, 0.001));
    }
    const a = reduced ? 1 : smoothstep(1.05, 0.15, Math.abs(hstore.fs - index));
    if (!reduced) {
      if (a > 0.6 && armed.current) {
        armed.current = false;
        flashAt.current = t;
      } else if (a < 0.3) armed.current = true;
    }
    const flash = reduced ? 0 : Math.exp(-(t - flashAt.current) * 2.6);

    tint.copy(CYAN).lerp(AMBER, a);
    if (edgeMat.current) {
      edgeMat.current.color.copy(tint).multiplyScalar(1.1 + 1.0 * a + flash);
      edgeMat.current.opacity = 0.55 + 0.45 * a;
    }
    if (faceMat.current) {
      faceMat.current.color.copy(tint);
      faceMat.current.opacity = 0.03 + 0.07 * a + 0.12 * flash;
    }
    if (core.current) core.current.color.copy(tint).lerp(WHITE, 0.12 * a).multiplyScalar(1.1 + 1.3 * a + 0.8 * flash);
    if (wire.current) wire.current.color.copy(tint).multiplyScalar(1 + 0.9 * a);
    haloMat.color.copy(tint);
    haloMat.opacity = 0.12 + 0.3 * a + 0.25 * flash;
    if (haloSprite.current) {
      const s = 1.3 + 0.9 * a + 1.0 * flash;
      haloSprite.current.scale.set(s, s, 1);
    }
    if (spin.current) spin.current.rotation.z = reduced ? 0.3 : t * (0.12 + 0.55 * a);
    studs.current.forEach((m, i) => {
      const mat = m?.material as MeshBasicMaterial | undefined;
      if (!mat) return;
      const sweep = reduced ? 1 : 0.5 + 0.5 * Math.sin(t * 3.1 - i * 1.047);
      mat.color.copy(CYAN).lerp(AMBER, a * (0.35 + 0.65 * sweep)).multiplyScalar(0.9 + 1.5 * a * sweep);
    });
    orbiters.current.forEach((m, i) => {
      if (!m) return;
      const ang = (reduced ? 0.8 : t * (0.5 + 1.4 * a)) + i * 2.4;
      const r = 0.34 + i * 0.1;
      m.position.set(Math.cos(ang) * r, Math.sin(ang) * r, 0);
      const mat = m.material as MeshBasicMaterial;
      mat.color.copy(AMBER).multiplyScalar(0.7 + 1.7 * a);
    });
    if (labelMat.current) {
      const d = state.camera.position.distanceTo(camPos.copy(position));
      const near = smoothstep(6, 8, d);
      const far = smoothstep(18, 12.5, d);
      labelMat.current.opacity = reduced ? 1 : near * far * (0.06 + 0.94 * a);
    }
  });

  return (
    <group position={position} ref={root}>
      <group quaternion={quaternion}>
        <mesh geometry={gate.frame}>
          {glass ? (
            <meshPhysicalMaterial
              color="#0d1c22"
              metalness={0.35}
              roughness={0.16}
              transmission={0.5}
              thickness={0.6}
              ior={1.45}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={1.6}
              attenuationColor="#0e7490"
              attenuationDistance={1.5}
            />
          ) : (
            <meshStandardMaterial color="#0d1c22" metalness={0.5} roughness={0.25} transparent opacity={0.8} envMapIntensity={1.2} />
          )}
        </mesh>
        <lineSegments geometry={gate.edges}>
          <lineBasicMaterial ref={edgeMat} color="#22d3ee" transparent toneMapped={false} />
        </lineSegments>
        <mesh geometry={gate.face}>
          <meshBasicMaterial
            ref={faceMat}
            color="#22d3ee"
            transparent
            opacity={0.05}
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        {hexStuds.map(([x, y], i) => (
          <mesh
            key={i}
            position={[x, y, 0]}
            ref={(m) => {
              studs.current[i] = m;
            }}
          >
            <sphereGeometry args={[0.04, 10, 8]} />
            <meshBasicMaterial color="#22d3ee" toneMapped={false} />
          </mesh>
        ))}
        <group ref={spin}>
          <mesh>
            <torusGeometry args={[0.55, 0.008, 6, 6]} />
            <meshBasicMaterial color={[0.2, 0.95, 1.1]} transparent opacity={0.55} toneMapped={false} />
          </mesh>
        </group>
        <mesh>
          <icosahedronGeometry args={[0.2, 1]} />
          <meshBasicMaterial ref={wire} color="#22d3ee" wireframe transparent opacity={0.85} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.1, 20, 14]} />
          <meshBasicMaterial ref={core} color="#22d3ee" toneMapped={false} />
        </mesh>
        {station.roles.map((r, i) => (
          <mesh
            key={r.id}
            ref={(m) => {
              orbiters.current[i] = m;
            }}
          >
            <sphereGeometry args={[0.035, 10, 8]} />
            <meshBasicMaterial color="#f59e0b" toneMapped={false} />
          </mesh>
        ))}
        <sprite ref={haloSprite} material={haloMat} scale={[2, 2, 1]} />
      </group>
      <Billboard position={[-1.0, GATE_R + 0.4, 0]}>
        {labelTexture ? (
          <mesh>
            <planeGeometry args={[1.7, 0.425]} />
            <meshBasicMaterial ref={labelMat} map={labelTexture} color="#b4b4b4" transparent depthWrite={false} toneMapped={false} fog={false} />
          </mesh>
        ) : null}
      </Billboard>
    </group>
  );
}

interface FlareProps {
  readonly station: StationModel;
  readonly index: number;
  readonly model: TimelineModel;
  readonly reduced: boolean;
  readonly halo: CanvasTexture;
  readonly fonts: boolean;
  readonly compact: boolean;
}

/** The promotion moment on the spine: an amber diamond, shock rings, a vertical beam and a label that flares as the visitor arrives. */
export function Flare({ station, index, model, reduced, halo, fonts, compact }: FlareProps) {
  const promo = station.promotion;
  const back = promo ? monthsBack(model, promo.at) : 0;
  const { position, quaternion } = useMemo(() => {
    const p = pathPoint(back);
    return { position: p, quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), pathTangent(back)) };
  }, [back]);

  const root = useRef<Group>(null);
  const diamond = useRef<Mesh>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const beam = useRef<Mesh>(null);
  const haloSprite = useRef<Sprite>(null);
  const labelMat = useRef<MeshBasicMaterial>(null);
  const armed = useRef(true);
  const flashAt = useRef(-10);
  const camPos = useMemo(() => new Vector3(), []);

  const labelTexture = useMemo(() => {
    if (!fonts || !promo || compact) return null;
    return drawLabel(
      [
        { text: `↑ ${promo.label.toUpperCase()}`, font: `600 62px ${MONO}`, color: '#fbbf24', y: 0.42, tracking: 1, glow: true },
        { text: monthLabel(promo.at), font: `500 44px ${MONO}`, color: '#f59e0b', y: 0.82, tracking: 4, glow: true },
      ],
      1280,
      256,
    );
  }, [fonts, compact, promo]);
  useEffect(() => () => labelTexture?.dispose(), [labelTexture]);

  const haloMat = useMemo(
    () =>
      new SpriteMaterial({
        map: halo,
        color: AMBER,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [halo],
  );
  useEffect(() => () => haloMat.dispose(), [haloMat]);

  useFrame((state) => {
    const t = hstore.time;
    const present = reduced ? 1 : 1 - smoothstep(0.3, 0.95, hstore.fs - index);
    if (root.current) {
      root.current.visible = present > 0.01;
      root.current.scale.setScalar(Math.max(present, 0.001));
    }
    const a = reduced ? 1 : smoothstep(1.0, 0.2, Math.abs(hstore.fs - index));
    if (!reduced) {
      if (a > 0.55 && armed.current) {
        armed.current = false;
        flashAt.current = t;
      } else if (a < 0.25) armed.current = true;
    }
    const flash = reduced ? 0 : Math.exp(-(t - flashAt.current) * 1.8);
    const k = 0.22 + 0.78 * a;
    if (diamond.current) {
      diamond.current.rotation.y = reduced ? 0.6 : t * 1.2;
      const s = 0.12 + 0.12 * k + 0.1 * flash;
      diamond.current.scale.set(s, s * 1.5, s);
      (diamond.current.material as MeshBasicMaterial).color.copy(AMBER).multiplyScalar(0.9 + 1.4 * k + 1.2 * flash);
    }
    const ring = (m: Mesh | null, phase: number) => {
      if (!m) return;
      const mat = m.material as MeshBasicMaterial;
      if (reduced) {
        m.scale.setScalar(1 + phase * 0.9);
        mat.opacity = 0.35 - phase * 0.18;
        return;
      }
      const c = (t * 0.55 + phase) % 1;
      m.scale.setScalar(0.4 + c * 1.9 * (0.4 + 0.6 * k));
      mat.opacity = (1 - c) * (0.15 + 0.7 * k) + flash * 0.3 * (1 - c);
    };
    ring(ringA.current, 0);
    ring(ringB.current, reduced ? 1 : 0.5);
    if (beam.current) {
      const mat = beam.current.material as MeshBasicMaterial;
      mat.opacity = 0.08 + 0.3 * k + 0.25 * flash;
      beam.current.scale.y = 0.6 + 0.4 * k + 0.4 * flash;
    }
    haloMat.opacity = 0.15 + 0.35 * k + 0.3 * flash;
    if (haloSprite.current) {
      const s = 0.9 + 1.1 * k + 1.2 * flash;
      haloSprite.current.scale.set(s, s, 1);
    }
    if (labelMat.current) {
      const d = state.camera.position.distanceTo(camPos.copy(position));
      labelMat.current.opacity = reduced ? 1 : smoothstep(5, 8, d) * smoothstep(26, 10, d) * (0.4 + 0.6 * k);
    }
  });

  if (!promo) return null;
  return (
    <group position={position} ref={root}>
      <group quaternion={quaternion}>
        <mesh ref={ringA}>
          <torusGeometry args={[0.3, 0.012, 6, 40]} />
          <meshBasicMaterial color={[1.4, 0.85, 0.15]} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh ref={ringB}>
          <torusGeometry args={[0.3, 0.012, 6, 40]} />
          <meshBasicMaterial color={[1.4, 0.85, 0.15]} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={diamond}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#f59e0b" toneMapped={false} />
      </mesh>
      <mesh ref={beam} position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.008, 0.035, 3.2, 8, 1, true]} />
        <meshBasicMaterial
          color={[1.0, 0.55, 0.08]}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <sprite ref={haloSprite} material={haloMat} scale={[2, 2, 1]} />
      <Billboard position={[0.9, 1.9, 0]}>
        {labelTexture ? (
          <mesh>
            <planeGeometry args={[2.5, 0.5]} />
            <meshBasicMaterial ref={labelMat} map={labelTexture} transparent depthWrite={false} toneMapped={false} fog={false} />
          </mesh>
        ) : null}
      </Billboard>
    </group>
  );
}
