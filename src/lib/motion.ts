/**
 * The motion chunk (ADR-007). Loaded by `useMotion()` after first paint and never under reduced motion.
 * Owns: ScrollSmoother (desktop + fine pointer only, ADR-002), `[data-reveal]` reveals, the hero's scroll beat, and
 * ScrollTrigger refresh (fonts, images, layout changes). The pinned How journey and the History rail run their own triggers.
 * Every from-state is set here, at the moment of animating (FR-7).
 */
import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { BREAKPOINTS } from '../config';
import { bindHeroBeat } from '../hero/v2/beat';
import { attachSmoother, setRefreshHook } from './scroll';
import { REVEAL_SELECTOR, type MotionHandle, type MotionOptions, type RevealKind } from './reveal';
import { isPastLine } from './visibility';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);

/** ScrollSmoother lag in seconds (ADR-002; the old site used 1.7, which felt heavy). */
const SMOOTH = 0.8;
/** Reveals start when the element's top reaches this fraction of the viewport (B.5: top 85%). */
const REVEAL_START = 0.85;
const LINE_STAGGER = 0.06;
const BLOCK_OFFSET_PX = 8;
/** Quiet period before a layout-driven ScrollTrigger.refresh. */
const REFRESH_DEBOUNCE_MS = 150;
const REVEAL_EASE = 'power3.out';

function matches(query: string): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
}

/** `--d-slow` from the tokens, in seconds, so the CSS stays the single source of durations. */
function slowSeconds(): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--d-slow').trim();
  const ms = Number.parseFloat(raw);
  return Number.isFinite(ms) && ms > 0 ? ms / 1000 : 0.4;
}

function smootherEligible(): boolean {
  return (
    matches(`(min-width: ${BREAKPOINTS.desktop}px)`) &&
    matches('(pointer: fine)') &&
    !matches('(prefers-reduced-motion: reduce)') &&
    document.querySelector('#smooth-wrapper') !== null &&
    document.querySelector('#smooth-content') !== null
  );
}

function revealKind(el: Element): RevealKind | null {
  const value = el.getAttribute('data-reveal');
  return value === 'lines' || value === 'block' ? value : null;
}

function revealLines(el: HTMLElement, duration: number): void {
  SplitText.create(el, {
    type: 'lines',
    linesClass: 'reveal-line',
    mask: 'lines',
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.lines, {
        yPercent: 100,
        duration,
        ease: REVEAL_EASE,
        stagger: LINE_STAGGER,
        onComplete: () => self.revert(),
      }),
  });
}

function revealBlock(el: HTMLElement, duration: number): void {
  gsap.fromTo(
    el,
    { opacity: 0, y: BLOCK_OFFSET_PX },
    { opacity: 1, y: 0, duration, ease: REVEAL_EASE, clearProps: 'opacity,transform' },
  );
}

/** One trigger per `[data-reveal]` element. Elements already on screen when we load are left alone. */
function bindReveals(duration: number): void {
  document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach((el) => {
    const kind = revealKind(el);
    if (!kind || isPastLine(el, REVEAL_START)) return;
    ScrollTrigger.create({
      trigger: el,
      start: `top ${REVEAL_START * 100}%`,
      once: true,
      onEnter: () => (kind === 'lines' ? revealLines(el, duration) : revealBlock(el, duration)),
    });
  });
}

/**
 * Keeps ScrollTrigger (pins, reveals) and ScrollSmoother measuring the real page. Lazy images, the 3D stages swapping in,
 * expanding cards and late fonts all change the height of #main after the first refresh; each distinct change schedules
 * one debounced refresh. Comparing heights keeps the refresh from re-triggering itself through the pin spacers.
 */
function watchLayout(isLive: () => boolean): () => void {
  const main = document.getElementById('main');
  let timer = 0;
  let lastHeight = main?.offsetHeight ?? 0;
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      if (!isLive()) return;
      lastHeight = main?.offsetHeight ?? lastHeight;
      ScrollTrigger.refresh();
    }, REFRESH_DEBOUNCE_MS);
  };
  const onImageLoad = (event: Event) => {
    if (event.target instanceof HTMLImageElement) schedule();
  };
  document.addEventListener('load', onImageLoad, true);
  const observer =
    main && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (Math.abs(main.offsetHeight - lastHeight) > 1) schedule();
        })
      : null;
  if (main) observer?.observe(main);
  // The hero's 3D stage arriving (data-stage: off, loading, ready) is a mount like the images: measure again once it settles.
  const hero = document.querySelector('.hv2');
  const stageObserver =
    hero && typeof MutationObserver !== 'undefined' ? new MutationObserver(schedule) : null;
  if (hero) stageObserver?.observe(hero, { attributes: true, attributeFilter: ['data-stage'] });
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener('load', onImageLoad, true);
    observer?.disconnect();
    stageObserver?.disconnect();
  };
}

export function startMotion(options: MotionOptions): MotionHandle {
  let smoother: ScrollSmoother | null = null;
  let unbindHero: () => void = () => undefined;
  const ctx = gsap.context(() => {
    if (smootherEligible()) {
      smoother = ScrollSmoother.create({
        wrapper: '#smooth-wrapper',
        content: '#smooth-content',
        smooth: SMOOTH,
        effects: false,
        normalizeScroll: false,
        ignoreMobileResize: true,
        onFocusIn: () => options.allowFocusScroll(),
      });
      attachSmoother(smoother, () => ScrollTrigger.refresh());
    }
    bindReveals(slowSeconds());
    // After the smoother: the hero pins its stage through it.
    unbindHero = bindHeroBeat();
  });

  let live = true;
  setRefreshHook(() => ScrollTrigger.refresh());
  const onFontsReady = () => {
    if (live) ScrollTrigger.refresh();
  };
  if ('fonts' in document) void document.fonts.ready.then(onFontsReady);
  window.addEventListener('load', onFontsReady, { once: true });
  const stopWatching = watchLayout(() => live);
  const onRefresh = () => options.onLayout?.();
  ScrollTrigger.addEventListener('refresh', onRefresh);

  return {
    dispose() {
      live = false;
      setRefreshHook(null);
      stopWatching();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      window.removeEventListener('load', onFontsReady);
      unbindHero();
      ctx.revert();
      if (smoother) {
        smoother.kill();
        smoother = null;
        attachSmoother(null);
      }
    },
  };
}
