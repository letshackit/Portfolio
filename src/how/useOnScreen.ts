import { useEffect, useState } from 'react';

/** True while at least `threshold` of the element is on screen, so counters and loops only run when seen. */
export function useOnScreen(ref: { readonly current: Element | null }, threshold: number): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setOn(true);
      return;
    }
    const io = new IntersectionObserver((entries) => setOn(entries.some((e) => e.isIntersecting)), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return on;
}
