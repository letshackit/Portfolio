/**
 * Pins the bay rail under the header while the four bays scroll past. Loaded on demand and never under reduced motion
 * or without a fine pointer. Where ScrollSmoother runs, CSS `position: sticky` cannot engage (the page moves by
 * transform, not by scroll), so ScrollTrigger pins it instead; everywhere else the rail is plain CSS sticky.
 */
import { gsap } from 'gsap';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

const SMOOTHER_WAIT_MS = 10000;
const GAP_PX = 12;

function headerHeight(): number {
  return document.querySelector('header')?.getBoundingClientRect().height ?? 56;
}

/** Pins `rail` from the top of `wrap` to its end. Resolves to a cleanup, or null when there is no smoother to pin through. */
export async function pinRail(rail: HTMLElement, wrap: HTMLElement, isCancelled: () => boolean): Promise<(() => void) | null> {
  const started = performance.now();
  while (!isCancelled() && !ScrollSmoother.get() && performance.now() - started < SMOOTHER_WAIT_MS) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
  }
  if (isCancelled() || !ScrollSmoother.get()) return null;
  rail.setAttribute('data-pinned', '');
  const top = () => headerHeight() + GAP_PX;
  const trigger = ScrollTrigger.create({
    trigger: wrap,
    start: () => `top top+=${top()}`,
    end: () => `bottom top+=${top() + rail.offsetHeight + 24}`,
    pin: rail,
    pinSpacing: false,
    invalidateOnRefresh: true,
  });
  return () => {
    trigger.kill();
    rail.removeAttribute('data-pinned');
  };
}
