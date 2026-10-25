/**
 * The pinned horizontal journey (How I work, desktop). Loaded on demand, never under reduced motion.
 * ScrollTrigger pins the root for about 300 vh and reports progress; a frame-rate independent lerp turns that into
 * the track position, the card emphasis and the amber packet on the rail. Only transforms and opacity are written.
 */
import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BREAKPOINTS } from '../config';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/** Pin length in viewport heights (the brief: about 300 vh). */
const PIN_VH = 3;
/** Lerp rate per second: higher is snappier. */
const RATE = 9;
const SETTLE = 0.0004;
/** Neighbouring cards sit at this scale and opacity (the brief: 0.85 and 0.5). */
const INACTIVE_SCALE = 0.85;
const INACTIVE_OPACITY = 0.5;
const SMOOTHER_WAIT_MS = 10000;
const GOTO_LOCK_MS = 1600;

export interface JourneyElements {
  readonly root: HTMLElement;
  readonly track: HTMLElement;
  readonly cards: readonly HTMLElement[];
  readonly tabs: readonly HTMLElement[];
  readonly line: HTMLElement;
  readonly fill: HTMLElement;
  readonly packet: HTMLElement;
}

export interface JourneyHandle {
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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export async function startJourney(
  els: JourneyElements,
  onActive: (index: number) => void,
  isCancelled: () => boolean,
): Promise<JourneyHandle | null> {
  await waitForSmoother(isCancelled);
  if (isCancelled()) return null;

  const { root, track, cards, tabs, line, fill, packet } = els;
  const n = cards.length;
  const last = Math.max(1, n - 1);

  let step = 0;
  let lineWidth = 0;
  let current = 0;
  let target = 0;
  let lastIndex = 0;
  let lockIndex: number | null = null;
  let lockTimer = 0;
  let ticking = false;
  const lit: boolean[] = tabs.map(() => false);

  const measure = () => {
    step = n > 1 ? (cards[1]?.offsetLeft ?? 0) - (cards[0]?.offsetLeft ?? 0) : 0;
    lineWidth = line.offsetWidth;
  };

  const apply = (p: number) => {
    const f = p * last;
    track.style.transform = `translate3d(${(-f * step).toFixed(2)}px,0,0)`;
    for (let i = 0; i < n; i += 1) {
      const k = Math.min(1, Math.abs(i - f));
      const card = cards[i];
      if (!card) continue;
      card.style.transform = `scale(${(1 - (1 - INACTIVE_SCALE) * k).toFixed(4)})`;
      card.style.opacity = (1 - (1 - INACTIVE_OPACITY) * k).toFixed(4);
      const isLit = f >= i - 0.02;
      if (lit[i] !== isLit) {
        lit[i] = isLit;
        if (isLit) tabs[i]?.setAttribute('data-lit', '');
        else tabs[i]?.removeAttribute('data-lit');
      }
    }
    fill.style.transform = `scaleX(${clamp01(p).toFixed(4)})`;
    packet.style.transform = `translate3d(${(clamp01(p) * lineWidth).toFixed(2)}px,-50%,0)`;

    const index = Math.round(f);
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
  const onRefresh = () => {
    measure();
    apply(current);
  };

  const ctx = gsap.context(() => {
    trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: () => `+=${Math.round(window.innerHeight * PIN_VH)}`,
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        target = self.progress;
        wake();
      },
    });
  }, root);

  measure();
  root.setAttribute('data-engine', '');
  // Hand the geometry to the engine: inline values replace the CSS fallback positions.
  fill.style.left = '0';
  packet.style.left = '0';
  target = trigger ? (trigger as ScrollTrigger).progress : 0;
  current = target;
  lastIndex = Math.round(current * last);
  apply(current);
  ScrollTrigger.addEventListener('refresh', onRefresh);
  ScrollTrigger.refresh();

  return {
    goTo(index) {
      const st = trigger as ScrollTrigger | null;
      if (!st) return;
      const y = st.start + (clamp01(index / last) * (st.end - st.start));
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
      track.style.transform = '';
      fill.style.transform = '';
      fill.style.left = '';
      packet.style.transform = '';
      packet.style.left = '';
      for (const card of cards) {
        card.style.transform = '';
        card.style.opacity = '';
      }
      for (const tab of tabs) tab.removeAttribute('data-lit');
    },
  };
}
