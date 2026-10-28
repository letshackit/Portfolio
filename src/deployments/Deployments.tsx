import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { bayCopy, bays } from '../data/deployment-bays';
import { SectionIntro } from '../ui/SectionIntro';
import { Section } from '../ui/Section';
import { Bay } from './Bay';
import { BayRail } from './BayRail';
import './Deployments.css';

/** Document offset of an element, ignoring any transform (ScrollSmoother moves the page by transform). */
function documentTop(el: HTMLElement): number {
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node.id !== 'smooth-content' && node !== document.body) {
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return top;
}

/**
 * Deployments: four flagship bays, each with its own live 3D architecture, behind one pinned selector rail. Scrolling
 * moves bay to bay (each system assembles as it arrives); the rail lights the bay on screen and jumps to any other.
 */
export function Deployments() {
  const { reducedMotion } = usePrefs();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  // The bay whose middle band is on screen is the active one.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.index);
          if (Number.isFinite(i)) setActive(i);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    wrap.querySelectorAll('[data-bay]').forEach((el) => {
      if (el.tagName === 'ARTICLE') io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const pick = useCallback(
    (index: number) => {
      const wrap = wrapRef.current;
      const target = wrap?.querySelectorAll<HTMLElement>('article[data-bay]')[index];
      if (!target) return;
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 56;
      const rail = wrap?.querySelector<HTMLElement>('.dpl-rail')?.offsetHeight ?? 0;
      window.scrollTo({ top: documentTop(target) - header - rail - 16, behavior: reducedMotion ? 'auto' : 'smooth' });
      setActive(index);
      window.setTimeout(() => target.focus({ preventScroll: true }), reducedMotion ? 0 : 700);
    },
    [reducedMotion],
  );

  return (
    <Section anchor="deployments" className="stage-world dpl">
      <SectionIntro anchor="deployments" heading={bayCopy.heading} lead={bayCopy.lead} />
      <div className="dpl-bays" ref={wrapRef}>
        <BayRail active={active} onPick={pick} wrapRef={wrapRef} />
        {bays.map((bay, i) => (
          <Bay key={bay.id} bay={bay} index={i} total={bays.length} />
        ))}
      </div>
    </Section>
  );
}
