import type { ReactNode } from 'react';
import { ANCHORS } from '../config';
import type { AnchorKey } from '../data/content.types';

interface SectionProps {
  readonly anchor: AnchorKey;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Page section: id from ANCHORS, labelled by its heading. Offscreen pause and reveal hooks arrive in later steps. */
export function Section({ anchor, children, className }: SectionProps) {
  const id = ANCHORS[anchor];
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={className ? `section ${className}` : 'section'}
    >
      <div className="container">{children}</div>
    </section>
  );
}
