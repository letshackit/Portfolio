import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Environment, Grid, Lightformer, PerformanceMonitor, Sparkles as DreiSparkles } from '@react-three/drei';
import { MeshBasicMaterial, PointLight, Vector3, type Points, type ShaderMaterial } from 'three';
import { dprFor, startTier, stepDown, TIERS, type Tier } from '../../hero/v2/stage/quality';
import { hstore, smoothstep } from '../historyStore';
import type { TimelineModel } from '../timelineModel';
import { Effects } from './Effects';
import { buildGateGeometry, disposeGate } from './gate';
import { drawLabel, fontsReady, MONO, softDot } from './labels';
import { focusBack, monthsBack, pathPoint } from './path';
import { Rig, type RigMode } from './Rig';
import { MonthTicks, Spine } from './Spine';
import { Flare, Station } from './Station';

/** Same fix as the hero's: drei's Sparkles shader writes a slightly negative alpha in the sprite corners. */
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

/** How long after the first frame the performance monitor stays out of the way: shader compiles are not slow frames. */
const MONITOR_DELAY_MS = 2000;

export interface HistoryStageProps {
  readonly model: TimelineModel;
  readonly mode: RigMode;
  /** Off screen or tab hidden: stop rendering altogether. */
  readonly paused: boolean;
  /** Reduced motion: a still, fully lit overview. Frames are drawn on demand and nothing animates. */
  readonly reduced: boolean;
  /** Hold this tier and never adapt (QA); null adapts. */
  readonly pin: Tier | null;
  readonly onReady: () => void;
  readonly onLost: () => void;
}

function YearLabels({ model, fonts, reduced }: { model: TimelineModel; fonts: boolean; reduced: boolean }) {
  const items = useMemo(
    () =>
      fonts
        ? model.years.map((y) => ({
            year: y.year,
            position: pathPoint(monthsBack(model, y.at)),
            texture: drawLabel([{ text: String(y.year), font: `500 64px ${MONO}`, color: '#67e8f9', y: 0.7, tracking: 6 }], 384, 128),
          }))
        : [],
    [model, fonts],
  );
  useEffect(
    () => () => {
      for (const i of items) i.texture.dispose();
    },
    [items],
  );
  const mats = useRef<(MeshBasicMaterial | null)[]>([]);
  const tmp = useMemo(() => new Vector3(), []);
  useFrame((state) => {
    items.forEach((it, i) => {
      const m = mats.current[i];
      if (!m) return;
      const d = state.camera.position.distanceTo(tmp.copy(it.position));
      m.opacity = reduced ? 0.9 : smoothstep(5, 9, d) * smoothstep(26, 12, d) * 0.8;
    });
  });
  return (
    <>
      {items.map((it, i) => (
        <Billboard key={it.year} position={[it.position.x - 0.45, it.position.y + 0.34, it.position.z]}>
          <mesh>
            <planeGeometry args={[1.0, 0.333]} />
            <meshBasicMaterial
              ref={(m) => {
                mats.current[i] = m;
              }}
              map={it.texture}
              color="#b4b4b4"
              transparent
              depthWrite={false}
              toneMapped={false}
              fog={false}
            />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

/** One amber light riding with the visitor, so the glass of the station they are at catches warm light. */
function FocusLight({ model, reduced }: { model: TimelineModel; reduced: boolean }) {
  const ref = useRef<PointLight>(null);
  useFrame(() => {
    const l = ref.current;
    if (!l) return;
    pathPoint(focusBack(model, reduced ? 0 : hstore.fs), l.position);
    l.position.y += 1.2;
    l.position.z += 1.2;
    l.intensity = reduced ? 0 : 9;
  });
  return <pointLight ref={ref} color="#f59e0b" distance={9} decay={2} intensity={9} />;
}

interface WorldProps extends Pick<HistoryStageProps, 'model' | 'mode' | 'reduced'> {
  readonly tier: Tier;
  readonly onReady: () => void;
}

function ReadyGate({ hold, onReady }: { hold: boolean; onReady: () => void }) {
  const frames = useRef(0);
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current || hold) return;
    frames.current += 1;
    if (frames.current < 3) return;
    fired.current = true;
    onReady();
  });
  return null;
}

function World({ model, mode, reduced, tier, onReady }: WorldProps) {
  const q = TIERS[tier];
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let live = true;
    void fontsReady().then(() => {
      if (live) setFonts(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const gate = useMemo(() => buildGateGeometry(), []);
  useEffect(() => () => disposeGate(gate), [gate]);
  const halo = useMemo(() => softDot(), []);
  useEffect(() => () => halo.dispose(), [halo]);

  const dust = Math.round(150 * q.sparkles);
  const embers = Math.round(46 * q.sparkles);
  const mid = pathPoint(monthsBack(model, (model.min + model.max) / 2));
  const length = model.span * 0.42 + 14;

  return (
    <>
      <color attach="background" args={['#07080a']} />
      <fog attach="fog" args={['#07080a', 14, 58]} />
      <Rig model={model} mode={mode} reduced={reduced} />
      <ambientLight intensity={0.35} color="#9fb4c8" />
      <directionalLight position={[-4, 6, 3]} intensity={1.1} color="#7fe6ff" />
      <directionalLight position={[5, 2, -4]} intensity={0.9} color="#ffb877" />
      <FocusLight model={model} reduced={reduced} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.4} color="#22d3ee" position={[-5, 3, -2]} scale={[9, 3, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#f59e0b" position={[5, 1, 3]} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 6, -4]} scale={4} />
      </Environment>
      <Grid
        position={[0, -2.6, mid.z]}
        args={[10, 10]}
        cellSize={0.7}
        cellThickness={0.7}
        cellColor="#0b4a58"
        sectionSize={3.5}
        sectionThickness={1.2}
        sectionColor="#22d3ee"
        fadeDistance={length}
        fadeStrength={1.4}
        infiniteGrid
        followCamera={false}
      />
      <Spine model={model} reduced={reduced} />
      <MonthTicks model={model} />
      {model.stations.map((s, i) => (
        <Station key={s.id} station={s} index={i} model={model} gate={gate} reduced={reduced} glass={tier < 2} halo={halo} fonts={fonts} compact={mode === 'side'} />
      ))}
      {model.stations.map((s, i) =>
        s.promotion ? <Flare key={s.id} station={s} index={i} model={model} reduced={reduced} halo={halo} fonts={fonts} compact={mode === 'side'} /> : null,
      )}
      <YearLabels model={model} fonts={fonts} reduced={reduced} />
      {dust > 0 ? (
        <Sparkles count={dust} scale={[9, 5, length]} position={[0, 0.6, mid.z]} size={2.6} speed={reduced ? 0 : 0.18} opacity={0.55} color="#67e8f9" noise={0.5} />
      ) : null}
      {embers > 0 ? (
        <Sparkles count={embers} scale={[7, 4, length]} position={[0, 0.4, mid.z]} size={3.4} speed={reduced ? 0 : 0.3} opacity={0.7} color="#fbbf24" noise={0.7} />
      ) : null}
      <ReadyGate hold={!fonts} onReady={onReady} />
      <Effects q={q} />
    </>
  );
}

/** Under reduced motion the loop is on demand: draw enough frames for the environment and the glass to settle, then stop. */
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

const narrowViewport = () => window.matchMedia('(max-width: 767px)').matches;
const coarsePointer = () => window.matchMedia('(pointer: coarse)').matches;

/**
 * The deployment-history stage: one canvas, one camera that travels the path through time. Lazy-loaded (three, drei and
 * postprocessing are the shared 3D chunk). Quality adapts at run time: a performance monitor steps the tier down (pixels,
 * then particles, then film grain) and never back up. Paused when off screen or hidden; disposed on unmount.
 */
export default function HistoryStage({ model, mode, paused, reduced, pin, onReady, onLost }: HistoryStageProps) {
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
      dpr={dprFor(tier, window.devicePixelRatio)}
      camera={{ fov: 34, near: 0.1, far: 80, position: [3, 3, 8] }}
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
      <World model={model} mode={mode} reduced={reduced} tier={tier} onReady={ready} />
      {reduced ? <StillFrames /> : null}
      {monitor ? <PerformanceMonitor flipflops={2} onDecline={down} onFallback={bottom} /> : null}
    </Canvas>
  );
}
