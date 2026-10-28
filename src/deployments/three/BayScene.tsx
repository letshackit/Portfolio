import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Sparkles } from '@react-three/drei';
import { AdditiveBlending, Color, DoubleSide, InstancedMesh, MathUtils, Object3D, type Group, type MeshPhysicalMaterial, type Points, type ShaderMaterial } from 'three';
import type { Quality } from '../../hero/v2/stage/quality';
import { BusLoop, Floor, Gyro, NodeView, PlateView, RouteView, Waves, type NodeHandlers, type NodeRefs, type RouteRefs } from './parts';
import { ROUTE_STYLE, TONES } from './style';
import { createPacketSim } from './packets';
import { centreOf, fitDistance, type Highlight, type SceneNode, type SceneSpec } from './spec';

const AMBER = new Color('#f59e0b');
const WHITE = new Color('#f2fdff');
const AMBER_HOT = new Color('#f59e0b').multiplyScalar(2.6);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const FOV = 30;
const TRAIL = 3;

export interface BaySceneProps {
  readonly spec: SceneSpec;
  readonly lit: Highlight | null;
  /** Cluster open right now (HRMS), or null. */
  readonly open: string | null;
  /** 0..1 assembly progress, written by a ScrollTrigger outside React. */
  readonly progress: { current: number };
  readonly frameEl: HTMLElement;
  readonly pointerFine: boolean;
  readonly reduced: boolean;
  readonly q: Quality;
  readonly packets: number;
  readonly handlers: NodeHandlers;
  readonly onReady: () => void;
}

interface NodeState {
  glow: number;
  fade: number;
  pulse: number;
}

/**
 * drei's Sparkles shader writes a slightly negative alpha in the corners of each point sprite, which on a half-float
 * buffer drew a dark square around each. Clamp it once the material exists (same fix as the hero stage).
 */
function Dust({ count, scale, position }: { count: number; scale: [number, number, number]; position: [number, number, number] }) {
  const ref = useRef<Points>(null);
  useLayoutEffect(() => {
    const mat = ref.current?.material as ShaderMaterial | undefined;
    if (!mat || !mat.fragmentShader.includes('strength * vOpacity')) return;
    mat.fragmentShader = mat.fragmentShader.replace('strength * vOpacity', 'max(strength, 0.0) * vOpacity');
    mat.needsUpdate = true;
  }, []);
  return <Sparkles ref={ref} count={count} scale={scale} position={position} size={2.4} speed={0.25} opacity={0.6} color="#67e8f9" noise={0.5} />;
}

/** Camera distance that fits the extent at the current canvas shape, with a small dolly-in as the system assembles. */
function Rig({ spec, progress, reduced }: { spec: SceneSpec; progress: { current: number }; reduced: boolean }) {
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const base = useMemo(() => fitDistance(spec.extent, spec.rot, FOV, size.width / Math.max(1, size.height), 0.92), [spec, size.width, size.height]);
  useLayoutEffect(() => {
    camera.position.set(0, 0, base);
    camera.lookAt(0, 0, 0);
    if (scene.fog) {
      (scene.fog as { near: number; far: number }).near = base * 0.9;
      (scene.fog as { near: number; far: number }).far = base * 2.6;
    }
  }, [base, camera, scene]);
  useFrame(() => {
    const p = reduced ? 1 : progress.current;
    camera.position.z = base * (1 + 0.14 * (1 - easeOut(clamp01(p))));
  });
  return null;
}

export function BayScene({ spec, lit, open, progress, frameEl, pointerFine, reduced, q, packets, handlers, onReady }: BaySceneProps) {
  const root = useRef<Group>(null);
  const gl = useThree((s) => s.gl);
  const nodeRefs = useRef(new Map<string, NodeRefs>());
  const nodeState = useRef(new Map<string, NodeState>());
  const routeRefs = useRef(new Map<string, RouteRefs>());
  const routeState = useRef(new Map<string, number>());
  const openAmt = useRef(new Map<string, number>());
  const plateMats = useRef(new Map<string, { opacity: number }>());
  const shown = useRef(reduced ? 1 : 0);
  const floorOp = useRef(0);
  const busOp = useRef(0);
  const tilt = useRef({ tx: 0, ty: 0, x: 0, y: 0 });
  const ready = useRef(false);
  const litRef = useRef<Highlight | null>(lit);
  const openRef = useRef<string | null>(open);
  const dots = useRef<InstancedMesh>(null);
  const halos = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const scratch = useMemo(() => [0, 0, 0] as [number, number, number], []);
  const centre = useMemo(() => centreOf(spec.extent), [spec]);

  const sim = useMemo(() => {
    const s = createPacketSim(spec.routes, packets, spec.startIds);
    // A still scene (reduced motion) is a frozen mid-flight composition, not an empty one.
    if (reduced) for (let i = 0; i < 90; i += 1) s.step(0.08, () => undefined);
    return s;
  }, [spec, packets, reduced]);

  useEffect(() => {
    litRef.current = lit;
  }, [lit]);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const register = useCallback((id: string, r: NodeRefs) => {
    nodeRefs.current.set(id, r);
    if (!nodeState.current.has(id)) nodeState.current.set(id, { glow: 0, fade: 0, pulse: 0 });
  }, []);
  const bind = useCallback((id: string, line: RouteRefs['line']) => {
    routeRefs.current.set(id, { line });
    if (!routeState.current.has(id)) routeState.current.set(id, 0);
  }, []);

  useEffect(() => {
    if (!pointerFine || reduced) return;
    const move = (e: PointerEvent) => {
      const r = frameEl.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      tilt.current.ty = MathUtils.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1) * 0.07;
      tilt.current.tx = MathUtils.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1) * 0.04;
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
  }, [frameEl, pointerFine, reduced]);

  // Still scenes only render on demand: ask for frames when what is lit or open changes.
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!reduced) return;
    invalidate();
  }, [lit, open, reduced, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement;
    return () => {
      canvas.style.cursor = '';
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.12);
    const rate = (r: number) => (reduced ? 1000 : r);
    shown.current = reduced ? 1 : MathUtils.damp(shown.current, progress.current, 4.2, dt);
    const p = shown.current;
    const t = performance.now() / 1000;

    if (root.current) {
      tilt.current.x = MathUtils.damp(tilt.current.x, tilt.current.tx, 3, dt);
      tilt.current.y = MathUtils.damp(tilt.current.y, tilt.current.ty, 3, dt);
      const sway = reduced ? 0 : Math.sin(t * 0.25) * 0.022;
      root.current.rotation.set(spec.rot.x + tilt.current.x, spec.rot.y + tilt.current.y + sway, 0);
    }

    const active = litRef.current;
    const openId = openRef.current;
    for (const id of spec.clusters) {
      const cur = openAmt.current.get(id) ?? 0;
      openAmt.current.set(id, MathUtils.damp(cur, openId === id ? 1 : 0, rate(5), dt));
    }

    spec.nodes.forEach((n: SceneNode, i) => {
      const r = nodeRefs.current.get(n.id);
      const s = nodeState.current.get(n.id);
      if (!r || !s) return;
      const o = n.parent ? (openAmt.current.get(n.parent) ?? 0) : 0;
      const oe = o * o * (3 - 2 * o);
      const local = clamp01((p - n.order * 0.6) / 0.4);
      const e = easeOut(local);
      const inv = 1 - e;
      const bob = reduced ? 0 : Math.sin(t * 0.7 + i * 1.7) * 0.02 * e;
      const px = n.open ? n.pos[0] + (n.open.pos[0] - n.pos[0]) * oe : n.pos[0];
      const py = n.open ? n.pos[1] + (n.open.pos[1] - n.pos[1]) * oe : n.pos[1];
      const pz = n.open ? n.pos[2] + (n.open.pos[2] - n.pos[2]) * oe : n.pos[2];
      r.group.position.set(px + (n.scatter[0] - px) * inv, py + (n.scatter[1] - py) * inv + bob, pz + (n.scatter[2] - pz) * inv);
      r.group.rotation.set(n.spin[0] * inv, n.spin[1] * inv, n.spin[2] * inv);
      r.group.scale.setScalar(0.5 + 0.5 * e);
      if (n.shape !== 'ring') {
        const sx = n.open ? n.size[0] + (n.open.size[0] - n.size[0]) * oe : n.size[0];
        const sy = n.open ? n.size[1] + (n.open.size[1] - n.size[1]) * oe : n.size[1];
        const sz = n.open ? n.size[2] + (n.open.size[2] - n.size[2]) * oe : n.size[2];
        r.body.scale.set(sx, sy, sz);
      }

      const isOpenCluster = openId === n.id;
      const inLit = active ? active.nodes.has(n.id) : null;
      const on = inLit === true || (inLit === null && (isOpenCluster || (n.parent !== undefined && openId === n.parent && o > 0.5)));
      const dim = inLit === false;
      const targetGlow = on ? (isOpenCluster ? 0.7 : 1) : dim ? 0 : n.shape === 'shell' ? 0.2 : 0.35;
      const targetFade = dim ? 0.26 : 1;
      s.glow = MathUtils.damp(s.glow, targetGlow, rate(9), dt);
      s.fade = MathUtils.damp(s.fade, targetFade, rate(9), dt);
      s.pulse = Math.max(0, s.pulse - dt * 2.6);

      const alive = e * s.fade;
      const tone = TONES[n.tone];
      const mat = r.body_mat;
      if (n.shape === 'ring') {
        mat.opacity = (0.16 + 0.22 * s.glow) * alive + s.pulse * 0.1;
      } else {
        const base = n.shape === 'shell' ? 0.045 : n.ghost ? 0.2 : n.kind === 'module' ? 0.72 : n.shape === 'oct' ? 0.5 : 0.56;
        mat.opacity = base * alive + s.pulse * 0.06;
        const phys = mat as MeshPhysicalMaterial;
        phys.emissive.copy(tone.emissive).lerp(AMBER, Math.min(1, s.pulse) * 0.45);
        phys.emissiveIntensity = (n.tone === 'core' ? 0.14 : 0.05) + s.glow * 0.5 * (1 - s.pulse * 0.6) + s.pulse * 0.12;
      }
      if (r.edge_mat) {
        r.edge_mat.opacity = (0.35 + 0.65 * s.glow) * alive * (n.ghost ? 0.85 : 1);
        r.edge_mat.color.copy(on ? WHITE : s.pulse > 0.35 ? AMBER : tone.edge);
      }
      if (r.label_mat) {
        const show = n.kind === 'module' ? MathUtils.smoothstep(o, 0.55, 1) : 1;
        r.label_mat.opacity = alive * (dim ? 0.7 : 1) * show;
      }
    });

    const arrive = MathUtils.smoothstep(p, 0.62, 0.98);
    for (const route of spec.routes) {
      const r = routeRefs.current.get(route.id);
      const cur = routeState.current.get(route.id) ?? 0;
      if (!r?.line) continue;
      const style = ROUTE_STYLE[route.kind];
      const on = active?.edges.has(route.id) === true;
      const base = route.backplane ? 0.2 : style.base;
      const target = (active ? (on ? 1 : 0.06) : base) * arrive;
      const next = MathUtils.damp(cur, target, rate(10), dt);
      routeState.current.set(route.id, next);
      const m = r.line.material;
      m.opacity = next;
      m.color.set(on ? WHITE : style.color);
      m.linewidth = on ? 2.6 : route.backplane ? 1 : style.width;
      r.line.visible = next > 0.01;
    }

    for (const [id, m] of plateMats.current) {
      const k = MathUtils.smoothstep(p, 0.05, 0.6);
      m.opacity = id.endsWith(':fill') ? 0.05 * k : id.endsWith(':line') ? 0.3 * k : 0.9 * k;
    }
    floorOp.current = MathUtils.smoothstep(p, 0.1, 0.9);
    busOp.current = arrive;

    const flowing = p > 0.9;
    if (flowing && !reduced && packets > 0) {
      sim.step(dt, (id) => {
        const st = nodeState.current.get(id);
        if (st) st.pulse = 1;
      });
    }
    if (dots.current && halos.current && (!reduced || p >= 1)) {
      for (let i = 0; i < sim.packets.length; i += 1) {
        const pk = sim.packets[i];
        const visible = flowing && pk !== undefined && pk.wait <= 0;
        for (let k = 0; k <= TRAIL; k += 1) {
          sim.positionOf(i, k * 0.16, scratch);
          dummy.position.set(scratch[0], scratch[1], scratch[2]);
          dummy.scale.setScalar(visible ? 1 - k * 0.22 : 0);
          dummy.updateMatrix();
          dots.current.setMatrixAt(i * (TRAIL + 1) + k, dummy.matrix);
        }
        sim.positionOf(i, 0, scratch);
        dummy.position.set(scratch[0], scratch[1], scratch[2]);
        dummy.scale.setScalar(visible ? 1.9 : 0);
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

  const floorY = spec.extent.minY - 1.5;
  const dust = Math.round(48 * q.sparkles);
  const w = spec.extent.maxX - spec.extent.minX;
  const h = spec.extent.maxY - spec.extent.minY;
  const nodeHandlers = useMemo<NodeHandlers>(
    () => ({
      onOver: (id) => {
        gl.domElement.style.cursor = 'pointer';
        handlers.onOver(id);
      },
      onOut: (id) => {
        gl.domElement.style.cursor = '';
        handlers.onOut(id);
      },
      onClick: handlers.onClick,
    }),
    [gl, handlers],
  );

  return (
    <>
      <Rig spec={spec} progress={progress} reduced={reduced} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 6, 8]} intensity={1.5} color="#dff9ff" />
      <pointLight position={[-12, 3, 6]} intensity={30} color="#22d3ee" distance={40} />
      <pointLight position={[12, -3, 6]} intensity={20} color="#f59e0b" distance={40} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#22d3ee" position={[-8, 3, 4]} scale={[6, 10, 1]} rotation-y={Math.PI / 3} />
        <Lightformer form="rect" intensity={1.6} color="#f59e0b" position={[9, -2, 3]} scale={[3, 6, 1]} rotation-y={-Math.PI / 3} />
        <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[0, 8, 2]} scale={[12, 2, 1]} rotation-x={Math.PI / 2} />
      </Environment>
      <group ref={root}>
        <group position={[-centre[0], -centre[1], -centre[2]]}>
          <Floor y={floorY} centre={[centre[0], centre[2]]} opacity={floorOp} />
          {dust > 0 ? <Dust count={dust} scale={[w + 6, h + 3, 10]} position={[centre[0], centre[1], centre[2]]} /> : null}
          {spec.plates.map((pl) => (
            <PlateView key={pl.id} plate={pl} mat={plateMats} />
          ))}
          {spec.nodes.map((n) => (
            <NodeView key={n.id} node={n} register={register} handlers={nodeHandlers} />
          ))}
          {spec.routes.map((r) => (
            <RouteView key={r.id} route={r} bind={bind} />
          ))}
          {spec.decor.includes('orbits') ? <Gyro spec={spec} frozen={reduced} /> : null}
          {spec.decor.includes('bus-loop') ? <BusLoop spec={spec} frozen={reduced} opacity={busOp} /> : null}
          {spec.decor.includes('wave') ? <Waves spec={spec} frozen={reduced} opacity={busOp} /> : null}
          <instancedMesh ref={dots} args={[undefined, undefined, Math.max(1, packets * (TRAIL + 1))]} frustumCulled={false} raycast={() => null}>
            <sphereGeometry args={[0.062, 12, 12]} />
            <meshBasicMaterial color={AMBER_HOT} toneMapped={false} />
          </instancedMesh>
          <instancedMesh ref={halos} args={[undefined, undefined, Math.max(1, packets)]} frustumCulled={false} raycast={() => null}>
            <sphereGeometry args={[0.062, 10, 10]} />
            <meshBasicMaterial color={AMBER} transparent opacity={0.1} blending={AdditiveBlending} depthWrite={false} toneMapped={false} side={DoubleSide} />
          </instancedMesh>
        </group>
      </group>
    </>
  );
}
