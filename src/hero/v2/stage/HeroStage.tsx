import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, PerformanceMonitor, Sparkles as DreiSparkles, useGLTF } from '@react-three/drei';
import type { Points, ShaderMaterial } from 'three';
import { resetCounters, store } from '../store';
import { Avatar, AVATAR_URL } from './Avatar';
import { Backdrop, Floor, GlowPool, Lights } from './Atmosphere';
import { CameraRig } from './CameraRig';
import { Blocks } from './city/Blocks';
import { Drones } from './city/Drones';
import { Nodes } from './city/Nodes';
import { clock } from './city/state';
import { Effects } from './Effects';
import { LOOK } from './lookPreset';
import { disposeSoftTexture } from './glow';
import { useCityVectors, useLayout } from './layout';
import { dprFor, startTier, stepDown, TIERS, type Tier } from './quality';

/**
 * drei's Sparkles shader writes a slightly negative alpha in the corners of each point sprite (0.05 / d - 0.1 is below
 * zero past d = 0.5). On the half-float scene buffer that is not clamped, so every sprite drew a dark square around
 * itself. Clamp it once the material exists.
 */
function Sparkles(props: ComponentProps<typeof DreiSparkles>) {
  const ref = useRef<Points>(null);
  useLayoutEffect(() => {
    const mat = ref.current?.material as ShaderMaterial | undefined;
    if (!mat || !mat.fragmentShader.includes('strength * vOpacity')) return;
    mat.fragmentShader = mat.fragmentShader.replace('strength * vOpacity', 'max(strength, 0.0) * vOpacity');
    mat.needsUpdate = true;
  }, []);
  return <DreiSparkles {...props} ref={ref} />;
}

export const ENV_URL = '/hero/char_environment.hdr';

/** How long after the first frame the performance monitor stays out of the way: shader compiles are not slow frames. */
const MONITOR_DELAY_MS = 2000;

export interface HeroStageProps {
  /** Off screen or tab hidden: stop rendering altogether. */
  readonly paused: boolean;
  /** Reduced motion: a still, lit scene. Frames are rendered on demand, nothing animates. */
  readonly reduced: boolean;
  /** Hold this tier and never adapt (QA and screenshots on software GL); null adapts. */
  readonly pin: Tier | null;
  /** The avatar is standing on the stage and two frames have rendered. */
  readonly onReady: () => void;
  /** The GL context was lost: the page falls back to the poster. */
  readonly onLost: () => void;
}

function Clock() {
  useFrame((_, dt) => {
    if (!store.reduced) store.time += Math.min(dt, 0.1);
  });
  return null;
}

/** Starts the city's wall clock the moment the assets have resolved and the content mounts. */
function Start() {
  useEffect(() => {
    clock.start = performance.now();
    return () => {
      clock.start = 0;
    };
  }, []);
  return null;
}

/** Calls `onReady` once, after the content has mounted and two frames have been drawn. */
function ReadyGate({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    frames.current += 1;
    if (frames.current < 2) return;
    fired.current = true;
    onReady();
  });
  return null;
}

/** Under reduced motion the loop is on demand: draw enough frames for the mirror and the shadow to settle, then stop. */
function StillFrames() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let n = 0;
    const id = window.setInterval(() => {
      invalidate();
      n += 1;
      if (n > 14) window.clearInterval(id);
    }, 140);
    return () => window.clearInterval(id);
  }, [invalidate]);
  return null;
}

interface WorldProps {
  readonly tier: Tier;
  readonly reduced: boolean;
  readonly onReady: () => void;
}

function World({ tier, reduced, onReady }: WorldProps) {
  const L = useLayout();
  const q = TIERS[tier];
  const city = useCityVectors(L.city);
  const sparkleScale = q.sparkles * L.sparkles * LOOK.particles.sparkleScale;
  const near = Math.round(60 * sparkleScale);
  const far = Math.round(80 * sparkleScale);

  return (
    <>
      <color attach="background" args={['#07080a']} />
      <fog attach="fog" args={['#07080a', 6.2, 14.5]} />
      <Clock />
      <CameraRig />
      <Lights shadowRes={q.keyRes} />
      <Backdrop />
      <Floor reflect={q.reflect} shadowRes={q.shadowRes} />
      <Suspense fallback={null}>
        <Environment files={ENV_URL} />
        <Avatar />
        {/* The service city, shrunk onto the stage behind and to the right of the operator. */}
        <group position={city.position} scale={city.scale} rotation-y={city.rotationY}>
          <GlowPool />
          <Blocks />
          {reduced ? null : <Drones count={q.drones} />}
        </group>
        <Nodes city={city} packets={reduced ? 0 : q.packets} spread={L.nodeSpread} />
        {near > 0 ? (
          <Sparkles count={near} scale={[3.4, 2.8, 2]} position={[0.1, 1.1, 0.1]} size={5} speed={reduced ? 0 : 0.35} opacity={0.95} color="#fbbf24" noise={0.7} />
        ) : null}
        {far > 0 ? (
          <Sparkles count={far} scale={[9, 4.5, 6]} position={[0.5, 1.8, -1.5]} size={2.2} speed={reduced ? 0 : 0.12} opacity={0.5} color="#67e8f9" noise={0.4} />
        ) : null}
        <Start />
        <ReadyGate onReady={onReady} />
      </Suspense>
      <Effects q={q} />
    </>
  );
}

const narrowViewport = () => window.matchMedia('(max-width: 767px)').matches;
const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

/**
 * The hero's 3D stage: one canvas, one camera. Lazy-loaded; everything here (three, drei, postprocessing) is the 3D
 * chunk. Quality adapts at run time: a performance monitor steps the tier down (pixels first, then particles, then the
 * film effects) and never back up, so a struggling GPU settles instead of oscillating.
 */
export default function HeroStage({ paused, reduced, pin, onReady, onLost }: HeroStageProps) {
  const [tier, setTier] = useState<Tier>(() => pin ?? startTier(narrowViewport(), coarsePointer()));
  const [monitor, setMonitor] = useState(false);

  const ready = useCallback(() => {
    onReady();
    if (!reduced && pin === null) window.setTimeout(() => setMonitor(true), MONITOR_DELAY_MS);
  }, [onReady, reduced, pin]);

  const down = useCallback(() => setTier((t) => stepDown(t)), []);
  const bottom = useCallback(() => setTier(2), []);

  useEffect(
    () => () => {
      // Dispose on unmount: the shared texture, the cached glTF, the counters. The renderer is disposed by the Canvas.
      disposeSoftTexture();
      useGLTF.clear(AVATAR_URL);
      resetCounters();
    },
    [],
  );

  return (
    <Canvas
      frameloop={reduced ? 'demand' : paused ? 'never' : 'always'}
      dpr={dprFor(tier, window.devicePixelRatio)}
      camera={{ fov: 28, near: 0.1, far: 60, position: [2.6, 1.4, 4.5] }}
      shadows="percentage"
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
      <World tier={tier} reduced={reduced} onReady={ready} />
      {reduced ? <StillFrames /> : null}
      {monitor ? <PerformanceMonitor flipflops={2} onDecline={down} onFallback={bottom} /> : null}
    </Canvas>
  );
}
