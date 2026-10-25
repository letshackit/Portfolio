import type { CSSProperties } from 'react';
import { ANCHORS } from '../config';
import { content } from '../data/content';
import type { AnchorKey } from '../data/content.types';
import { useReveal } from './useReveal';
import './sectionIntro.css';

interface SplitTitleProps {
  readonly text: string;
  readonly id: string;
}

/** Display heading whose characters rise out of a per-word mask, staggered, when it scrolls into view. The accessible name is the plain text. */
export function SplitTitle({ text, id }: SplitTitleProps) {
  const [ref] = useReveal<HTMLHeadingElement>({ threshold: 0.4 });
  let index = 0;
  const words = text.split(' ').map((word) => [...word].map((ch) => ({ ch, i: index++ })));
  return (
    <h2 id={id} ref={ref} tabIndex={-1} className="split-title" aria-label={text}>
      {words.map((chars, w) => (
        <span key={w} aria-hidden="true">
          <span className="split-title__word">
            {chars.map(({ ch, i }) => (
              <span
                key={i}
                className="split-title__ch"
                data-accent={ch === '.' || undefined}
                style={{ '--i': i } as CSSProperties}
              >
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 ? ' ' : null}
        </span>
      ))}
    </h2>
  );
}

interface SectionIntroProps {
  readonly anchor: AnchorKey;
  readonly heading: string;
  readonly lead?: string;
}

/** Mono eyebrow with the section number, the display title and an optional lead; shared by How I work and Deployments. */
export function SectionIntro({ anchor, heading, lead }: SectionIntroProps) {
  const navIndex = content.nav.findIndex((item) => item.anchor === anchor);
  const item = content.nav[navIndex];
  const [leadRef] = useReveal<HTMLParagraphElement>({ threshold: 0.4 });
  return (
    <div className="section-intro">
      {item ? (
        <p className="section-heading__eyebrow mono-label">
          <span className="section-heading__rule" aria-hidden="true" />
          {String(navIndex + 2).padStart(2, '0')} / {item.label}
        </p>
      ) : null}
      <SplitTitle text={heading} id={`${ANCHORS[anchor]}-heading`} />
      {lead ? (
        <p ref={leadRef} className="section-intro__lead lead fade-up">
          {lead}
        </p>
      ) : null}
    </div>
  );
}
