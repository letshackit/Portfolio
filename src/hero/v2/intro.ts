import { store } from './store';

const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

/**
 * Brings the scene's "lights on" from its 40 % floor to full over `ms`, with an ease-out. A plain rAF ramp, so the
 * entry chunk needs no animation library for it. Returns a cancel function.
 */
export function rampIntro(ms: number): () => void {
  const from = store.intro;
  const start = performance.now();
  let raf = 0;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms);
    store.intro = from + (1 - from) * easeOutQuad(t);
    if (t < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
