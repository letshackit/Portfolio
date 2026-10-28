import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { TIMING } from '../config';
import { bayCopy, type Bay } from '../data/deployment-bays';
import { ThreeBoundary } from '../lib/ThreeBoundary';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import { supportsWebGL } from '../lib/webgl';
import { LAST_TIER, type Tier } from '../hero/v2/stage/quality';
import type { BayCanvasProps } from './three/BayCanvas';
import { layoutFor } from './three/layouts';
import { neighbours, type SceneSpec } from './three/spec';
import type { NodeHandlers } from './three/parts';

type CanvasComponent = ComponentType<BayCanvasProps>;

interface NavigatorWithConnection {
  readonly connection?: { readonly saveData?: boolean };
}

let chunk: Promise<CanvasComponent> | null = null;

/** The 3D chunk, shared by every bay, or a rejection after the load timeout. */
function loadCanvas(): Promise<CanvasComponent> {
  if (chunk) return chunk;
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('3D chunk timed out')), TIMING.threeLoadTimeout * 2);
  });
  chunk = Promise.race([import('./three/BayCanvas').then((m) => m.default), timeout]).finally(() => window.clearTimeout(timer));
  chunk.catch(() => {
    chunk = null;
  });
  return chunk;
}

/** `?quality=high|mid|low` pins the tier (QA and screenshots), like the hero. */
function pinnedQuality(search: string): Tier | null {
  const value = new URLSearchParams(search).get('quality');
  return value === 'high' ? 0 : value === 'mid' ? 1 : value === 'low' ? LAST_TIER : null;
}

/** Mounts when within `near` of the viewport and unmounts again past `far`, so at most about two canvases ever exist. */
function useNearMount(ref: React.RefObject<Element | null>, enabled: boolean): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || typeof IntersectionObserver === 'undefined') return;
    const near = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setMounted(true), { rootMargin: '35% 0px 35% 0px' });
    const far = new IntersectionObserver((entries) => entries.every((e) => !e.isIntersecting) && setMounted(false), { rootMargin: '140% 0px 140% 0px' });
    near.observe(el);
    far.observe(el);
    return () => {
      near.disconnect();
      far.disconnect();
    };
  }, [ref, enabled]);
  return mounted && enabled;
}

const LEGEND_SWATCH: Readonly<Record<string, 'solid' | 'dashed'>> = { call: 'solid', flow: 'solid', return: 'solid', mesh: 'solid', event: 'dashed', control: 'dashed', phase2: 'dashed' };

function Legend({ spec }: { spec: SceneSpec }) {
  return (
    <ul className="dpl-legend mono-caption" aria-label="Legend">
      {spec.legend.map((k) => (
        <li key={k}>
          <i className="dpl-legend__line" data-style={LEGEND_SWATCH[k]} data-kind={k} aria-hidden="true" />
          {bayCopy.legend[k]}
        </li>
      ))}
      <li>
        <i className="dpl-legend__packet" aria-hidden="true" />
        {bayCopy.legend.packet}
      </li>
    </ul>
  );
}

interface BayStageProps {
  readonly bay: Bay;
  readonly index: number;
}

/**
 * The stage of one bay: the live 3D architecture inside a HUD frame, with a readout of whatever is lit and a component
 * index underneath. The canvas is decorative (aria-hidden); the index buttons own keyboard and screen-reader access and
 * drive the same highlight as the pointer does. The 3D is a lazy chunk behind a poster in the same box, so nothing
 * moves when it arrives. Without WebGL, with save-data, or if the chunk fails, the readout and the index remain.
 */
export function BayStage({ bay, index }: BayStageProps) {
  const { reducedMotion, pointerFine } = usePrefs();
  const frameRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [portrait, setPortrait] = useState(false);
  const [Canvas, setCanvas] = useState<CanvasComponent | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const quality = useMemo(() => pinnedQuality(window.location.search), []);
  const noGl = useMemo(() => !supportsWebGL(quality !== null), [quality]);
  const saveData = (navigator as Navigator & NavigatorWithConnection).connection?.saveData === true;
  const enabled = !failed && !noGl && !saveData;
  const paused = useOffscreenPause(frameRef);

  // The phone arrangement is a different layout of the same idea, picked by the box it has to fit in.
  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const read = () => setPortrait(el.clientWidth < 640);
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const spec = useMemo(() => layoutFor(bay, portrait), [bay, portrait]);
  const [open, setOpen] = useState<string | null>(() => layoutFor(bay, false).initialOpen);
  const mount = useNearMount(frameRef, enabled);

  useEffect(() => {
    if (!mount || Canvas) return;
    let cancelled = false;
    loadCanvas()
      .then((c) => {
        if (!cancelled) setCanvas(() => c);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mount, Canvas]);

  useEffect(() => {
    if (!mount) setReady(false);
  }, [mount]);

  const live = mount && Canvas !== null;
  // R3F force-loses the context when a canvas unmounts: that is not a failure. Only a loss while it should be drawing is.
  const liveRef = useRef(false);
  liveRef.current = live;
  const onLost = useCallback(() => {
    if (liveRef.current) setFailed(true);
  }, []);
  const state = !enabled ? 'off' : live ? (ready ? 'ready' : 'loading') : 'idle';
  const active = hover ?? pinned;

  const select = useCallback(
    (id: string) => {
      const n = spec.nodes.find((x) => x.id === id);
      if (spec.clusters.includes(id)) {
        setOpen((cur) => (cur === id ? null : id));
        setPinned((cur) => (cur === id ? null : id));
      } else if (n?.parent) {
        setOpen(n.parent);
        setPinned((cur) => (cur === id ? null : id));
      } else {
        setPinned((cur) => (cur === id ? null : id));
      }
    },
    [spec],
  );
  const handlers = useMemo<NodeHandlers>(
    () => ({
      onOver: (id) => setHover(id),
      onOut: (id) => setHover((cur) => (cur === id ? null : cur)),
      onClick: select,
    }),
    [select],
  );

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setPinned(null);
      setHover(null);
    }
  };

  // --- Readout ---------------------------------------------------------------------------------------------------
  const arch = bay.architecture;
  const subject = active ? describe(bay, spec, active) : null;
  const openGroup = open ? arch.groups.find((g) => g.id === open) : null;
  const openModules = open ? arch.nodes.filter((n) => n.kind === 'module' && n.group === open) : [];

  // --- Component index (a roving-tabindex toolbar: one tab stop per bay) ------------------------------------------
  const indexNodes = spec.nodes.filter((n) => n.pick && !n.parent);
  // The seven HRMS clusters read as one group (a label per single chip would just repeat the chip).
  const clusterNodes = indexNodes.filter((n) => n.kind === 'cluster');
  const groups = [
    ...(clusterNodes.length > 0 ? [{ g: { id: '__clusters', label: bayCopy.clusterGroup }, items: clusterNodes }] : []),
    ...arch.groups.map((g) => ({ g, items: indexNodes.filter((n) => n.group === g.id && n.kind !== 'cluster') })),
  ].filter((x) => x.items.length > 0);
  const [rove, setRove] = useState<string | null>(null);
  const flat = groups.flatMap((x) => x.items.map((n) => n.id));
  const roving = rove && flat.includes(rove) ? rove : (flat[0] ?? null);
  const indexRef = useRef<HTMLDivElement>(null);
  const onIndexKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const buttons = Array.from(indexRef.current?.querySelectorAll<HTMLButtonElement>('button[data-node]') ?? []);
    const at = buttons.findIndex((b) => b === document.activeElement);
    if (at < 0) return;
    e.preventDefault();
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (at + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  const ratio = useMemo(() => {
    const w = spec.extent.maxX - spec.extent.minX;
    const h = spec.extent.maxY - spec.extent.minY;
    const r = (w + 1.2) / (h + 1.6);
    return portrait ? Math.min(0.95, Math.max(0.5, r * 0.92)) : Math.min(2.3, Math.max(1.7, r * 0.94));
  }, [spec, portrait]);

  return (
    <div className="dpl-stage" data-state={state} data-bay={bay.id} data-side={bay.readoutSide} data-portrait={portrait || undefined} ref={boxRef} style={{ '--ar': ratio } as CSSProperties}>
      <div
        className="dpl-stage__frame"
        ref={frameRef}
        role="group"
        aria-label={`${bay.name} architecture`}
        onKeyDown={onKey}
      >
        <div className="dpl-stage__view corner-ticks">
          <div className="dpl-stage__poster" aria-hidden="true">
            <span className="mono-label dpl-stage__boot">
              {bayCopy.loading3d}
              <span className="dpl-caret" />
            </span>
          </div>
          <div className="dpl-stage__canvas" aria-hidden="true" data-ready={ready || undefined}>
            {live && Canvas && boxRef.current && frameRef.current ? (
              <ThreeBoundary onError={() => setFailed(true)}>
                <Canvas
                  key={reducedMotion ? 'still' : 'live'}
                  spec={spec}
                  active={active}
                  open={open}
                  frameEl={frameRef.current}
                  paused={paused}
                  reduced={reducedMotion}
                  pointerFine={pointerFine}
                  pin={quality}
                  handlers={handlers}
                  onReady={() => setReady(true)}
                  onLost={onLost}
                  onMiss={() => setPinned(null)}
                />
              </ThreeBoundary>
            ) : null}
          </div>
          <div className="dpl-hud dpl-hud--tl mono-label" aria-hidden="true">
            <span className="dpl-hud__dot" />
            {bayCopy.hudBay} {String(index + 1).padStart(2, '0')} · {bay.name}
          </div>
        </div>
        <div className="dpl-hud dpl-hud--tr mono-caption" aria-hidden="true">
          <span className="dpl-hud__progress">
            {bayCopy.assembly} <b data-bay-progress>{reducedMotion ? '100%' : '000%'}</b>
          </span>
        </div>
        <div className="dpl-hud dpl-hud--br mono-caption" aria-hidden="true">
          <span className="dpl-hud__fidelity">{arch.fidelity}</span>
          <Legend spec={spec} />
        </div>
        <div className="dpl-readout" data-on={subject ? '' : undefined} aria-live="polite">
          {subject ? (
            <>
              <p className="mono-label dpl-readout__kicker">{subject.kicker}</p>
              <p className="dpl-readout__title">{subject.title}</p>
              <p className="dpl-readout__role">{subject.role}</p>
              {subject.links.length > 0 ? (
                <p className="mono-caption dpl-readout__links">
                  {subject.linksLabel}: {subject.links.join(', ')}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mono-label dpl-readout__kicker">{bayCopy.indexHeading}</p>
              <p className="dpl-readout__role">{bay.hint}</p>
              {openGroup ? (
                <p className="mono-caption dpl-readout__links">
                  {openGroup.label} open: {openModules.map((m) => m.label).join(' · ')}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="dpl-index" ref={indexRef} role="toolbar" aria-label={`${bay.name}: ${bay.indexLabel}`} onKeyDown={onIndexKey} aria-orientation="horizontal">
        {groups.map(({ g, items }) => (
          <div className="dpl-index__group" key={g.id} role="group" aria-label={g.label}>
            <p className="mono-label dpl-index__label">{g.label}</p>
            <ul className="dpl-index__chips">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="dpl-node"
                    data-node={n.id}
                    data-on={active === n.id || undefined}
                    data-ghost={n.ghost || undefined}
                    aria-pressed={pinned === n.id}
                    tabIndex={roving === n.id ? 0 : -1}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover((c) => (c === n.id ? null : c))}
                    onFocus={() => {
                      setRove(n.id);
                      setHover(n.id);
                    }}
                    onBlur={() => setHover((c) => (c === n.id ? null : c))}
                    onClick={() => select(n.id)}
                  >
                    {n.label}
                    {n.sub && spec.clusters.includes(n.id) ? <span className="dpl-node__sub">{n.sub.replace(' modules', '')}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Subject {
  readonly kicker: string;
  readonly title: string;
  readonly role: string;
  readonly linksLabel: string;
  readonly links: readonly string[];
}

function describe(bay: Bay, spec: SceneSpec, id: string): Subject {
  const arch = bay.architecture;
  const node = arch.nodes.find((n) => n.id === id);
  const group = arch.groups.find((g) => g.id === id);
  const home = arch.groups.find((g) => g.id === (node?.group ?? ''));
  if (group && spec.clusters.includes(id)) {
    const mods = arch.nodes.filter((n) => n.kind === 'module' && n.group === id);
    return { kicker: `Cluster · ${mods.length} modules`, title: group.label, role: group.summary, linksLabel: 'Modules', links: mods.map((m) => m.label) };
  }
  return {
    kicker: home?.label ?? bay.indexLabel,
    title: node?.label ?? id,
    role: node?.role ?? '',
    linksLabel: bayCopy.connectsTo,
    links: neighbours(spec, id),
  };
}
