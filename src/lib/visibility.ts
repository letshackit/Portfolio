/** Small viewport and paint-timing helpers shared by the reveal code. No GSAP here: this ships in the entry chunk. */

/** Run `callback` after the first paint has happened (two frames), or immediately where rAF is missing. */
export function afterFirstPaint(callback: () => void): () => void {
  if (typeof window.requestAnimationFrame !== 'function') {
    callback();
    return () => undefined;
  }
  let cancelled = false;
  let second = 0;
  const first = window.requestAnimationFrame(() => {
    second = window.requestAnimationFrame(() => {
      if (!cancelled) callback();
    });
  });
  return () => {
    cancelled = true;
    window.cancelAnimationFrame(first);
    window.cancelAnimationFrame(second);
  };
}

/** True when the top of `el` is already above `fraction` of the viewport height (it needs no reveal). */
export function isPastLine(el: Element, fraction: number): boolean {
  return el.getBoundingClientRect().top < window.innerHeight * fraction;
}
