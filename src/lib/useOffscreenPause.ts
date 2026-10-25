import { useEffect, useState, type RefObject } from 'react';
import { usePrefs } from '../app/providers/prefsContext';

/** Share of the element that must be on screen for animation to run (architecture B.5). */
const VISIBLE_RATIO = 0.1;

/** True while less than 10 % of the element is on screen or the tab is hidden, so running animation can pause (NFR-10). */
export function useOffscreenPause(ref: RefObject<Element | null>): boolean {
  const { tabHidden } = usePrefs();
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setOffscreen(!entry.isIntersecting || entry.intersectionRatio < VISIBLE_RATIO);
      },
      { threshold: [0, VISIBLE_RATIO] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return offscreen || tabHidden;
}
