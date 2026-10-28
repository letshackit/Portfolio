import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import type { CapabilityGroup } from '../../data/content.types';
import { lookFor } from '../domains';
import { Backdrop } from './Backdrop';
import { Beams } from './Beams';
import { Cluster } from './Cluster';
import { Core } from './Core';
import { CAM_AZIMUTH_OFFSET, CAM_RADIUS, RING_RADIUS } from './layout';
import { dprFor, startTier, stepDown, TIERS, type Quality, type Tier } from './quality';
import { Rig } from './Rig';
import { BG, createState } from './scene';

export interface CapStage3DProps {
  readonly groups: readonly CapabilityGroup[];
  readonly active: number;
  readonly onSelect: (index: number) => void;
  /** Off screen or tab hidden: stop rendering. */
  readonly paused: boolean;
  /** Hold this tier and never adapt (QA); null adapts. */
  readonly pin: Tier | null;
  /** Width in CSS pixels the DOM rail covers on the left of the canvas. */
  readonly railPx: number;
  readonly frameRef: RefObject<HTMLElement | null>;
  readonly onReady: () => void;
  readonly onLost: () => void;
}

const FOV = 32;
/** The monitor stays quiet for this long after the first frame: shader compiles are not slow frames. */
const MONITOR_DELAY_MS = 2200;
/** Room left for a skill label on each side of the open ring, in CSS pixels. */
const LABEL_ROOM_PX = 175;

/** Distance from the camera to the active hub: constant by construction, since the camera always flies the same arc. */
const HUB_DISTANCE = Math.hypot(
  Math.sqrt(CAM_RADIUS ** 2 + RING_RADIUS ** 2 - 2 * CAM_RADIUS * RING_RADIUS * Math.cos(CAM_AZIMUTH_OFFSET)),
  2.4,
);

function Effects({ q }: { readonly q: Quality }) {
  const effects = [];
  if (q.bloom) effects.push(<Bloom key="bloom" intensity={0.95} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur radius={0.72} />);
  effects.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />);
  if (q.noise) effects.push(<Noise key="noise" premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.035} />);
  effects.push(<Vignette key="vig" offset={0.3} darkness={0.85} />);
  return <EffectComposer multisampling={q.msaa}>{effects}</EffectComposer>;
}

/** Calls `onReady` once two frames have been drawn. */
function ReadyGate({ onReady }: { readonly onReady: () => void }) {
  const frames = useRef(0);
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    frames.current += 1;
    if (frames.current >= 2) {
      fired.current = true;
      onReady();
    }
  });
  return null;
}

interface WorldProps extends Pick<CapStage3DProps, 'groups' | 'active' | 'onSelect' | 'railPx' | 'frameRef' | 'onReady'> {
  readonly q: Quality;
}

function World({ groups, active, onSelect, railPx, frameRef, onReady, q }: WorldProps) {
  const size = useThree((s) => s.size);
  const count = groups.length;
  const state = useMemo(() => createState(count), [count]);
  const looks = useMemo(() => groups.map(lookFor), [groups]);
  const tones = useMemo(() => looks.map((l) => l.tone), [looks]);

  const unitsPerPx = (2 * HUB_DISTANCE * Math.tan((FOV * Math.PI) / 360)) / size.height;
  const area = size.width - railPx;
  const rxPx = Math.max(110, Math.min(300, area / 2 - LABEL_ROOM_PX));
  const ryPx = Math.max(110, Math.min(250, size.height / 2 - 105));

  return (
    <>
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 12, 30]} />
      <ambientLight intensity={0.35} />
      <Rig state={state} active={active} count={count} railPx={railPx} frameRef={frameRef} />
      <Backdrop state={state} stars={q.stars} />
      <Core state={state} segments={q.sphereSegments} />
      <Beams state={state} tones={tones} />
      {groups.map((group, i) => (
        <Cluster
          key={group.id}
          index={i}
          count={count}
          group={group}
          look={looks[i]}
          active={i === active}
          state={state}
          segments={q.sphereSegments}
          unitsPerPx={unitsPerPx}
          rxPx={rxPx}
          ryPx={ryPx}
          onSelect={onSelect}
        />
      ))}
      <ReadyGate onReady={onReady} />
      <Effects q={q} />
    </>
  );
}

/**
 * Lazy chunk: the capability stage. One canvas, one camera that flies between four domain clusters round a central
 * core. The canvas is decorative (aria-hidden); the DOM rail owns keyboard and screen readers. Quality adapts at run
 * time through drei's PerformanceMonitor: it only ever steps down, so a struggling GPU settles instead of oscillating.
 */
export default function CapStage3D({ groups, active, onSelect, paused, pin, railPx, frameRef, onReady, onLost }: CapStage3DProps) {
  const [tier, setTier] = useState<Tier>(() => pin ?? startTier(window.matchMedia('(pointer: coarse)').matches));
  const [monitor, setMonitor] = useState(false);
  const timer = useRef(0);

  const ready = useCallback(() => {
    onReady();
    if (pin === null) timer.current = window.setTimeout(() => setMonitor(true), MONITOR_DELAY_MS);
  }, [onReady, pin]);
  // Set before the canvas is torn down (parent cleanups run first): releasing the context ourselves is not a loss.
  const disposing = useRef(false);
  useEffect(
    () => () => {
      disposing.current = true;
      window.clearTimeout(timer.current);
    },
    [],
  );

  const down = useCallback(() => setTier((t) => stepDown(t)), []);
  const bottom = useCallback(() => setTier(2), []);
  const q = TIERS[tier];

  return (
    <Canvas
      frameloop={paused ? 'never' : 'always'}
      dpr={dprFor(tier, window.devicePixelRatio)}
      camera={{ fov: FOV, near: 0.1, far: 70, position: [0, 2.4, CAM_RADIUS] }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(BG);
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          if (!disposing.current) onLost();
        });
      }}
      aria-hidden="true"
    >
      <World groups={groups} active={active} onSelect={onSelect} railPx={railPx} frameRef={frameRef} onReady={ready} q={q} />
      {monitor ? <PerformanceMonitor flipflops={2} onDecline={down} onFallback={bottom} /> : null}
    </Canvas>
  );
}
