import type { CSSProperties } from 'react';
import { content } from '../data/content';
import { SectionIntro } from '../how/SplitTitle';
import { useReveal } from '../how/useReveal';
import { anchorHref } from '../lib/anchors';
import { onAnchorClick } from '../lib/scroll';
import { Icon } from '../ui/Icon';
import { Section } from '../ui/Section';
import './Capabilities.css';

export function Capabilities() {
  const { capabilities, ui } = content;
  // One observer for the grid; the cards stagger off --i (CSS). Never armed under reduced motion.
  const [gridRef] = useReveal<HTMLDivElement>({ threshold: 0.12 });
  return (
    <Section anchor="capabilities" className="stage-world cap">
      <SectionIntro anchor="capabilities" heading={capabilities.heading} lead={capabilities.lead || undefined} />
      <div className="cap-grid" ref={gridRef}>
        {capabilities.groups.map((group, index) => (
          <article className="cap-card" key={group.id} style={{ '--i': index } as CSSProperties}>
            <p className="cap-card__eyebrow mono-label">
              {String(index + 1).padStart(2, '0')} / {group.name}
            </p>
            <h3 className="cap-card__title">{group.name}</h3>
            <ul className="cap-card__skills">
              {group.skills.map((skill) => (
                <li key={skill} className="cap-chip">
                  {skill}
                </li>
              ))}
            </ul>
            <div className="cap-card__proof">
              <p className="mono-label">{ui.proofLabel}</p>
              <a className="cap-card__link" href={anchorHref(group.anchor)} onClick={onAnchorClick}>
                {group.proof}
                <Icon name="arrow-right" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
