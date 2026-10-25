import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line, Sparkles } from '@react-three/drei';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  InstancedMesh,
  LineSegments,
  MathUtils,
  Object3D,
  type Group,
  type Mesh,
  type MeshPhysicalMaterial,
  type CanvasTexture,
  type LineBasicMaterial,
  type MeshBasicMaterial,
  type LineDashedMaterial,
} from 'three';
import type { Highlight } from '../../lib/archLayout';
import { createWatchdog } from '../../hero/three/FrameWatchdog';
import type { Block3D, Layout3D, Route3D } from './layout3d';
import { fontsReady, makeLabelTexture } from './labelTexture';
import { createPacketSim } from './packets3d';
import { BASE_ROT } from './projection';

const CYAN = new Color('#22d3ee');
const CYAN_SOFT = new Color('#67e8f9');
const AMBER = new Color('#f59e0b');
const INK = new Color('#0a1318');
const WHITE = new Color('#e8fbff');
const DIM = new Color('#1b4a57');

export interface ArchSceneProps {
  readonly layout: Layout3D;
  readonly lit: Highlight | null;
  /** 0..1 assembly progress, written by the ScrollTrigger in the stage (not React state: it changes every scroll tick). */
  readonly progress: { current: number };
  readonly frameEl: HTMLElement;
  readonly pointerFine: boolean;
  readonly onReady: () => void;
  readonly onFail: () => void;
  readonly onDegrade: () => void;
  readonly degraded: boolean;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const damp = MathUtils.damp;

type NodeState = 'idle' | 'on' | 'dim';

function stateOf(lit: Highlight | null, id: string): NodeState {
  if (!lit) return 'idle';
  return lit.nodes.has(id) ? 'on' : 'dim';
}

interface BlockRefs {
  readonly group: Group;
  readonly mesh: Mesh;
  readonly edge: LineSegments;
  readonly label: { readonly current: MeshBasicMaterial | null };
}

/** The slice of drei's Line (a Line2 with a LineMaterial) that the frame loop writes. */
interface LineLike {
  visible: boolean;
  material: { opacity: number; color: Color; linewidth: number };
}

/** Shared unit geometry, scaled per block: 23 draw calls share two buffers. */
const UNIT = new BoxGeometry(1, 1, 1);
const UNIT_EDGES = new EdgesGeometry(UNIT);

function BlockView({
  block,
  register,
}: {
  readonly block: Block3D;
  readonly register: (id: string, r: Partial<BlockRefs>) => void;
}) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const edge = useRef<LineSegments>(null);
  const labelMat = useRef<MeshBasicMaterial>(null);
  const [tex, setTex] = useState<CanvasTexture | null>(null);
  const phase2 = block.kind === 'integration-phase2';
  const big = block.kind === 'frontend' || block.kind === 'gateway';

  useLayoutEffect(() => {
    if (group.current && mesh.current && edge.current) {
      if (phase2) edge.current.computeLineDistances();
      register(block.id, { group: group.current, mesh: mesh.current, edge: edge.current, label: labelMat });
    }
  }, [block.id, phase2, register]);

  const fontSize = big ? 0.24 : block.kind === 'integration' ? 0.17 : 0.155;
  useEffect(() => {
    let live = true;
    let made: CanvasTexture | null = null;
    void fontsReady().then(() => {
      if (!live) return;
      made = makeLabelTexture({
        text: block.label,
        width: block.size[0],
        height: block.size[1],
        fontSize,
        color: big ? '#ffffff' : '#d4f4fb',
      });
      setTex(made);
    });
    return () => {
      live = false;
      made?.dispose();
    };
  }, [block.label, block.size, fontSize, big]);
  return (
    <group ref={group} position={block.scatter as [number, number, number]}>
      <mesh ref={mesh} scale={block.size as [number, number, number]}>
        <primitive object={UNIT} attach="geometry" />
        <meshPhysicalMaterial
          color={INK}
          transparent
          opacity={0.6}
          roughness={0.18}
          metalness={0.25}
          clearcoat={1}
          clearcoatRoughness={0.2}
          emissive={CYAN}
          emissiveIntensity={0.05}
          depthWrite={false}
        />
      </mesh>
      <lineSegments ref={edge} scale={block.size as [number, number, number]} geometry={UNIT_EDGES}>
        {phase2 ? (
          <lineDashedMaterial color={CYAN} transparent dashSize={0.07} gapSize={0.05} scale={1 / Math.max(block.size[0], 0.01)} />
        ) : (
          <lineBasicMaterial color={CYAN} transparent />
        )}
      </lineSegments>
      {tex ? (
        <mesh position={[0, 0, block.size[2] / 2 + 0.012]} scale={[block.size[0], block.size[1], 1]} renderOrder={2}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial ref={labelMat} map={tex} transparent toneMapped={false} depthWrite={false} opacity={0} />
        </mesh>
      ) : null}
    </group>
  );
}

interface RouteRefs {
  line: LineLike | null;
}

function RouteView({ route, bind }: { readonly route: Route3D; readonly bind: (id: string, line: LineLike | null) => void }) {
  const phase2 = route.kind === 'phase2';
  return (
    <Line
      ref={(l) => bind(route.id, l as unknown as LineLike | null)}
      points={route.points as unknown as [number, number, number][]}
      color={phase2 ? '#0891b2' : '#22d3ee'}
      lineWidth={route.backplane ? 1 : 1.6}
      transparent
      opacity={0}
      depthWrite={false}
      dashed={phase2 || route.kind === 'event'}
      dashSize={phase2 ? 0.18 : 0.06}
      gapSize={phase2 ? 0.12 : 0.1}
    />
  );
}

export function ArchScene({ layout, lit, progress, frameEl, pointerFine, onReady, onFail, onDegrade, degraded }: ArchSceneProps) {
  const root = useRef<Group>(null);
  const grid = useRef<{ material: LineBasicMaterial } | null>(null);
  const gl = useThree((s) => s.gl);
  const blockRefs = useRef(new Map<string, Partial<BlockRefs>>());
  const routeRefs = useRef(new Map<string, RouteRefs>());
  const blockState = useRef(new Map<string, { glow: number; fade: number; pulse: number }>());
  const routeState = useRef(new Map<string, number>());
  const shown = useRef(0);
  const tilt = useRef({ tx: 0, ty: 0, x: 0, y: 0 });
  const ready = useRef(false);
  const litRef = useRef<Highlight | null>(lit);
  const dummy = useMemo(() => new Object3D(), []);
  const packetCount = degraded ? 7 : 14;
  const sim = useMemo(() => createPacketSim(layout.routes, packetCount, 'frontend'), [layout.routes, packetCount]);
  const dots = useRef<InstancedMesh>(null);
  const halos = useRef<InstancedMesh>(null);
  const scratch = useMemo(() => [0, 0, 0] as [number, number, number], []);
  const watchdog = useMemo(() => createWatchdog({ onDegrade, onFail }), [onDegrade, onFail]);

  useEffect(() => {
    litRef.current = lit;
  }, [lit]);

  const register = useMemo(
    () => (id: string, r: Partial<BlockRefs>) => {
      blockRefs.current.set(id, r);
      if (!blockState.current.has(id)) blockState.current.set(id, { glow: 0, fade: 0, pulse: 0 });
    },
    [],
  );
  const bind = useMemo(
    () => (id: string, line: LineLike | null) => {
      routeRefs.current.set(id, { line });
      if (!routeState.current.has(id)) routeState.current.set(id, 0);
    },
    [],
  );

  // Cursor parallax from the frame (the canvas itself takes no pointer events).
  useEffect(() => {
    if (!pointerFine) return;
    const move = (e: PointerEvent) => {
      const r = frameEl.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const px = MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      const py = MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      tilt.current.ty = px * 0.022;
      tilt.current.tx = py * 0.012;
    };
    const leave = () => {
      tilt.current.tx = 0;
      tilt.current.ty = 0;
    };
    frameEl.addEventListener('pointermove', move);
    frameEl.addEventListener('pointerleave', leave);
    return () => {
      frameEl.removeEventListener('pointermove', move);
      frameEl.removeEventListener('pointerleave', leave);
    };
  }, [frameEl, pointerFine]);

  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onFail();
    };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onFail]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.12);
    watchdog.tick(rawDt);
    shown.current = damp(shown.current, progress.current, 4.2, dt);
    const p = shown.current;
    const t = performance.now() / 1000;

    if (root.current) {
      tilt.current.x = damp(tilt.current.x, tilt.current.tx, 3, dt);
      tilt.current.y = damp(tilt.current.y, tilt.current.ty, 3, dt);
      root.current.rotation.set(BASE_ROT.x + tilt.current.x, BASE_ROT.y + tilt.current.y, 0);
    }

    const active = litRef.current;
    layout.blocks.forEach((b, i) => {
      const r = blockRefs.current.get(b.id);
      const s = blockState.current.get(b.id);
      if (!r || !r.group || !r.mesh || !r.edge || !s) return;
      const local = clamp01((p - b.order * 0.55) / 0.45);
      const e = easeOut(local);
      const inv = 1 - e;
      const bob = Math.sin(t * 0.7 + i * 1.7) * 0.022 * e;
      r.group.position.set(
        b.pos[0] + (b.scatter[0] - b.pos[0]) * inv,
        b.pos[1] + (b.scatter[1] - b.pos[1]) * inv + bob,
        b.pos[2] + (b.scatter[2] - b.pos[2]) * inv,
      );
      r.group.rotation.set(b.spin[0] * inv, b.spin[1] * inv, b.spin[2] * inv);
      r.group.scale.setScalar(0.55 + 0.45 * e);

      const state = stateOf(active, b.id);
      const targetGlow = state === 'on' ? 1 : state === 'dim' ? 0 : 0.35;
      const targetFade = state === 'dim' ? 0.28 : 1;
      s.glow = damp(s.glow, targetGlow, 9, dt);
      s.fade = damp(s.fade, targetFade, 9, dt);
      s.pulse = Math.max(0, s.pulse - dt * 2.6);

      const alive = e * s.fade;
      const mat = r.mesh.material as MeshPhysicalMaterial;
      mat.opacity = (b.kind === 'integration-phase2' ? 0.25 : 0.55) * alive + s.pulse * 0.06;
      mat.emissive.copy(s.pulse > 0.25 ? AMBER : CYAN);
      mat.emissiveIntensity = 0.04 + s.glow * 0.5 + s.pulse * 0.1;
      const em = r.edge.material as LineBasicMaterial | LineDashedMaterial;
      em.opacity = (0.35 + 0.65 * s.glow) * alive;
      em.color.copy(state === 'on' ? WHITE : s.pulse > 0.35 ? AMBER : b.kind === 'integration' ? CYAN_SOFT : CYAN);
      if (r.label?.current) r.label.current.opacity = alive * (state === 'dim' ? 0.7 : 1);
    });

    const arrive = MathUtils.smoothstep(p, 0.62, 0.98);
    layout.routes.forEach((route) => {
      const r = routeRefs.current.get(route.id);
      const cur = routeState.current.get(route.id) ?? 0;
      if (!r?.line) return;
      const on = active?.edges.has(route.id) || (active?.bus && route.backplane);
      const target = (active ? (on ? 1 : 0.07) : route.backplane ? 0.2 : route.kind === 'phase2' ? 0.4 : 0.55) * arrive;
      const next = damp(cur, target, 10, dt);
      routeState.current.set(route.id, next);
      const m = r.line.material;
      m.opacity = next;
      m.color.copy(on ? WHITE : route.kind === 'phase2' ? DIM : CYAN);
      m.linewidth = on ? 2.4 : route.backplane ? 1 : 1.6;
      r.line.visible = next > 0.01;
    });

    if (grid.current) grid.current.material.opacity = 0.13 * MathUtils.smoothstep(p, 0.1, 0.9);

    const flowing = p > 0.9;
    if (flowing) {
      sim.step(dt, (id) => {
        const s = blockState.current.get(id);
        if (s) s.pulse = 1;
      });
    }
    if (dots.current && halos.current) {
      for (let i = 0; i < sim.packets.length; i += 1) {
        const pk = sim.packets[i];
        const visible = flowing && pk !== undefined && pk.wait <= 0;
        sim.positionOf(i, scratch);
        const k = visible ? 1 : 0;
        dummy.position.set(scratch[0], scratch[1], scratch[2]);
        dummy.scale.setScalar(k);
        dummy.updateMatrix();
        dots.current.setMatrixAt(i, dummy.matrix);
        dummy.scale.setScalar(k * 2.5);
        dummy.updateMatrix();
        halos.current.setMatrixAt(i, dummy.matrix);
      }
      dots.current.instanceMatrix.needsUpdate = true;
      halos.current.instanceMatrix.needsUpdate = true;
    }

    if (!ready.current) {
      ready.current = true;
      onReady();
    }
  });

  const gridY = layout.extent.cy - layout.extent.h / 2 - 1.1;
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 6, 8]} intensity={1.6} color="#dff9ff" />
      <pointLight position={[-9, 2, 5]} intensity={26} color="#22d3ee" distance={30} />
      <pointLight position={[9, -3, 5]} intensity={18} color="#f59e0b" distance={30} />
      <group ref={root}>
        <group position={[0, -layout.extent.cy, 0]}>
          <gridHelper
            ref={(g) => {
              grid.current = g as unknown as { material: LineBasicMaterial } | null;
              if (g) {
                const m = g.material as LineBasicMaterial;
                m.transparent = true;
                m.opacity = 0;
                m.depthWrite = false;
              }
            }}
            args={[34, 34, '#22d3ee', '#22d3ee']}
            position={[0, gridY, -2]}
          />
          {degraded ? null : <Sparkles count={46} scale={[17, 8, 7]} size={2.2} speed={0.25} opacity={0.55} color="#67e8f9" position={[0, 0, 0]} />}
            {layout.blocks.map((b) => (
              <BlockView key={b.id} block={b} register={register} />
            ))}
            {layout.routes.map((r) => (
              <RouteView key={r.id} route={r} bind={bind} />
            ))}
          <instancedMesh ref={dots} args={[undefined, undefined, packetCount]} frustumCulled={false}>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshBasicMaterial color={AMBER} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={halos} args={[undefined, undefined, packetCount]} frustumCulled={false}>
            <sphereGeometry args={[0.065, 10, 10]} />
            <meshBasicMaterial color={AMBER} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} toneMapped={false} side={DoubleSide} />
          </instancedMesh>
        </group>
      </group>
    </>
  );
}
