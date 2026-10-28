import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { MathUtils, type PerspectiveCamera } from 'three';
import type { BadgeSpec } from '../slots';
import type { VaultStore } from '../vaultStore';
import { Badge } from './Badge';
import { GridWall, Motes } from './Backdrop';
import { Effects } from './Effects';
import { createKit } from './kit';
import { dprFor, startTier, stepDown, TIERS, type Tier } from './quality';

export interface CredentialsStageProps {
  readonly specs: readonly BadgeSpec[];
  readonly store: VaultStore;
  /** Off screen or tab hidden: stop rendering altogether. */
  readonly paused: boolean;
  /** Reduced motion: still, complete badges. Frames are drawn on demand, nothing moves. */
  readonly reduced: boolean;
  /** Hold this tier and never adapt (QA and screenshots); null adapts. */
  readonly pin: Tier | null;
  /** The badges are placed and two frames have rendered. */
  readonly onReady: () => void;
  /** The GL context was lost: the page keeps its CSS badges. */
  readonly onLost: () => void;
}

const FOV = 22;
/** How long after the first frame the performance monitor stays out of the way: shader compiles are not slow frames. */
const MONITOR_DELAY_MS = 2500;
/** Slots are re-read this often (in frames), in case fonts or reveals moved the layout. */
const MEASURE_EVERY = 20;
/** Camera drift with the cursor, in px: enough for the grid wall to slide behind the glass. */
const PARALLAX = 16;

/**
 * One camera for the whole vault. The z = 0 plane maps 1 world unit to 1 CSS px (x right, y down as -y), so a badge is
 * placed by its slot's pixel rectangle and the layout stays the DOM's job.
 */
function Rig({ store, reduced, tier }: { store: VaultStore; reduced: boolean; tier: Tier }) {
  const { camera, size, setDpr, invalidate } = useThree();
  const frame = useRef(0);
  const base = useRef({ x: 0, y: 0, z: 1 });
  useLayoutEffect(() => {
    const cam = camera as PerspectiveCamera;
    cam.fov = FOV;
    cam.near = 100;
    cam.far = 9000;
    const z = size.height / 2 / Math.tan(MathUtils.degToRad(FOV / 2));
    base.current = { x: size.width / 2, y: -size.height / 2, z };
    cam.position.set(base.current.x, base.current.y, z);
    cam.rotation.set(0, 0, 0);
    cam.updateProjectionMatrix();
    store.measure();
    invalidate();
  }, [camera, size, store, invalidate]);
  useEffect(() => {
    setDpr(dprFor(tier, window.devicePixelRatio, size.width, size.height));
  }, [tier, size, setDpr]);
  useFrame((_, rawDt) => {
    if (frame.current % MEASURE_EVERY === 0) store.measure();
    frame.current += 1;
    if (reduced) return;
    const cam = camera as PerspectiveCamera;
    const b = base.current;
    const p = store.pointer;
    const nx = MathUtils.clamp(p.x / size.width - 0.5, -0.5, 0.5);
    const ny = MathUtils.clamp(p.y / size.height - 0.5, -0.5, 0.5);
    const dt = Math.min(rawDt, 0.05);
    cam.position.x = MathUtils.damp(cam.position.x, b.x + nx * PARALLAX * 2, 3, dt);
    cam.position.y = MathUtils.damp(cam.position.y, b.y - ny * PARALLAX * 2, 3, dt);
  });
  return null;
}

/** Calls `onReady` once, after the badges have been placed and two frames have been drawn. */
function ReadyGate({ store, onReady }: { store: VaultStore; onReady: () => void }) {
  const frames = useRef(0);
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current || store.rects.size === 0) return;
    frames.current += 1;
    if (frames.current < 3) return;
    fired.current = true;
    onReady();
  });
  return null;
}

/** Under reduced motion the loop is on demand: draw enough frames for the env map and the glass to settle, then stop. */
function StillFrames() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      invalidate();
      n += 1;
      if (n > 16) window.clearInterval(id);
    }, 140);
    return () => window.clearInterval(id);
  }, [invalidate]);
  return null;
}

function World({ specs, store, tier, reduced, onReady }: { specs: readonly BadgeSpec[]; store: VaultStore; tier: Tier; reduced: boolean; onReady: () => void }) {
  const q = TIERS[tier];
  const kit = useMemo(() => createKit(q), [q]);
  useEffect(() => () => kit.dispose(), [kit]);
  return (
    <>
      <color attach="background" args={['#07080a']} />
      <Rig store={store} reduced={reduced} tier={tier} />
      <GridWall store={store} still={reduced} />
      <Environment resolution={256} frames={1}>
        {/* Studio strips the glass can pick up: cyan from the left, a warm key from the right, a soft box above and in front. */}
        <Lightformer form="rect" intensity={5} color="#22d3ee" position={[-7, 1, 2]} scale={[6, 12, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={3.2} color="#f59e0b" position={[7, 3, 3]} scale={[4, 9, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={6} color="#ffffff" position={[0, 7, 1]} scale={[14, 3, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={3} color="#bff6ff" position={[-3.5, 2.5, 8]} scale={[4, 2, 1]} rotation-y={Math.PI} />
        <Lightformer form="rect" intensity={7} color="#ffffff" position={[-3.6, 0, 5]} scale={[0.5, 9, 1]} rotation-y={Math.PI * 0.8} />
        <Lightformer form="rect" intensity={7} color="#ffffff" position={[3.6, 0, 5]} scale={[0.5, 9, 1]} rotation-y={-Math.PI * 0.8} />
        <Lightformer form="rect" intensity={1.6} color="#22d3ee" position={[0, -6, 2]} scale={[12, 2, 1]} rotation-x={-Math.PI / 2} />
      </Environment>
      <directionalLight position={[-300, 400, 900]} intensity={1.1} color="#bff6ff" />
      <Motes q={q} kit={kit} still={reduced} />
      {specs.map((spec, i) => (
        <Badge key={spec.id} spec={spec} index={i} store={store} kit={kit} still={reduced} />
      ))}
      <ReadyGate store={store} onReady={onReady} />
      <Effects q={q} />
    </>
  );
}

const narrowViewport = () => window.matchMedia('(max-width: 767px)').matches;
const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

/**
 * The credentials vault's 3D layer: one canvas behind the DOM grid. Lazy-loaded (it is part of the three chunk). Quality
 * adapts at run time and never steps back up.
 */
export default function CredentialsStage({ specs, store, paused, reduced, pin, onReady, onLost }: CredentialsStageProps) {
  const [tier, setTier] = useState<Tier>(() => pin ?? startTier(narrowViewport(), coarsePointer()));
  const [monitor, setMonitor] = useState(false);

  const ready = useCallback(() => {
    onReady();
    if (!reduced && pin === null) window.setTimeout(() => setMonitor(true), MONITOR_DELAY_MS);
  }, [onReady, reduced, pin]);
  const down = useCallback(() => setTier((t) => stepDown(t)), []);
  const bottom = useCallback(() => setTier(2), []);

  return (
    <Canvas
      frameloop={reduced ? 'demand' : paused ? 'never' : 'always'}
      dpr={1}
      camera={{ fov: FOV, near: 100, far: 9000, position: [0, 0, 2000] }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#07080a');
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          onLost();
        });
      }}
      aria-hidden="true"
    >
      <World specs={specs} store={store} tier={tier} reduced={reduced} onReady={ready} />
      {reduced ? <StillFrames /> : null}
      {monitor ? <PerformanceMonitor flipflops={2} onDecline={down} onFallback={bottom} /> : null}
    </Canvas>
  );
}
