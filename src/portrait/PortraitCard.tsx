import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { content } from '../data/content';
import './PortraitCard.css';

/** Maximum tilt in degrees on either axis. */
const MAX_TILT_DEG = 6;
/** Share of the card that must be on screen before the scan sweep runs. */
const REVEAL_RATIO = 0.35;
/** Fraction of the remaining distance covered per 60 Hz frame (the lerp). */
const LERP = 0.12;
/** The loop stops once both axes are this close to their target, in degrees. */
const SETTLE_DEG = 0.01;
/** Sheen travel, in px, at full tilt. */
const SHEEN_PX = 40;

type ScanState = 'idle' | 'armed' | 'run' | 'done';

/**
 * "The human behind the console": the stylised, duotone portrait in a glass card.
 * Nothing is hidden by CSS or markup alone (FR-7): the scan veil is armed by this component only when motion
 * is allowed, and the portrait is plainly visible in every other case. Tilt and sheen are transform-only.
 */
export function PortraitCard() {
  const { meta, contact } = content;
  const { reducedMotion, pointerFine } = usePrefs();
  const stageRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const sheenRef = useRef<HTMLDivElement>(null);
  const [scan, setScan] = useState<ScanState>('idle');
  const canAnimate = !reducedMotion && typeof IntersectionObserver !== 'undefined';

  // Arm before first paint so the portrait never flashes in front of the sweep.
  useLayoutEffect(() => {
    setScan(canAnimate ? 'armed' : 'idle');
  }, [canAnimate]);

  // Run the sweep once, the first time the card is on screen.
  useEffect(() => {
    const el = stageRef.current;
    if (scan !== 'armed' || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setScan('run');
          io.disconnect();
        }
      },
      { threshold: REVEAL_RATIO },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [scan]);

  // Pointer tilt: a rAF loop that lerps toward the pointer target and sleeps once settled.
  useEffect(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    const sheen = sheenRef.current;
    if (!stage || !tilt || !sheen || reducedMotion || !pointerFine) return;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;

    const apply = () => {
      tilt.style.transform = `rotateX(${cy.toFixed(3)}deg) rotateY(${cx.toFixed(3)}deg)`;
      sheen.style.transform = `translate3d(${((cx / MAX_TILT_DEG) * SHEEN_PX).toFixed(2)}px, ${((-cy / MAX_TILT_DEG) * SHEEN_PX).toFixed(2)}px, 0)`;
    };
    const tick = () => {
      cx += (tx - cx) * LERP;
      cy += (ty - cy) * LERP;
      apply();
      if (Math.abs(tx - cx) < SETTLE_DEG && Math.abs(ty - cy) < SETTLE_DEG) {
        cx = tx;
        cy = ty;
        apply();
        raf = 0;
        if (tx === 0 && ty === 0) delete stage.dataset.active;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    const wake = () => {
      stage.dataset.active = '';
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      tx = Math.max(-1, Math.min(1, nx)) * MAX_TILT_DEG;
      ty = Math.max(-1, Math.min(1, ny)) * -MAX_TILT_DEG;
      wake();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      wake();
    };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    return () => {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
      tilt.style.transform = '';
      sheen.style.transform = '';
      delete stage.dataset.active;
    };
  }, [reducedMotion, pointerFine]);

  return (
    <figure className="portrait-card" data-scan={scan} aria-label={`${meta.name}, portrait`}>
      <div ref={stageRef} className="portrait-card__stage">
        <div ref={tiltRef} className="portrait-card__tilt corner-ticks">
          <div className="portrait-card__frame">
            <div className="portrait-card__bg" aria-hidden="true" />
            <img
              className="portrait-card__img"
              src="/portrait/harshal-duotone.webp"
              width={982}
              height={1200}
              alt={`${meta.name}, smiling, in sunglasses and a polo shirt; the photo is rendered in the site's cyan duotone.`}
              decoding="async"
              loading="lazy"
              draggable={false}
            />
            <div ref={sheenRef} className="portrait-card__sheen" aria-hidden="true" />
            <div className="portrait-card__grain" aria-hidden="true" />
            <div className="portrait-card__hud">
              <span className="mono-label portrait-card__tag">The human behind the console</span>
            </div>
            <div className="portrait-card__caption">
              <span className="portrait-card__name mono-label">
                {meta.name} <span aria-hidden="true">·</span> {meta.currentRole}, {meta.employer}
              </span>
              <span className="portrait-card__status mono-label">{contact.badge}</span>
            </div>
            <div
              className="portrait-card__veil"
              aria-hidden="true"
              onAnimationEnd={() => setScan((s) => (s === 'run' ? 'done' : s))}
            >
              <span className="portrait-card__scanline" />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mono-caption portrait-card__credit">Harshal, off-duty</figcaption>
    </figure>
  );
}
