import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Effects } from '../../hero/v2/stage/Effects';
import { dprFor, startTier, stepDown, TIERS, type Tier } from '../../hero/v2/stage/quality';
import { BayScene } from './BayScene';
import { highlightFor, type SceneSpec } from './spec';
import type { NodeHandlers } from './parts';

gsap.registerPlugin(ScrollTrigger);

export interface BayCanvasProps {
  readonly spec: SceneSpec;
  /** Hovered, focused or pinned node, or null. */
  readonly active: string | null;
  readonly open: string | null;
  readonly frameEl: HTMLElement;
  /** Off screen or tab hidden: stop rendering altogether. */
  readonly paused: boolean;
  /** Reduced motion: a still, complete scene, drawn on demand. */
  readonly reduced: boolean;
  readonly pointerFine: boolean;
  /** Hold this tier and never adapt (QA and screenshots); null adapts. */
  readonly pin: Tier | null;
  readonly handlers: NodeHandlers;
  readonly onReady: () => void;
  readonly onLost: () => void;
  /** A click or tap on empty space. */
  readonly onMiss: () => void;
}

/** How long after the first frame the performance monitor stays out of the way: shader compiles are not slow frames. */
const MONITOR_DELAY_MS = 2500;
/** Packets in flight per tier; the sim is cheap, the draw is two instanced meshes. */
const PACKETS = [18, 10, 4] as const;

const narrow = () => window.matchMedia('(max-width: 767px)').matches;
const coarse = () => window.matchMedia('(pointer: coarse)').matches;

/** Only on demand while reduced: draw enough frames for the label textures and the environment map to land, then rest. */
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

/**
 * One bay's canvas. Lazy chunk (three, drei, postprocessing). Quality adapts at run time: a performance monitor steps
 * the tier down (pixels, then particles, then film effects) and never back up, so a struggling GPU settles instead of
 * oscillating. At most two bays are ever mounted at once (see BayStage), and a bay off screen is not rendering at all.
 */
export default function BayCanvas({ spec, active, open, frameEl, paused, reduced, pointerFine, pin, handlers, onReady, onLost, onMiss }: BayCanvasProps) {
  const [tier, setTier] = useState<Tier>(() => pin ?? startTier(narrow(), coarse()));
  const [monitor, setMonitor] = useState(false);
  const lit = useMemo(() => (active ? highlightFor(spec, active) : null), [spec, active]);
  const q = TIERS[tier];

  // Scroll progress through the frame drives the assembly, so scrolling back up takes it apart: the motion belongs to
  // the visitor, not to a timer. Reduced motion skips it and shows the finished system.
  const progress = useRef({ current: reduced ? 1 : 0 });
  useEffect(() => {
    const readout = frameEl.querySelector<HTMLElement>('[data-bay-progress]');
    const write = (p: number) => {
      progress.current.current = p;
      if (readout) readout.textContent = `${String(Math.round(p * 100)).padStart(3, '0')}%`;
    };
    if (reduced) {
      write(1);
      return;
    }
    const trigger = ScrollTrigger.create({
      trigger: frameEl,
      start: 'top 92%',
      end: 'top 38%',
      onUpdate: (self) => write(self.progress),
      onRefresh: (self) => write(self.progress),
    });
    write(trigger.progress);
    return () => trigger.kill();
  }, [frameEl, reduced]);

  const ready = useCallback(() => {
    onReady();
    if (!reduced && pin === null) window.setTimeout(() => setMonitor(true), MONITOR_DELAY_MS);
  }, [onReady, reduced, pin]);
  const down = useCallback(() => setTier((t) => stepDown(t)), []);
  const bottom = useCallback(() => setTier(2), []);

  return (
    <Canvas
      frameloop={reduced ? 'demand' : paused ? 'never' : 'always'}
      dpr={dprFor(tier, window.devicePixelRatio)}
      camera={{ fov: 30, near: 0.5, far: 160, position: [0, 0, 30] }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#07080a');
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          onLost();
        });
      }}
      onPointerMissed={onMiss}
      style={{ position: 'absolute', inset: 0, touchAction: 'pan-y' }}
      aria-hidden="true"
    >
      <color attach="background" args={['#07080a']} />
      <fog attach="fog" args={['#07080a', 20, 60]} />
      <BayScene
        spec={spec}
        lit={lit}
        open={open}
        progress={progress.current}
        frameEl={frameEl}
        pointerFine={pointerFine}
        reduced={reduced}
        q={q}
        packets={reduced ? PACKETS[0] : PACKETS[tier]}
        handlers={handlers}
        onReady={ready}
      />
      <Effects q={q} />
      {reduced ? <StillFrames /> : null}
      {monitor ? <PerformanceMonitor flipflops={2} onDecline={down} onFallback={bottom} /> : null}
    </Canvas>
  );
}
