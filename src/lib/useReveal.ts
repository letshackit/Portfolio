import { useLayoutEffect, useRef, useState } from 'react';
import { usePrefs } from '../app/providers/prefsContext';

interface RevealOptions {
  readonly threshold?: number;
  readonly rootMargin?: string;
}

/**
 * Scroll reveal without GSAP. The element is "armed" (hidden by CSS) in a layout effect, before the first paint, and
 * flips to "in" once when it enters the viewport. Without IntersectionObserver or under reduced motion it is never
 * armed, so content is always readable. Returns whether the element has been revealed (for count-ups).
 */
export function useReveal<T extends HTMLElement>({ threshold = 0.18, rootMargin = '0px 0px -6% 0px' }: RevealOptions = {}) {
  const { reducedMotion } = usePrefs();
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }
    el.setAttribute('data-armed', '');
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        el.setAttribute('data-in', '');
        setRevealed(true);
        io.disconnect();
      },
      { threshold, rootMargin },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute('data-armed');
      el.removeAttribute('data-in');
    };
  }, [reducedMotion, threshold, rootMargin]);

  return [ref, revealed] as const;
}
