import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { TIMING } from '../config';
import { content } from '../data/content';
import { getMode } from '../lib/scroll';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import { supportsWebGL } from '../lib/webgl';
import { ThreeBoundary } from '../lib/ThreeBoundary';
import { LAST_TIER, type Tier } from '../hero/v2/stage/quality';
import { hstore } from './historyStore';
import { Poster } from './Poster';
import { StageHud } from './StageHud';
import { TimelineEntry, type StationState } from './TimelineEntry';
import { buildModel } from './timelineModel';
import { usePinStage } from './usePinStage';
import { useTimelineFocus } from './useTimelineFocus';
import type { HistoryStageProps } from './stage/HistoryStage';

type StageComponent = ComponentType<HistoryStageProps>;

/** How far (px) from the viewport the timeline may be before its canvas is mounted; further away it is torn down. */
const MOUNT_MARGIN = '1200px 0px';

function loadStage(): Promise<StageComponent> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('3D chunk timed out')), TIMING.threeLoadTimeout);
  });
  const load = import('./stage/HistoryStage').then((m) => m.default);
  return Promise.race([load, timeout]).finally(() => window.clearTimeout(timer));
}

/** `?quality=high|mid|low` pins the tier (QA and screenshots), as on the hero. */
function pinnedQuality(search: string): Tier | null {
  const value = new URLSearchParams(search).get('quality');
  return value === 'high' ? 0 : value === 'mid' ? 1 : value === 'low' ? LAST_TIER : null;
}

interface NavigatorWithConnection {
  readonly connection?: { readonly saveData?: boolean };
}

/**
 * The career as a path through time. A 3D stage (a cyan spine receding into depth, one glass gate per employer, the two
 * nine-month promotions flaring amber) stays in view while the station cards scroll past; the camera travels to
 * whichever station you are at. The cards are plain DOM with the real copy. Below 1024 px the stage is a compact sticky
 * strip above stacked cards. Reduced motion, no WebGL or save-data: a still overview or poster beside fully lit cards.
 */
export function Journey() {
  const { reducedMotion, isDesktop } = usePrefs();
  const { entries } = content.history;
  const model = useMemo(() => buildModel(entries, new Date()), [entries]);

  const container = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const stageBox = useRef<HTMLDivElement>(null);
  const paused = useOffscreenPause(stageBox);
  const quality = useMemo(() => pinnedQuality(window.location.search), []);

  const [Stage, setStage] = useState<StageComponent | null>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const [ready, setReady] = useState(false);
  const saveData = (navigator as Navigator & NavigatorWithConnection).connection?.saveData === true;
  const settled = failed || noGl || saveData;

  // Mount the canvas shortly before the section arrives and tear it down once it is well behind: one GL context at most.
  useEffect(() => {
    const el = container.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setNear(entry?.isIntersecting ?? false), { rootMargin: MOUNT_MARGIN });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || saveData || Stage || failed || noGl) return;
    if (!supportsWebGL(quality !== null)) {
      setNoGl(true);
      return;
    }
    let cancelled = false;
    loadStage()
      .then((component) => {
        if (!cancelled) setStage(() => component);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [near, saveData, Stage, failed, noGl, quality]);

  const mount = near && Stage !== null && !settled;
  useEffect(() => {
    if (!mount) setReady(false);
  }, [mount]);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);

  // Cursor parallax for the camera, only while the timeline is near.
  useEffect(() => {
    if (reducedMotion || !near) return;
    const move = (e: PointerEvent) => {
      hstore.px = (e.clientX / window.innerWidth) * 2 - 1;
      hstore.py = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      hstore.px = 0;
      hstore.py = 0;
    };
  }, [reducedMotion, near]);

  const tracking = !reducedMotion;
  const active = useTimelineFocus({ container, list, pin, enabled: tracking, desktop: isDesktop, count: model.stations.length });
  usePinStage(container, pin, isDesktop);

  const jump = useCallback(
    (index: number) => {
      const el = list.current?.children[index] as HTMLElement | undefined;
      if (!el) return;
      void (async () => {
        if (getMode() === 'smoother') {
          try {
            const { ScrollSmoother } = await import('gsap/ScrollSmoother');
            const smoother = ScrollSmoother.get();
            if (smoother) {
              smoother.scrollTo(el, true, 'center center');
              return;
            }
          } catch {
            // Fall through to native scrolling.
          }
        }
        el.scrollIntoView({ block: isDesktop ? 'center' : 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
      })();
    },
    [isDesktop, reducedMotion],
  );

  const stateOf = (i: number): StationState => (!tracking ? 'active' : i === active ? 'active' : i < active ? 'passed' : 'ahead');
  const stageState = !mount ? 'off' : ready ? 'ready' : 'loading';
  const live = mount && ready && !reducedMotion;
  const mode = reducedMotion ? 'overview' : isDesktop ? 'tunnel' : 'side';

  return (
    <div
      className="tl3"
      ref={container}
      data-stage={stageState}
      data-tracking={tracking ? '' : undefined}
      data-armed={tracking && isDesktop ? '' : undefined}
    >
      <div className="tl3__pin" ref={pin}>
        <div className="tl3__stage" ref={stageBox}>
          <div className="tl3__poster" aria-hidden="true">
            <Poster active={active} />
          </div>
          <div className="tl3__canvas" aria-hidden="true">
            {mount && Stage ? (
              <ThreeBoundary onError={onFail}>
                <Stage
                  key={reducedMotion ? 'still' : 'live'}
                  model={model}
                  mode={mode}
                  paused={paused}
                  reduced={reducedMotion}
                  pin={quality}
                  onReady={onReady}
                  onLost={onFail}
                />
              </ThreeBoundary>
            ) : null}
          </div>
          <div className="tl3__scrim" aria-hidden="true" />
          <StageHud model={model} active={active} onJump={jump} live={live} />
        </div>
      </div>
      <ol className="tl3__list" ref={list}>
        {entries.map((entry, i) => {
          const station = model.stations.find((s) => s.id === entry.id);
          return station ? (
            <TimelineEntry key={entry.id} entry={entry} station={station} index={i} total={entries.length} state={stateOf(i)} />
          ) : null;
        })}
      </ol>
    </div>
  );
}
