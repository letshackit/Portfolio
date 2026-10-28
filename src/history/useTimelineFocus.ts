import { useEffect, useState, type RefObject } from 'react';
import { hstore } from './historyStore';

interface FocusOptions {
  readonly container: RefObject<HTMLElement | null>;
  readonly list: RefObject<HTMLElement | null>;
  /** The stage block; on narrow screens the focus line sits below its bottom edge. */
  readonly pin: RefObject<HTMLElement | null>;
  /** False under reduced motion: nothing tracks the scroll and every station stays lit. */
  readonly enabled: boolean;
  readonly desktop: boolean;
  readonly count: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Turns the scroll position into "which station are you at": a continuous index (0 = newest role), written to the shared
 * store for the 3D camera, plus the integer station for the cards and HUD. One frame loop that runs only while the
 * timeline is on screen and reads four rectangles. It also sets `--tl-fill` (px) on the list so the rail lights up to
 * the focus line. Works under ScrollSmoother because it reads where things are drawn, not the raw scroll offset.
 */
export function useTimelineFocus({ container, list, pin, enabled, desktop, count }: FocusOptions): number {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = container.current;
    const ol = list.current;
    if (!root || !ol || !enabled || count === 0 || typeof IntersectionObserver === 'undefined') {
      hstore.f = 0;
      return;
    }
    const items = Array.from(ol.children) as HTMLElement[];
    let raf = 0;
    let visible = false;
    let last = -1;
    let lastFill = -1;

    const focusLine = (): number => {
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 56;
      if (desktop) return (header + window.innerHeight) / 2;
      const strip = pin.current?.getBoundingClientRect().bottom ?? header;
      return strip + (window.innerHeight - strip) * 0.38;
    };

    const tick = () => {
      raf = 0;
      if (!visible) return;
      const line = focusLine();
      const centers = items.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      let f = 0;
      for (let i = 0; i < centers.length - 1; i += 1) {
        const a = centers[i] ?? 0;
        const b = centers[i + 1] ?? a;
        if (line >= a) f = i + clamp((line - a) / Math.max(1, b - a), 0, 1);
      }
      f = clamp(f, 0, count - 1);
      hstore.f = f;
      const next = Math.round(f);
      if (next !== last) {
        last = next;
        setActive(next);
      }
      const top = ol.getBoundingClientRect().top;
      const fill = Math.round(clamp(line - top, 0, ol.getBoundingClientRect().height));
      if (fill !== lastFill) {
        lastFill = fill;
        ol.style.setProperty('--tl-fill', `${fill}px`);
      }
      raf = window.requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible && raf === 0) raf = window.requestAnimationFrame(tick);
      },
      { rootMargin: '10% 0px 10% 0px' },
    );
    io.observe(root);

    return () => {
      io.disconnect();
      window.cancelAnimationFrame(raf);
      ol.style.removeProperty('--tl-fill');
    };
  }, [container, list, pin, enabled, desktop, count]);

  return enabled ? active : 0;
}
