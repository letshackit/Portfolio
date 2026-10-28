/**
 * The scroll engine for the flight (How I work). Loaded on demand with the motion chunk, never under reduced motion.
 * ScrollTrigger pins the flight for several viewports and reports raw progress; a frame-rate independent lerp turns
 * that into the damped clock the 3D scene and the rail both follow (`flight` in flight/timeline.ts). Only transforms
 * are written to the DOM. Scroll is the clock: nothing here advances on its own.
 */
import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BREAKPOINTS } from '../config';
import { activeStation, builtFraction, clamp01, ENTER_P, flight, progressForStation, progressToS, resetFlight, STATIONS } from './flight/timeline';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
ScrollTrigger.config({ ignoreMobileResize: true });

/** Lerp rate per second: higher is snappier. */
const RATE = 7.5;
const SETTLE = 0.00035;
const SMOOTHER_WAIT_MS = 10000;
const GOTO_LOCK_MS = 1800;

export interface FlightElements {
  readonly root: HTMLElement;
  readonly line: HTMLElement;
  readonly fill: HTMLElement;
  readonly packet: HTMLElement;
  /** Cumulative "product built" meter: a bar scaled on X and its percentage text. */
  readonly meterFill: HTMLElement;
  readonly meterValue: HTMLElement;
  readonly tabs: readonly HTMLElement[];
}

export interface FlightHandle {
  goTo(index: number): void;
  dispose(): void;
}

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/** ScrollSmoother must exist before any pin is created, so wait for the motion chunk to build it when it is going to. */
function smootherExpected(): boolean {
  return (
    matches(`(min-width: ${BREAKPOINTS.desktop}px)`) &&
    matches('(pointer: fine)') &&
    !matches('(prefers-reduced-motion: reduce)') &&
    document.querySelector('#smooth-wrapper') !== null
  );
}

async function waitForSmoother(isCancelled: () => boolean): Promise<void> {
  const started = performance.now();
  while (!isCancelled() && smootherExpected() && !ScrollSmoother.get() && performance.now() - started < SMOOTHER_WAIT_MS) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
  }
}

/** Pin length in viewport heights. A phone gets a shorter run: a thumb scrolls farther per swipe. */
function pinViewports(): number {
  return matches('(max-width: 767px)') ? 6 : 7.2;
}

export async function startFlight(
  els: FlightElements,
  onActive: (index: number) => void,
  isCancelled: () => boolean,
): Promise<FlightHandle | null> {
  await waitForSmoother(isCancelled);
  if (isCancelled()) return null;

  const { root, line, fill, packet, meterFill, meterValue, tabs } = els;
  const last = STATIONS - 1;
  let lineWidth = 0;
  let current = 0;
  let target = 0;
  let lastIndex = -1;
  let lastPct = -1;
  let lockIndex: number | null = null;
  let lockTimer = 0;
  let ticking = false;
  const lit: boolean[] = tabs.map(() => false);

  const measure = () => {
    lineWidth = line.offsetWidth;
  };

  const apply = (p: number) => {
    flight.target = target;
    flight.current = p;
    const s = progressToS(p);
    flight.s = s;
    const f = clamp01(s / last);
    fill.style.transform = `scaleX(${f.toFixed(4)})`;
    packet.style.transform = `translate3d(${(f * lineWidth).toFixed(2)}px,-50%,0)`;
    const built = builtFraction(s);
    meterFill.style.transform = `scaleX(${built.toFixed(4)})`;
    const pct = Math.round(built * 100);
    if (pct !== lastPct) {
      lastPct = pct;
      meterValue.textContent = `${pct}%`;
    }
    for (let i = 0; i < tabs.length; i += 1) {
      const isLit = s >= i - 0.02;
      if (lit[i] !== isLit) {
        lit[i] = isLit;
        if (isLit) tabs[i]?.setAttribute('data-lit', '');
        else tabs[i]?.removeAttribute('data-lit');
      }
    }
    const index = activeStation(s);
    if (index !== lastIndex) {
      lastIndex = index;
      if (lockIndex === null || lockIndex === index) {
        lockIndex = null;
        onActive(index);
      }
    }
  };

  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(0.1, deltaMs / 1000);
    current += (target - current) * (1 - Math.exp(-RATE * dt));
    if (Math.abs(target - current) < SETTLE) {
      current = target;
      gsap.ticker.remove(tick);
      ticking = false;
    }
    apply(current);
  };
  const wake = () => {
    if (ticking) return;
    ticking = true;
    gsap.ticker.add(tick);
  };

  let trigger: ScrollTrigger | null = null;
  let pinProgress = 0;
  let enter = 0;
  const retarget = () => {
    // Before the pin the frame is still sliding in: progress runs from -ENTER_P up to 0 so station 1 starts building.
    target = pinProgress - (1 - enter) * ENTER_P;
    wake();
  };
  const onRefresh = () => {
    measure();
    apply(current);
  };

  const ctx = gsap.context(() => {
    trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: () => `+=${Math.round(window.innerHeight * pinViewports())}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        pinProgress = self.progress;
        retarget();
      },
    });
    ScrollTrigger.create({
      trigger: root,
      start: 'top bottom',
      end: 'top top',
      onUpdate: (self) => {
        enter = self.progress;
        retarget();
      },
    });
  }, root);

  measure();
  root.setAttribute('data-engine', '');
  pinProgress = trigger ? (trigger as ScrollTrigger).progress : 0;
  enter = pinProgress > 0 ? 1 : clamp01((window.innerHeight - root.getBoundingClientRect().top) / window.innerHeight);
  target = pinProgress - (1 - enter) * ENTER_P;
  current = target;
  lastIndex = activeStation(progressToS(current));
  apply(current);
  ScrollTrigger.addEventListener('refresh', onRefresh);
  ScrollTrigger.refresh();

  return {
    goTo(index) {
      const st = trigger as ScrollTrigger | null;
      if (!st) return;
      const y = st.start + progressForStation(Math.min(last, Math.max(0, index))) * (st.end - st.start);
      lockIndex = index;
      window.clearTimeout(lockTimer);
      lockTimer = window.setTimeout(() => {
        lockIndex = null;
      }, GOTO_LOCK_MS);
      const smoother = ScrollSmoother.get();
      if (smoother) smoother.scrollTo(y, true);
      else window.scrollTo({ top: y, behavior: 'smooth' });
    },
    dispose() {
      window.clearTimeout(lockTimer);
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      gsap.ticker.remove(tick);
      ctx.revert();
      root.removeAttribute('data-engine');
      fill.style.transform = '';
      packet.style.transform = '';
      meterFill.style.transform = '';
      meterValue.textContent = '0%';
      for (const tab of tabs) tab.removeAttribute('data-lit');
      resetFlight();
    },
  };
}
