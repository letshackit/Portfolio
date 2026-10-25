import { useEffect, type RefObject } from 'react';
import { usePrefs } from '../app/providers/prefsContext';

const LIT_ATTRIBUTE = 'data-lit';

/**
 * Draws the rail as the visitor scrolls and lights each node when the line reaches it. GSAP is imported here, after
 * mount, so it never joins the entry chunk. Everything is lit and fully drawn until this arms itself (no JS, a failed
 * import, reduced motion): the timeline is never hidden by default.
 */
export function useTimelineDraw(root: RefObject<HTMLElement | null>): void {
  const { reducedMotion } = usePrefs();

  useEffect(() => {
    const el = root.current;
    if (!el || reducedMotion) return;
    const rail = Array.from(el.querySelectorAll<SVGLineElement>('.tl__rail line'));
    const nodes = Array.from(el.querySelectorAll<HTMLElement>('[data-tl-node]'));
    if (rail.length === 0) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);
        let thresholds: number[] = [];
        const measure = () => {
          const box = el.getBoundingClientRect();
          thresholds = nodes.map((n) => {
            const dot = n.querySelector<HTMLElement>('[data-tl-dot]') ?? n;
            const r = dot.getBoundingClientRect();
            return box.height > 0 ? (r.top + r.height / 2 - box.top) / box.height : 0;
          });
        };
        const light = (progress: number) => {
          nodes.forEach((n, i) => {
            const on = progress >= (thresholds[i] ?? 0);
            if (on) n.setAttribute(LIT_ATTRIBUTE, '');
            else n.removeAttribute(LIT_ATTRIBUTE);
          });
        };
        const ctx = gsap.context(() => {
          measure();
          el.setAttribute('data-armed', '');
          gsap.fromTo(
            rail,
            { strokeDashoffset: 1 },
            {
              strokeDashoffset: 0,
              ease: 'none',
              // Nodes follow the drawn line itself (not the raw scroll), so one never lights before the line arrives.
              onUpdate() {
                light(this.progress());
              },
              scrollTrigger: {
                trigger: el,
                start: 'top 62%',
                end: 'bottom 58%',
                scrub: 0.5,
                onRefresh: () => measure(),
              },
            },
          );
        }, el);
        cleanup = () => {
          ctx.revert();
          el.removeAttribute('data-armed');
          nodes.forEach((n) => n.setAttribute(LIT_ATTRIBUTE, ''));
        };
      })
      .catch(() => {
        // The animation chunk did not load: the timeline stays fully drawn and lit.
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [root, reducedMotion]);
}
