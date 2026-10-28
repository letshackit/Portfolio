import { useEffect, type RefObject } from 'react';
import { usePrefs } from '../app/providers/prefsContext';

/** How long to wait for the motion chunk to build ScrollSmoother before settling for native sticky. */
const SMOOTHER_WAIT_MS = 6000;

/**
 * Keeps the 3D stage in view while the cards scroll past. In native scrolling that is plain CSS `position: sticky`
 * (nothing to load). Under ScrollSmoother the content is moved with transforms, which breaks sticky, so the stage is
 * pinned with ScrollTrigger instead, as the How-I-work journey is. GSAP is imported here after mount, so it never joins
 * the entry chunk; if it fails to load, sticky stays and nothing is hidden.
 */
export function usePinStage(
  container: RefObject<HTMLElement | null>,
  pin: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  const { pointerFine, isDesktop, reducedMotion } = usePrefs();

  useEffect(() => {
    const root = container.current;
    const stage = pin.current;
    // ScrollSmoother only exists for a wide, fine-pointer, motion-allowed page (lib/motion.ts).
    if (!root || !stage || !enabled || !isDesktop || !pointerFine || reducedMotion) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const [{ gsap }, { ScrollTrigger }, { ScrollSmoother }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/ScrollSmoother'),
      ]);
      gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
      const started = performance.now();
      while (!disposed && !ScrollSmoother.get() && performance.now() - started < SMOOTHER_WAIT_MS) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
      }
      if (disposed || !ScrollSmoother.get()) return;

      const header = () => document.querySelector('header')?.getBoundingClientRect().height ?? 56;
      root.setAttribute('data-pin', 'st');
      const ctx = gsap.context(() => {
        ScrollTrigger.create({
          trigger: root,
          start: () => `top ${header()}px`,
          end: () => `bottom ${header() + stage.offsetHeight}px`,
          pin: stage,
          pinSpacing: false,
          invalidateOnRefresh: true,
        });
      }, root);
      ScrollTrigger.refresh();
      cleanup = () => {
        ctx.revert();
        root.removeAttribute('data-pin');
      };
    })().catch(() => {
      // The animation chunk did not load: sticky positioning stays in charge.
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [container, pin, enabled, isDesktop, pointerFine, reducedMotion]);
}
