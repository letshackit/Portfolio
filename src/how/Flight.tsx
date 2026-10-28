import { useCallback, useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { useUi } from '../app/providers/uiContext';
import { TIMING } from '../config';
import { content } from '../data/content';
import { ThreeBoundary } from '../lib/ThreeBoundary';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import { afterFirstPaint } from '../lib/visibility';
import { flight } from './flight/timeline';
import type { Tier } from './flight/quality';
import type { FlightStageProps } from './flight/FlightStage';
import type { FlightHandle } from './flightMotion';
import { flightCopy } from './flightCopy';
import { FlightPoster } from './FlightPoster';
import { StagePanel } from './StagePanel';
import { useOnScreen } from './useOnScreen';
import './Flight.css';
import { useProximity } from './useProximity';

const stages = content.howIWork.stages;
const pad = (n: number) => String(n).padStart(2, '0');

type StageComponent = ComponentType<FlightStageProps>;

/** Portrait screens and narrow windows get the vertical conduit; everything else flies down the track. */
const VERTICAL_QUERY = '(orientation: portrait), (max-width: 700px)';

function useVertical(): boolean {
  const [vertical, setVertical] = useState<boolean>(() => typeof window.matchMedia === 'function' && window.matchMedia(VERTICAL_QUERY).matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(VERTICAL_QUERY);
    const onChange = () => setVertical(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, []);
  return vertical;
}

/** The 3D chunk, or a rejection after the load timeout. */
function loadStage(): Promise<StageComponent> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('3D chunk timed out')), TIMING.threeLoadTimeout);
  });
  const load = import('./flight/FlightStage').then((m) => m.default);
  return Promise.race([load, timeout]).finally(() => window.clearTimeout(timer));
}

interface FlightProps {
  /** Pinned quality tier (`?quality=`), or null to adapt. */
  readonly quality: Tier | null;
  /** The chunk failed or the context was lost: the page swaps to the still list. */
  readonly onFail: () => void;
}

/**
 * The flight: a pinned, framed 3D stage that scroll flies down a glowing conduit with seven stations on it. The glass
 * panel and the stage rail are plain DOM, readable from the first paint; the canvas is a lazy chunk that fades in over
 * an SVG poster in the same box. Left / Right / Home / End on the rail move the flight to a station.
 */
export function Flight({ quality, onFail }: FlightProps) {
  const { pointerFine } = usePrefs();
  const vertical = useVertical();
  const { selectedStage, setSelectedStage, stageFocusRequest, requestStageFocus } = useUi();
  const seenRequest = useRef(stageFocusRequest);
  const ownSelection = useRef<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const handleRef = useRef<FlightHandle | null>(null);
  const [active, setActive] = useState(0);
  const [Stage, setStage] = useState<StageComponent | null>(null);
  const [ready, setReady] = useState(false);
  const [flown, setFlown] = useState(false);

  const near = useProximity(rootRef);
  const paused = useOffscreenPause(frameRef);
  const onScreen = useOnScreen(rootRef, 0.35);
  const mount = near && Stage !== null;

  // Fetch the 3D chunk when the section is about to arrive, after a paint, never before.
  useEffect(() => {
    if (!near || Stage) return;
    let cancelled = false;
    const cancelPaint = afterFirstPaint(() => {
      loadStage()
        .then((component) => {
          if (!cancelled) setStage(() => component);
        })
        .catch(() => {
          if (!cancelled) onFail();
        });
    });
    return () => {
      cancelled = true;
      cancelPaint();
    };
  }, [near, Stage, onFail]);

  useEffect(() => {
    if (!mount) setReady(false);
  }, [mount]);

  // Start the scroll engine after first paint; it waits for ScrollSmoother where that is going to exist.
  useEffect(() => {
    let cancelled = false;
    const cancelPaint = afterFirstPaint(() => {
      const root = rootRef.current;
      const line = lineRef.current;
      const fill = fillRef.current;
      const packet = packetRef.current;
      const tabs = tabRefs.current.filter((el): el is HTMLButtonElement => el !== null);
      if (!root || !line || !fill || !packet) return;
      import('./flightMotion')
        .then((mod) =>
          mod.startFlight(
            { root, line, fill, packet, tabs },
            (index) => {
              const stage = stages[index];
              if (!stage) return;
              ownSelection.current = stage.id;
              setActive(index);
              setSelectedStage(stage.id);
              if (index > 0) setFlown(true);
            },
            () => cancelled,
          ),
        )
        .then((handle) => {
          if (!handle) return;
          if (cancelled) handle.dispose();
          else handleRef.current = handle;
        })
        .catch(() => {
          // The motion chunk failed: the rail and panels still work, the page just does not pin.
        });
    });
    return () => {
      cancelled = true;
      cancelPaint();
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [setSelectedStage]);

  // The cursor steers the camera a little (parallax); touch gets the idle sway only.
  useEffect(() => {
    if (!pointerFine || !onScreen) return;
    const move = (e: PointerEvent) => {
      flight.px = (e.clientX / window.innerWidth) * 2 - 1;
      flight.py = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      flight.px = 0;
      flight.py = 0;
    };
  }, [pointerFine, onScreen]);

  // A pick made elsewhere (the palette) moves the flight once the page's own scroll to this section has settled.
  useEffect(() => {
    if (!selectedStage || ownSelection.current === selectedStage) return;
    const index = stages.findIndex((s) => s.id === selectedStage);
    const timer = window.setTimeout(() => handleRef.current?.goTo(index), 700);
    return () => window.clearTimeout(timer);
  }, [selectedStage]);

  // Focus follows an explicit pick (tab click, arrows), never a remount or a resize.
  useEffect(() => {
    if (stageFocusRequest === seenRequest.current) return;
    seenRequest.current = stageFocusRequest;
    tabRefs.current[active]?.focus({ preventScroll: true });
  }, [stageFocusRequest, active]);

  const choose = useCallback(
    (index: number) => {
      const stage = stages[index];
      if (!stage) return;
      ownSelection.current = stage.id;
      setActive(index);
      setSelectedStage(stage.id);
      requestStageFocus();
      handleRef.current?.goTo(index);
    },
    [requestStageFocus, setSelectedStage],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = Math.min(stages.length - 1, active + 1);
        break;
      case 'ArrowLeft':
        next = Math.max(0, active - 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = stages.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    choose(next);
  };

  const current = stages[active] ?? stages[0];
  const stageState = !mount ? 'off' : ready ? 'ready' : 'loading';

  return (
    <div
      className="flight"
      ref={rootRef}
      data-layout={vertical ? 'vertical' : 'wide'}
      data-stage={stageState}
      data-flown={flown || undefined}
    >
      <div className="flight__frame" ref={frameRef}>
        <div className="flight__poster" aria-hidden="true">
          <FlightPoster vertical={vertical} />
        </div>
        <div className="flight__canvas" aria-hidden="true">
          {mount && Stage ? (
            <ThreeBoundary onError={onFail}>
              <Stage
                key={vertical ? 'vertical' : 'wide'}
                stages={stages}
                portrait={vertical}
                paused={paused}
                pin={quality}
                onReady={() => setReady(true)}
                onLost={onFail}
              />
            </ThreeBoundary>
          ) : null}
        </div>
        <div className="flight__veil" aria-hidden="true" />
        <div className="flight__ticks" aria-hidden="true" />

        <div className="flight__hud">
          <div className="flight__top">
            <p className="mono-label flight__counter" aria-live="off">
              <span className="flight__counter-n">{pad(current?.index ?? 1)}</span>
              <span aria-hidden="true"> / {pad(stages.length)}</span>
              <span className="flight__counter-name"> · {current?.shortLabel}</span>
            </p>
            <p className="mono-caption flight__hint" data-gone={flown || undefined} aria-hidden="true">
              <span className="flight__hint-arrow" />
              {vertical ? flightCopy.hintVertical : flightCopy.hint}
            </p>
            <ul className="mono-caption flight__legend" aria-hidden="true">
              <li>
                <span className="flight__key flight__key--packet" />
                {flightCopy.packet}
              </li>
              <li>
                <span className="flight__key flight__key--conduit" />
                {flightCopy.conduit}
              </li>
            </ul>
          </div>

          <div className="flight__panels">
            {stages.map((stage, i) => {
              const isActive = i === active;
              return (
                <div
                  key={stage.id}
                  className="stage-card flight__panel"
                  role="tabpanel"
                  id={`stage-panel-${stage.id}`}
                  aria-labelledby={`stage-tab-${stage.id}`}
                  aria-hidden={isActive ? undefined : true}
                  data-active={isActive || undefined}
                  {...(isActive ? {} : { inert: '' })}
                >
                  <StagePanel stage={stage} play={isActive && onScreen} />
                </div>
              );
            })}
          </div>

          <div className="flight__rail" role="tablist" aria-label={content.ui.stageListLabel} aria-orientation="horizontal" onKeyDown={onKeyDown}>
            <span className="flight__line" ref={lineRef} aria-hidden="true">
              <span className="flight__fill" ref={fillRef} />
              <span className="flight__packet" ref={packetRef} />
            </span>
            {stages.map((stage, i) => {
              const selected = i === active;
              return (
                <button
                  key={stage.id}
                  type="button"
                  role="tab"
                  id={`stage-tab-${stage.id}`}
                  className="flight__tab"
                  aria-selected={selected}
                  aria-controls={`stage-panel-${stage.id}`}
                  tabIndex={selected ? 0 : -1}
                  data-done={i < active || undefined}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  onClick={() => choose(i)}
                >
                  <span className="flight__node" aria-hidden="true" />
                  <span className="mono-label flight__num">{pad(stage.index)}</span>
                  <span className="mono-label flight__name">{stage.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
