import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import type { PipelineStage } from '../../data/content.types';
import { BG } from './common';
import { Conduit } from './Conduit';
import { CameraRig, Horizon } from './CameraRig';
import { Effects } from './Effects';
import { dprFor, startTier, stepDown, TIERS, type Tier } from './quality';
import { Station } from './Station';
import { Deploy, DeployServer } from './stations/Deploy';
import { Jira } from './stations/Jira';
import { Prd } from './stations/Prd';
import { Prototype } from './stations/Prototype';
import { Qa } from './stations/Qa';
import { Research } from './stations/Research';
import { Ux } from './stations/Ux';
import { disposeTextures, fontsReady } from './textures';
import { makeLayout } from './track';

export interface FlightStageProps {
  readonly stages: readonly PipelineStage[];
  /** Portrait layout: the conduit runs down the screen. */
  readonly portrait: boolean;
  /** Off screen or tab hidden: stop rendering altogether. */
  readonly paused: boolean;
  /** Hold this tier and never adapt (QA and screenshots); null adapts. */
  readonly pin: Tier | null;
  /** Two frames of the first station have been drawn. */
  readonly onReady: () => void;
  /** The GL context was lost: the page falls back to the still list. */
  readonly onLost: () => void;
}

const MONITOR_DELAY_MS = 2500;

function ReadyGate({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    frames.current += 1;
    if (frames.current >= 3) {
      fired.current = true;
      onReady();
    }
  });
  return null;
}

interface WorldProps {
  readonly stages: readonly PipelineStage[];
  readonly tier: Tier;
  readonly portrait: boolean;
  readonly onReady: () => void;
}

function World({ stages, tier, portrait, onReady }: WorldProps) {
  const layout = useMemo(() => makeLayout(portrait), [portrait]);
  const q = TIERS[tier];
  const [research, prd, ux, prototype, jira, qa, deploy] = stages;
  return (
    <>
      <color attach="background" args={[BG]} />
      <fogExp2 attach="fog" args={[BG, portrait ? 0.03 : 0.021]} />
      <CameraRig layout={layout} />
      <Horizon layout={layout} />
      <Conduit layout={layout} quality={q} />
      <Station index={0} layout={layout}>
        {research ? <Research key={tier} stage={research} quality={q} /> : null}
      </Station>
      <Station index={1} layout={layout}>
        {prd ? <Prd stage={prd} /> : null}
      </Station>
      <Station index={2} layout={layout}>
        {ux ? <Ux /> : null}
      </Station>
      <Station index={3} layout={layout}>
        {prototype ? <Prototype stage={prototype} /> : null}
      </Station>
      <Station index={4} layout={layout}>
        {jira ? <Jira stage={jira} /> : null}
      </Station>
      <Station index={5} layout={layout}>
        {qa ? <Qa /> : null}
      </Station>
      <Station index={6} layout={layout}>
        {deploy ? <Deploy stage={deploy} /> : null}
      </Station>
      <DeployServer layout={layout} />
      <Effects q={q} />
      <ReadyGate onReady={onReady} />
    </>
  );
}

const narrowViewport = () => window.matchMedia('(max-width: 767px)').matches;
const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

/**
 * The flight's 3D stage: one canvas, one camera, seven stations on a conduit. Lazy-loaded (three, drei and
 * postprocessing are shared with the hero's chunk). Quality adapts at run time and only ever steps down.
 */
export default function FlightStage({ stages, portrait, paused, pin, onReady, onLost }: FlightStageProps) {
  const [tier, setTier] = useState<Tier>(() => pin ?? startTier(narrowViewport(), coarsePointer()));
  const [monitor, setMonitor] = useState(false);
  const [fonts, setFonts] = useState(false);
  // The canvas is released on purpose when the section is far away; that teardown also fires a context-loss event,
  // which must not be mistaken for a real loss (that one drops the page to the still list).
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Canvas textures are drawn with Geist Mono: wait for it so the labels are never in a fallback face.
  useEffect(() => {
    let live = true;
    void fontsReady().then(() => {
      if (live) setFonts(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const ready = useCallback(() => {
    onReady();
    if (pin === null) window.setTimeout(() => setMonitor(true), MONITOR_DELAY_MS);
  }, [onReady, pin]);

  const down = useCallback(() => setTier((t) => stepDown(t)), []);
  const bottom = useCallback(() => setTier(2), []);

  useEffect(() => () => disposeTextures(), []);

  if (!fonts) return null;
  return (
    <Canvas
      frameloop={paused ? 'never' : 'always'}
      dpr={dprFor(tier, window.devicePixelRatio)}
      camera={{ fov: 42, near: 0.1, far: 260, position: [0, 0, 8] }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false, stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(BG);
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          if (!alive.current) return;
          event.preventDefault();
          onLost();
        });
      }}
      aria-hidden="true"
    >
      <World stages={stages} tier={tier} portrait={portrait} onReady={ready} />
      {monitor ? <PerformanceMonitor flipflops={2} onDecline={down} onFallback={bottom} /> : null}
    </Canvas>
  );
}
