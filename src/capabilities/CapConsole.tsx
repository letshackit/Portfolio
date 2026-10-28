import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { TIMING } from '../config';
import { content } from '../data/content';
import { anchorHref } from '../lib/anchors';
import { onAnchorClick } from '../lib/scroll';
import { ThreeBoundary } from '../lib/ThreeBoundary';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import { afterFirstPaint } from '../lib/visibility';
import { Icon } from '../ui/Icon';
import { capCopy } from './capCopy';
import { lookFor, totalSkills } from './domains';
import type { CapStage3DProps } from './cap3d/CapStage3D';
import { pinnedTier } from './cap3d/quality';

type StageComponent = ComponentType<CapStage3DProps>;

/** How long each domain holds the stage while the matrix cycles on its own. */
const AUTO_MS = 6500;
/** The canvas mounts when the frame is within this many screens of the viewport, and is released beyond the second distance. */
const MOUNT_SCREENS = 1.6;
const RELEASE_SCREENS = 3.5;
const PROXIMITY_POLL_MS = 400;
/** Width the rail covers on the left of the stage, in CSS pixels; the 3D scene is centred on the rest. */
const RAIL_PX = 316;

function loadStage(): Promise<StageComponent> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('3D chunk timed out')), TIMING.threeLoadTimeout);
  });
  const load = import('./cap3d/CapStage3D').then((m) => m.default);
  return Promise.race([load, timeout]).finally(() => window.clearTimeout(timer));
}

interface CapConsoleProps {
  /** The 3D chunk or the GL context failed: the section falls back to the stacked cards. */
  readonly onFail: () => void;
}

/**
 * The capability matrix on desktop: a framed WebGL stage (a camera that flies between four domain clusters round a
 * central core) with a DOM rail of domains beside it. The rail is the real interface (tabs, keyboard, proof links,
 * a screen-reader list of every skill); the canvas is the show. The canvas mounts near the viewport, pauses off screen
 * and is released when the visitor is far away, so it never holds a GL context for a section nobody is looking at.
 */
export function CapConsole({ onFail }: CapConsoleProps) {
  const { capabilities, ui } = content;
  const groups = capabilities.groups;
  const count = groups.length;
  const { tabHidden } = usePrefs();
  const frameRef = useRef<HTMLDivElement>(null);
  const quality = useMemo(() => pinnedTier(window.location.search), []);
  const paused = useOffscreenPause(frameRef);

  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [engaged, setEngaged] = useState(false);
  const [near, setNear] = useState(false);
  const [Stage, setStage] = useState<StageComponent | null>(null);
  const [ready, setReady] = useState(false);

  const select = useCallback((index: number, manual: boolean) => {
    setActive(index);
    if (manual) setAuto(false);
  }, []);
  const selectManual = useCallback((index: number) => select(index, true), [select]);
  const onReady = useCallback(() => setReady(true), []);

  // Mount the canvas when the frame is within a couple of screens, release it when it is far away. Measured from the
  // scroll position, not IntersectionObserver: ScrollSmoother's wrapper clips the observer, so margins would not apply.
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top < vh * MOUNT_SCREENS && r.bottom > -vh * MOUNT_SCREENS) setNear(true);
      else if (r.top > vh * RELEASE_SCREENS || r.bottom < -vh * RELEASE_SCREENS) {
        setNear(false);
        setReady(false);
      }
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(measure);
    };
    measure();
    // ScrollSmoother moves the content a beat after the scroll event, so the scroll alone can read a stale position.
    const poll = window.setInterval(schedule, PROXIMITY_POLL_MS);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearInterval(poll);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  // Fetch the 3D chunk once the section is near, after a paint.
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

  // Cycle through the domains until the visitor takes over; hold still while they hover or focus inside the frame.
  const running = auto && ready && !paused && !tabHidden && !engaged;
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => select((active + 1) % count, false), AUTO_MS);
    return () => window.clearTimeout(id);
  }, [running, active, count, select]);

  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = {
      ArrowDown: active + 1,
      ArrowRight: active + 1,
      ArrowUp: active - 1,
      ArrowLeft: active - 1,
      Home: 0,
      End: count - 1,
    };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (keys[e.key] + count) % count;
    selectManual(next);
    tabs.current[next]?.focus();
  };

  const mounted = near && Stage !== null;
  const stageState = !mounted ? 'off' : ready ? 'ready' : 'loading';
  const total = totalSkills(groups);
  const current = groups[active];

  return (
    <div
      ref={frameRef}
      className="cc"
      data-stage={stageState}
      data-active={current.id}
      data-tone={lookFor(current).tone}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
    >
      <div className="cc__poster" aria-hidden="true" />
      <div className="cc__canvas" aria-hidden="true">
        {mounted && Stage ? (
          <ThreeBoundary onError={onFail}>
            <Stage
              groups={groups}
              active={active}
              onSelect={selectManual}
              paused={paused}
              pin={quality}
              railPx={RAIL_PX}
              frameRef={frameRef}
              onReady={onReady}
              onLost={onFail}
            />
          </ThreeBoundary>
        ) : null}
      </div>
      <div className="cc__scrim" aria-hidden="true" />

      <div className="cc__hud cc__hud--top mono-label" aria-hidden="true">
        <span>{capCopy.frameLabel}</span>
        <span className="cc__hud-n">
          {String(active + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
        </span>
      </div>

      <div className="cc__rail">
        <div role="tablist" aria-label={capCopy.railLabel} aria-orientation="vertical" className="cc__tabs" onKeyDown={onKeyDown}>
        {groups.map((group, i) => {
          const look = lookFor(group);
          const on = i === active;
          return (
            <div className="cc-dom" key={group.id} data-active={on || undefined} data-tone={look.tone}>
              <button
                type="button"
                role="tab"
                id={`cap-tab-${group.id}`}
                aria-selected={on}
                aria-controls={`cap-panel-${group.id}`}
                tabIndex={on ? 0 : -1}
                className="cc-dom__tab"
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                onClick={() => selectManual(i)}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse' && !on) select(i, true);
                }}
                onFocus={() => {
                  if (!on) select(i, true);
                }}
              >
                <span className="cc-dom__idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="cc-dom__name">{group.name}</span>
                <span className="cc-dom__n" aria-label={`${group.skills.length} ${capCopy.skillsWord}`}>
                  {group.skills.length}
                </span>
                {on && running ? <span key={`${active}-${running}`} className="cc-dom__timer" style={{ '--auto': `${AUTO_MS}ms` } as CSSProperties} /> : null}
              </button>
            </div>
          );
        })}
        </div>
        {groups.map((group) => {
          const on = group.id === current.id;
          return (
            <div
              key={group.id}
              role="tabpanel"
              id={`cap-panel-${group.id}`}
              aria-labelledby={`cap-tab-${group.id}`}
              className="cc-dom__panel"
              data-tone={lookFor(group).tone}
              hidden={!on}
            >
              <div className="cc-dom__inner">
                <ul className="visually-hidden">
                  {group.skills.map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
                <p className="mono-label">{ui.proofLabel}</p>
                <a className="cc-dom__link" href={anchorHref(group.anchor)} onClick={onAnchorClick}>
                  {group.proof}
                  <Icon name="arrow-right" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <ul className="cc__legend mono-label" aria-hidden="true">
        <li data-tone="cyan">{capCopy.legendCyan}</li>
        <li data-tone="amber">{capCopy.legendAmber}</li>
      </ul>

      <div className="cc__hud cc__hud--bottom mono-label" aria-hidden="true">
        <span>
          {count} {capCopy.domainsWord} · {total} {capCopy.skillsWord}
        </span>
        <span className="cc__hint">{capCopy.hint}</span>
        <span className="cc__mode" data-live={auto || undefined}>
          <i className="cc__dot" />
          {auto ? capCopy.cycling : capCopy.manual}
        </span>
      </div>
      {mounted && !ready ? (
        <p className="cc__loading mono-label" aria-hidden="true">
          {capCopy.loading}
        </p>
      ) : null}
    </div>
  );
}
