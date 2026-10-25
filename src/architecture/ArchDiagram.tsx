import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import type { ArchNodeKind, ArchitectureModel } from '../data/content.types';
import { layoutArch, highlightFor, BOX_H, BOX_W, type ArchOrientation } from '../lib/archLayout';
import { usePrefs } from '../app/providers/prefsContext';
import { TIMING } from '../config';
import { supportsWebGL } from '../lib/webgl';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import { archCopy } from './archCopy';
import { ArchNodeList, type NodeRect } from './ArchNodeList';
import { ThreeBoundary } from '../hero/three/ThreeBoundary';
import { layout3d } from './three/layout3d';
import { blockRect, fitProjection } from './three/projection';
import type { ArchStage3DProps } from './three/ArchStage3D';
import type { ArchSelection } from './useArchSelection';

const RX = 6;
/** Width over height of the 3D frame (CSS sets the same ratio; the camera fit and the overlay both read it). */
const STAGE_ASPECT = 2.1;

type StageComponent = ComponentType<ArchStage3DProps>;

interface NavigatorWithConnection {
  readonly connection?: { readonly saveData?: boolean };
}

/** Imports the 3D chunk, or rejects after the load timeout. */
function loadStage(): Promise<StageComponent> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('architecture 3D chunk timed out')), TIMING.threeLoadTimeout);
  });
  const load = import('./three/ArchStage3D').then((m) => m.default);
  return Promise.race([load, timeout]).finally(() => window.clearTimeout(timer));
}

interface Props {
  readonly model: ArchitectureModel;
  readonly selection: ArchSelection;
}

/**
 * Frame holding the decorative SVG (wide only) and the always-present node list that doubles as
 * the interaction and accessibility layer (ADR-006). Below 768 px there is no SVG (FR-88).
 */
export function ArchDiagram({ model, selection }: Props) {
  const { isWide, isDesktop, reducedMotion, pointerFine } = usePrefs();
  const orientation: ArchOrientation | null = isDesktop ? 'horizontal' : isWide ? 'vertical' : null;
  const svgLayout = useMemo(() => (orientation ? layoutArch(model, orientation) : null), [model, orientation]);
  const lit = useMemo(
    () => (selection.active ? highlightFor(model, selection.active) : null),
    [model, selection.active],
  );

  // 3D is for desktop widths with WebGL and motion allowed; everything else keeps the SVG (or the list below 768 px).
  const saveData = (navigator as Navigator & NavigatorWithConnection).connection?.saveData === true;
  const [failed, setFailed] = useState(false);
  const want3d = isDesktop && !reducedMotion && !saveData && supportsWebGL() && !failed;

  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const [Stage, setStage] = useState<StageComponent | null>(null);
  const [ready, setReady] = useState(false);
  const paused = useOffscreenPause(frameRef);

  useEffect(() => {
    if (!want3d || !frameEl || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '900px 0px' },
    );
    io.observe(frameEl);
    return () => io.disconnect();
  }, [want3d, frameEl]);

  useEffect(() => {
    if (!want3d || !near || Stage) return;
    let live = true;
    loadStage()
      .then((c) => {
        if (live) setStage(() => c);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [want3d, near, Stage]);

  const scene = useMemo(() => {
    if (!want3d) return null;
    const layout = layout3d(model);
    const proj = fitProjection(layout, STAGE_ASPECT);
    const rects = new Map<string, NodeRect>(layout.blocks.map((b) => [b.id, blockRect(b, proj)] as const));
    return { layout, proj, rects };
  }, [model, want3d]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') selection.clear();
  };

  const nodeState = (id: string) => (lit ? (lit.nodes.has(id) ? 'on' : 'dim') : 'idle');
  const edgeState = (id: string) => (lit ? (lit.edges.has(id) ? 'on' : 'dim') : 'idle');
  const busState = lit ? (lit.bus ? 'on' : 'dim') : 'idle';

  const layout = want3d ? null : svgLayout;
  const mode = want3d ? '3d' : layout ? 'diagram' : 'list';
  const style = layout ? { aspectRatio: `${layout.viewBox[0]} / ${layout.viewBox[1]}` } : undefined;
  const rectOf = (id: string): NodeRect | undefined => {
    if (scene) return scene.rects.get(id);
    const b = layout?.boxes.get(id);
    if (!layout || !b) return undefined;
    return {
      left: (b.x / layout.viewBox[0]) * 100,
      top: (b.y / layout.viewBox[1]) * 100,
      width: (b.w / layout.viewBox[0]) * 100,
      height: (b.h / layout.viewBox[1]) * 100,
    };
  };

  return (
    // Escape handling is a convenience on top of the buttons inside; the frame itself is not interactive.
    <div
      ref={(el) => {
        frameRef.current = el;
        setFrameEl(el);
      }}
      className="arch-frame corner-ticks"
      data-mode={mode}
      data-ready={ready || undefined}
      data-orientation={orientation ?? undefined}
      style={style}
      onKeyDown={onKeyDown}
    >
      {mode === '3d' ? (
        <>
          <div className="arch-stage" aria-hidden="true">
            {Stage && scene && frameEl ? (
              <ThreeBoundary onError={() => setFailed(true)}>
                <Stage
                  layout={scene.layout}
                  proj={scene.proj}
                  lit={lit}
                  frameEl={frameEl}
                  paused={paused}
                  pointerFine={pointerFine}
                  onReady={() => setReady(true)}
                  onFail={() => setFailed(true)}
                />
              </ThreeBoundary>
            ) : null}
          </div>
          <div className="arch-hud" aria-hidden="true">
            <span className="arch-hud__tag mono-label">{archCopy.hudTag}</span>
            <span className="arch-hud__build mono-label">
              <span className="arch-hud__dot" />
              {archCopy.hudAssembly} <b data-arch-progress>000%</b>
            </span>
            {scene ? (
              <>
                <HudTag rect={scene.rects.get('hris')} className="arch-hud__sat">
                  {archCopy.hudLive}
                </HudTag>
                <HudTag rect={scene.rects.get('ebix')} className="arch-hud__sat arch-hud__sat--p2">
                  {archCopy.hudPhase2}
                </HudTag>
              </>
            ) : null}
          </div>
        </>
      ) : null}
      {layout ? (
        <svg
          className="arch-svg"
          viewBox={`0 0 ${layout.viewBox[0]} ${layout.viewBox[1]}`}
          aria-hidden="true"
          focusable="false"
        >
          <rect
            className="arch-svg__bg"
            width={layout.viewBox[0]}
            height={layout.viewBox[1]}
            onPointerDown={selection.clear}
          />
          <g className="arch-bus" data-state={busState}>
            {[layout.bus.trunk, layout.bus.spine, ...layout.bus.rows].map((s, i) => (
              <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
            ))}
          </g>
          <g>
            {layout.edges
              .filter((e) => !e.backplane)
              .map((e) => (
                <path key={e.id} className="arch-edge" data-kind={e.kind} data-state={edgeState(e.id)} d={e.d} />
              ))}
          </g>
          <g>
            {layout.edges
              .filter((e) => e.backplane && lit?.edges.has(e.id))
              .map((e) => (
                <path key={e.id} className="arch-edge" data-kind={e.kind} data-state="on" d={e.d} />
              ))}
          </g>
          <g>
            {model.nodes.map((n) => {
              const b = layout.boxes.get(n.id);
              if (!b) return null;
              return (
                <rect
                  key={n.id}
                  className="arch-box"
                  data-kind={n.kind}
                  data-state={nodeState(n.id)}
                  x={b.x}
                  y={b.y}
                  width={BOX_W}
                  height={BOX_H}
                  rx={RX}
                />
              );
            })}
          </g>
        </svg>
      ) : null}
      <ArchNodeList model={model} wide={mode !== 'list'} rectOf={rectOf} selection={selection} nodeState={nodeState} />
    </div>
  );
}

function HudTag({ rect, className, children }: { readonly rect: NodeRect | undefined; readonly className: string; readonly children: string }) {
  if (!rect) return null;
  return (
    <span className={`${className} mono-label`} style={{ left: `${rect.left}%`, top: `${rect.top - 7}%` }}>
      {children}
    </span>
  );
}

export function LegendSwatch({ kind }: { readonly kind: ArchNodeKind }) {
  return <span className="arch-swatch" data-kind={kind} aria-hidden="true" />;
}

export function ArchLegend() {
  return (
    <ul className="arch-legend mono-caption" aria-label={archCopy.legendLabel}>
      {archCopy.legendKinds.map((kind) => (
        <li key={kind}>
          <LegendSwatch kind={kind} />
          {archCopy.kindLabel[kind]}
        </li>
      ))}
      <li>
        <LegendSwatch kind="integration-phase2" />
        {archCopy.legendPhase2}
      </li>
    </ul>
  );
}
