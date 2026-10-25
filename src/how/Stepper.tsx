import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { useUi } from '../app/providers/uiContext';
import { content } from '../data/content';
import { afterFirstPaint } from '../lib/visibility';
import type { JourneyHandle } from './journeyMotion';
import { StagePanel } from './StagePanel';

const stages = content.howIWork.stages;
const pad = (n: number) => String(n).padStart(2, '0');
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Pinned horizontal journey on desktop (FR-65, FR-66); the vertical rail below 1024 px and under reduced motion (FR-67). */
export function Stepper() {
  const { isDesktop, reducedMotion } = usePrefs();
  return isDesktop && !reducedMotion ? <StepperJourney /> : <StepperList />;
}

/** True while at least `threshold` of the element is on screen, so counters and loops only run when seen. */
function useOnScreen(ref: { readonly current: Element | null }, threshold: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver((entries) => setOn(entries.some((e) => e.isIntersecting)), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return on;
}

/**
 * List mode: all seven stages in order, the rail running down the left edge with an amber packet that follows the
 * scroll, and the card nearest the reading line fully lit (FR-67). The stage chosen in the hero is focused on arrival.
 */
function StepperList() {
  const { reducedMotion } = usePrefs();
  const { selectedStage, stageFocusRequest } = useUi();
  const seenRequest = useRef(stageFocusRequest);
  const selectedRef = useRef<HTMLLIElement | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [lit, setLit] = useState(0);
  const onScreen = useOnScreen(wrapRef, 0.05);

  useEffect(() => {
    if (stageFocusRequest === seenRequest.current) return;
    seenRequest.current = stageFocusRequest;
    if (selectedStage) selectedRef.current?.focus({ preventScroll: true });
  }, [selectedStage, stageFocusRequest]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const fill = fillRef.current;
    const packet = packetRef.current;
    if (reducedMotion || !onScreen || !wrap || !fill || !packet) return;
    const items = itemRefs.current.filter((el): el is HTMLLIElement => el !== null);
    wrap.setAttribute('data-live', '');
    let raf = 0;
    let active = -1;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const readLine = vh * 0.55;
      const box = wrap.getBoundingClientRect();
      const p = clamp01((readLine - box.top) / box.height);
      fill.style.transform = `scaleY(${p.toFixed(4)})`;
      packet.style.transform = `translate3d(0,${(p * box.height).toFixed(1)}px,0)`;
      let best = 0;
      let bestDistance = Infinity;
      items.forEach((li, i) => {
        const b = li.getBoundingClientRect();
        const distance = readLine < b.top ? b.top - readLine : readLine > b.bottom ? readLine - b.bottom : 0;
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
        const k = Math.min(1, distance / (vh * 0.4));
        li.style.opacity = (1 - 0.5 * k).toFixed(3);
        li.style.transform = `translate3d(0,0,0) scale(${(1 - 0.04 * k).toFixed(4)})`;
        if (b.top - box.top + 12 <= p * box.height) li.setAttribute('data-lit', '');
        else li.removeAttribute('data-lit');
      });
      if (best !== active) {
        active = best;
        setLit(best);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) cancelAnimationFrame(raf);
      wrap.removeAttribute('data-live');
      for (const li of items) {
        li.style.opacity = '';
        li.style.transform = '';
        li.removeAttribute('data-lit');
      }
    };
  }, [reducedMotion, onScreen]);

  return (
    <div className="stepper-wrap" ref={wrapRef}>
      <span className="stepper-wrap__line" aria-hidden="true">
        <span className="stepper-wrap__fill" ref={fillRef} />
        <span className="stepper-wrap__packet" ref={packetRef} />
      </span>
      <ol className="stepper-list" aria-label={content.ui.stageListLabel}>
        {stages.map((stage, i) => {
          const selected = stage.id === selectedStage;
          return (
            <li
              key={stage.id}
              className="stepper-list__item stage-card"
              data-selected={selected || undefined}
              tabIndex={selected ? -1 : undefined}
              ref={(el) => {
                itemRefs.current[i] = el;
                if (selected) selectedRef.current = el;
              }}
            >
              <span className="stepper-list__dot" aria-hidden="true" />
              <StagePanel stage={stage} play={onScreen && i === lit} />
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Journey mode (desktop): ScrollTrigger pins this block while the seven cards slide past and the amber packet rides the
 * cyan rail. Tabs keep roving tabindex; Left/Right/Home/End move the active stage and scroll the pin to it (FR-66).
 * Before the motion chunk arrives, or if it never does, CSS positions the track from `--f` so the tabs still work.
 */
function StepperJourney() {
  const { selectedStage, setSelectedStage, stageFocusRequest, requestStageFocus } = useUi();
  const seenRequest = useRef(stageFocusRequest);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const packetRef = useRef<HTMLSpanElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const cardRefs = useRef<Array<HTMLLIElement | null>>([]);
  const handleRef = useRef<JourneyHandle | null>(null);
  const ownSelection = useRef<string | null>(null);
  const onScreen = useOnScreen(rootRef, 0.35);

  const activeIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === selectedStage),
  );
  const active = stages[activeIndex] ?? stages[0];

  // Start the pinned engine after first paint; it waits for ScrollSmoother where that is going to exist.
  useEffect(() => {
    let cancelled = false;
    const cancelPaint = afterFirstPaint(() => {
      const els = {
        root: rootRef.current,
        track: trackRef.current,
        line: lineRef.current,
        fill: fillRef.current,
        packet: packetRef.current,
      };
      const cards = cardRefs.current.filter((el): el is HTMLLIElement => el !== null);
      const tabs = tabRefs.current.filter((el): el is HTMLButtonElement => el !== null);
      if (!els.root || !els.track || !els.line || !els.fill || !els.packet) return;
      const { root, track, line, fill, packet } = els;
      import('./journeyMotion')
        .then((mod) =>
          mod.startJourney(
            { root, track, line, fill, packet, cards, tabs },
            (index) => {
              const stage = stages[index];
              if (!stage) return;
              ownSelection.current = stage.id;
              setSelectedStage(stage.id);
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
          // The chunk failed: the CSS fallback keeps the tabs and the track working.
        });
    });
    return () => {
      cancelled = true;
      cancelPaint();
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [setSelectedStage]);

  // A pick made elsewhere (the hero) moves the pin once the page's own scroll to this section has settled.
  useEffect(() => {
    if (!selectedStage || ownSelection.current === selectedStage) return;
    const index = stages.findIndex((s) => s.id === selectedStage);
    const timer = window.setTimeout(() => handleRef.current?.goTo(index), 700);
    return () => window.clearTimeout(timer);
  }, [selectedStage]);

  // Focus follows an explicit pick (hero click, tab click, arrows), never a remount or a resize (FR-60).
  useEffect(() => {
    if (stageFocusRequest === seenRequest.current) return;
    seenRequest.current = stageFocusRequest;
    tabRefs.current[activeIndex]?.focus({ preventScroll: true });
  }, [stageFocusRequest, activeIndex]);

  const choose = (index: number) => {
    const stage = stages[index];
    if (!stage) return;
    ownSelection.current = stage.id;
    setSelectedStage(stage.id);
    requestStageFocus();
    handleRef.current?.goTo(index);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = (activeIndex + 1) % stages.length;
        break;
      case 'ArrowLeft':
        next = (activeIndex - 1 + stages.length) % stages.length;
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

  return (
    <div className="journey" ref={rootRef} style={{ '--f': activeIndex } as CSSProperties}>
      <div className="journey__hud">
        <p className="mono-label journey__counter" aria-live="off">
          <span className="journey__counter-n">{pad(active?.index ?? 1)}</span>
          <span aria-hidden="true"> / {pad(stages.length)}</span>
          <span className="journey__counter-name"> · {active?.shortLabel}</span>
        </p>
        <span className="journey__hud-rule" aria-hidden="true" />
      </div>
      <div
        className="journey__rail"
        role="tablist"
        aria-label={content.ui.stageListLabel}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        <span className="journey__line" ref={lineRef} aria-hidden="true">
          <span className="journey__fill" ref={fillRef} />
          <span className="journey__packet" ref={packetRef} />
        </span>
        {stages.map((stage, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              id={`stage-tab-${stage.id}`}
              className="journey__tab"
              aria-selected={selected}
              aria-controls="stage-panel"
              tabIndex={selected ? 0 : -1}
              data-done={i < activeIndex || undefined}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              onClick={() => choose(i)}
            >
              <span className="journey__node" aria-hidden="true" />
              <span className="mono-label journey__num">{pad(stage.index)}</span>
              <span className="mono-label journey__name">{stage.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <div
        className="journey__viewport"
        role="tabpanel"
        id="stage-panel"
        aria-labelledby={`stage-tab-${active?.id ?? stages[0]?.id ?? ''}`}
      >
        <ol className="journey__track" ref={trackRef}>
          {stages.map((stage, i) => {
            const isActive = i === activeIndex;
            return (
              <li
                key={stage.id}
                className="stage-card"
                data-active={isActive || undefined}
                aria-current={isActive ? 'step' : undefined}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
              >
                <StagePanel stage={stage} play={isActive && onScreen} />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
