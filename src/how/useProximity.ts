import { useEffect, useState, type RefObject } from 'react';

/**
 * True from when the element comes within `near` of the viewport until it has left by more than `far`. The 3D canvas
 * mounts on the way in and is released (GPU memory, context) on the way out, so only one heavy scene lives at a time.
 */
export function useProximity(ref: RefObject<Element | null>, near = '150%', far = '450%'): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setOn(true);
      return;
    }
    const nearIo = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setOn(true);
      },
      { rootMargin: `${near} 0px` },
    );
    const farIo = new IntersectionObserver(
      (entries) => {
        if (entries.length > 0 && !entries.some((e) => e.isIntersecting)) setOn(false);
      },
      { rootMargin: `${far} 0px` },
    );
    nearIo.observe(el);
    farIo.observe(el);
    return () => {
      nearIo.disconnect();
      farIo.disconnect();
    };
  }, [ref, near, far]);
  return on;
}
