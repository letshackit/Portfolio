import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { bayCopy, bays } from '../data/deployment-bays';
import { badgeVariantFor } from '../ui/badgeVariant';
import { LiveDot } from '../ui/LiveDot';

interface BayRailProps {
  readonly active: number;
  readonly onPick: (index: number) => void;
  /** The element the rail pins inside: from its top to its end. */
  readonly wrapRef: RefObject<HTMLElement | null>;
}

/** The selector rail: four bays, the one on screen lit, a click jumps there. Pinned under the header while the bays pass. */
export function BayRail({ active, onPick, wrapRef }: BayRailProps) {
  const { reducedMotion, isDesktop, pointerFine } = usePrefs();
  const railRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    const wrap = wrapRef.current;
    if (!rail || !wrap || reducedMotion || !isDesktop || !pointerFine) return;
    let cancelled = false;
    let release: (() => void) | null = null;
    void import('./railMotion').then((m) => m.pinRail(rail, wrap, () => cancelled)).then((fn) => {
      if (cancelled) fn?.();
      else release = fn;
    });
    return () => {
      cancelled = true;
      release?.();
    };
  }, [reducedMotion, isDesktop, pointerFine, wrapRef]);

  // The band behind the pill only shows once the rail is stuck under the header; at rest it would be a dark bar on the page.
  useEffect(() => {
    const rail = railRef.current;
    const sentinel = sentinelRef.current;
    if (!rail || !sentinel || typeof IntersectionObserver === 'undefined') return;
    const header = document.querySelector('header')?.getBoundingClientRect().height ?? 56;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry) rail.toggleAttribute('data-stuck', !entry.isIntersecting && entry.boundingClientRect.top < header);
      },
      { rootMargin: `-${Math.round(header)}px 0px 0px 0px` },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <>
    <span ref={sentinelRef} className="dpl-rail__sentinel" aria-hidden="true" />
    <div ref={railRef} className="dpl-rail" style={{ '--i': active, '--count': bays.length } as CSSProperties}>
      <div role="group" className="dpl-rail__pill" aria-label={bayCopy.railLabel}>
        <p className="mono-label dpl-rail__label">{bayCopy.railLabel}</p>
        <ol className="dpl-rail__list">
          {bays.map((b, i) => {
            const live = badgeVariantFor(b.status) === 'live';
            return (
              <li key={b.id}>
                <button type="button" className="dpl-rail__item" aria-current={active === i ? 'true' : undefined} onClick={() => onPick(i)}>
                  <span className="dpl-rail__num mono-label">{String(i + 1).padStart(2, '0')}</span>
                  <span className="dpl-rail__name">{b.name}</span>
                  <LiveDot tone={live ? 'amber' : 'cyan'} hollow={b.status === 'Scoping'} live={live && active === i} />
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
    </>
  );
}
