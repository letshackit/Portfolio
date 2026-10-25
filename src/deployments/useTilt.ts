import { useEffect, type RefObject } from 'react';

const MAX_X = 4.5;
const MAX_Y = 6;
const RATE = 9;
const REST = 0.0005;

/**
 * Pointer tilt for a card: the frame follows the mouse with a frame-rate independent lerp, the glare orb trails it.
 * Writes only `transform`. `frame` is the stationary element that measures the pointer; `tilt` is what rotates.
 * Mouse only, so touch scrolling is never fought; nothing runs while the pointer is away and the card has settled.
 */
export function useTilt(
  frame: RefObject<HTMLElement | null>,
  tilt: RefObject<HTMLElement | null>,
  orb: RefObject<HTMLElement | null>,
  enabled: boolean,
): void {
  useEffect(() => {
    const host = frame.current;
    const el = tilt.current;
    const glare = orb.current;
    if (!enabled || !host || !el) return;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let width = 1;
    let height = 1;
    let raf = 0;
    let last = 0;

    const draw = () => {
      el.style.transform = `perspective(1100px) rotateX(${(-cy * MAX_X).toFixed(3)}deg) rotateY(${(cx * MAX_Y).toFixed(3)}deg)`;
      if (glare) glare.style.transform = `translate3d(${(cx * width * 0.5).toFixed(1)}px,${(cy * height * 0.5).toFixed(1)}px,0)`;
    };

    const frameStep = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = 1 - Math.exp(-RATE * dt);
      cx += (tx - cx) * k;
      cy += (ty - cy) * k;
      draw();
      if (Math.abs(tx - cx) + Math.abs(ty - cy) < REST && tx === 0 && ty === 0) {
        cx = 0;
        cy = 0;
        el.style.transform = '';
        if (glare) glare.style.transform = '';
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(frameStep);
    };

    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frameStep);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = host.getBoundingClientRect();
      width = r.width;
      height = r.height;
      tx = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5)) * 2;
      ty = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5)) * 2;
      wake();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      wake();
    };

    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = '';
      if (glare) glare.style.transform = '';
    };
  }, [frame, tilt, orb, enabled]);
}
