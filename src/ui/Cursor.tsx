import { useEffect, useRef } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import './Cursor.css';

const LERP = 0.18;
const SETTLED_PX = 0.1;
const TARGET_SELECTOR = 'a, button, [role="button"], [role="tab"], [role="option"]';
const TEXT_SELECTOR = 'p, li, blockquote, h1, h2, h3';

/** Mounts only for a fine pointer without reduced motion (FR-9); the system cursor is never hidden. */
export function Cursor() {
  const { pointerFine, reducedMotion } = usePrefs();
  return pointerFine && !reducedMotion ? <Reticle /> : null;
}

function Reticle() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pos = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let frame = 0;
    let seen = false;
    let touched = false;

    const draw = () => {
      pos.x += (target.x - pos.x) * LERP;
      pos.y += (target.y - pos.y) * LERP;
      el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      const settled = Math.abs(target.x - pos.x) < SETTLED_PX && Math.abs(target.y - pos.y) < SETTLED_PX;
      frame = settled ? 0 : requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      if (touched || event.pointerType === 'touch') return;
      target.x = event.clientX;
      target.y = event.clientY;
      if (!seen) {
        seen = true;
        pos.x = target.x;
        pos.y = target.y;
        el.dataset.visible = 'true';
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onOver = (event: PointerEvent) => {
      const node = event.target instanceof Element ? event.target : null;
      const onTarget = node?.closest(TARGET_SELECTOR) != null;
      const onText = !onTarget && node?.closest(TEXT_SELECTOR) != null;
      el.classList.toggle('is-target', onTarget);
      el.classList.toggle('is-text', onText);
    };
    const onLeave = () => {
      delete el.dataset.visible;
      seen = false;
    };
    const onTouch = () => {
      touched = true;
      delete el.dataset.visible;
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerover', onOver);
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('touchstart', onTouch, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('touchstart', onTouch);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="cursor" aria-hidden="true">
      <span className="cursor__ring" />
    </div>
  );
}
