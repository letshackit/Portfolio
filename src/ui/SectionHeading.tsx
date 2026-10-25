import { ANCHORS } from '../config';
import { content } from '../data/content';
import type { AnchorKey } from '../data/content.types';

interface SectionHeadingProps {
  readonly anchor: AnchorKey;
  readonly heading: string;
  readonly lead?: string;
}

/** Mono eyebrow "NN / NAME", then the h2, then an optional lead. Numbers follow the nav order; the hero is 01. */
export function SectionHeading({ anchor, heading, lead }: SectionHeadingProps) {
  const navIndex = content.nav.findIndex((item) => item.anchor === anchor);
  const item = content.nav[navIndex];
  const number = String(navIndex + 2).padStart(2, '0');
  return (
    <div className="section-heading">
      {item ? (
        <p className="section-heading__eyebrow mono-label">
          <span className="section-heading__rule" aria-hidden="true" />
          {number} / {item.label}
        </p>
      ) : null}
      <h2 id={`${ANCHORS[anchor]}-heading`} tabIndex={-1}>
        {heading}
      </h2>
      {lead ? <p className="section-heading__lead lead">{lead}</p> : null}
    </div>
  );
}
