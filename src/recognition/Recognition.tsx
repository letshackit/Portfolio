import { useEffect, useRef, type CSSProperties } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { content } from '../data/content';
import type { Quote } from '../data/content.types';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import { Section } from '../ui/Section';
import { SectionIntro } from '../ui/SectionIntro';
import { FeaturedQuote, MarqueeQuote } from './QuoteCard';
import './Recognition.css';

const FEATURED_ID = 'itc';

interface RowProps {
  readonly label: string;
  readonly quotes: readonly Quote[];
  readonly reverse?: boolean;
  readonly seconds: number;
}

/**
 * Rebuilds the decorative loop: the track becomes two identical halves, each at least one viewport wide, so it can
 * translate by exactly half its width and never show a gap. The real list stays the only copy React renders; clones are
 * aria-hidden DOM added here, so screen readers and find-in-page see each note once. Returns a cleanup.
 */
function buildLoop(viewport: HTMLElement, track: HTMLElement): () => void {
  const firstHalf = track.firstElementChild as HTMLElement | null;
  const set = firstHalf?.firstElementChild as HTMLElement | null;
  if (!firstHalf || !set) return () => undefined;

  const clones: HTMLElement[] = [];
  const clearClones = () => {
    clones.splice(0).forEach((c) => c.remove());
    track.removeAttribute('data-ready');
  };
  const rebuild = () => {
    clearClones();
    const width = set.offsetWidth;
    if (width === 0) return;
    const copies = Math.max(1, Math.ceil(viewport.clientWidth / width));
    const decoy = (): HTMLElement => {
      const c = set.cloneNode(true) as HTMLElement;
      c.setAttribute('aria-hidden', 'true');
      c.removeAttribute('aria-label');
      c.setAttribute('data-dup', '');
      clones.push(c);
      return c;
    };
    for (let i = 1; i < copies; i += 1) firstHalf.append(decoy());
    const secondHalf = document.createElement('div');
    secondHalf.className = firstHalf.className;
    secondHalf.setAttribute('aria-hidden', 'true');
    secondHalf.setAttribute('data-dup', '');
    for (let i = 0; i < copies; i += 1) secondHalf.append(decoy());
    clones.push(secondHalf);
    track.append(secondHalf);
    track.setAttribute('data-ready', '');
  };

  rebuild();
  let width = viewport.clientWidth;
  const observer = new ResizeObserver(() => {
    if (viewport.clientWidth !== width) {
      width = viewport.clientWidth;
      rebuild();
    }
  });
  observer.observe(viewport);
  return () => {
    observer.disconnect();
    clearClones();
  };
}

/** One marquee row. Hover, focus and off-screen all pause it; reduced motion keeps the single real set, scrollable. */
function MarqueeRow({ label, quotes, reverse = false, seconds }: RowProps) {
  const { reducedMotion } = usePrefs();
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const paused = useOffscreenPause(viewport);

  useEffect(() => {
    if (reducedMotion || typeof ResizeObserver === 'undefined') return;
    if (!viewport.current || !track.current) return;
    return buildLoop(viewport.current, track.current);
  }, [reducedMotion, quotes]);

  return (
    <div
      ref={viewport}
      className="marquee"
      data-reverse={reverse || undefined}
      data-paused={paused || undefined}
      style={{ '--marquee-seconds': `${seconds}s` } as CSSProperties}
    >
      <div className="marquee__track" ref={track}>
        <div className="marquee__half">
          <ul className="marquee__set" aria-label={label}>
            {quotes.map((q) => (
              <li key={q.id}>
                <MarqueeQuote quote={q} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Recognition() {
  const { recognition } = content;
  const featured = recognition.quotes.find((q) => q.id === FEATURED_ID);
  const rest = recognition.quotes.filter((q) => q.id !== FEATURED_ID);
  const rowA = rest.filter((_, i) => i % 2 === 0);
  const rowB = rest.filter((_, i) => i % 2 === 1);
  return (
    <Section anchor="recognition" className="rec-section">
      <SectionIntro anchor="recognition" heading={recognition.heading} lead={recognition.lead} />
      {featured ? <FeaturedQuote quote={featured} /> : null}
      <div className="marquee-stack">
        <MarqueeRow label={`${recognition.heading} 1`} quotes={rowA} seconds={70} />
        <MarqueeRow label={`${recognition.heading} 2`} quotes={rowB} reverse seconds={82} />
      </div>
    </Section>
  );
}
