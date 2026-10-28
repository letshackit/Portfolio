import type { CSSProperties } from 'react';
import { content } from '../data/content';
import { useReveal } from '../lib/useReveal';
import { anchorHref } from '../lib/anchors';
import { onAnchorClick } from '../lib/scroll';
import { Icon } from '../ui/Icon';
import { CapGlyph } from './CapGlyph';
import { capCopy } from './capCopy';
import { lookFor } from './domains';

/**
 * The stacked variant of the capability matrix: four lit cards, each with a miniature of its 3D cluster (hub shape and
 * one satellite per skill). Used on phones and tablets, under reduced motion, without WebGL and with save-data, so
 * every skill and proof line is plain DOM. The cards light up in sequence as the grid scrolls in (useReveal); without
 * motion they are simply lit.
 */
export function CapStack() {
  const { capabilities, ui } = content;
  const [gridRef] = useReveal<HTMLDivElement>({ threshold: 0.1 });
  return (
    <div className="cap-grid" ref={gridRef}>
      {capabilities.groups.map((group, index) => {
        const look = lookFor(group);
        return (
          <article className="cap-card" key={group.id} data-tone={look.tone} style={{ '--i': index } as CSSProperties}>
            <div className="cap-card__head">
              <div className="cap-card__heading">
                <p className="cap-card__eyebrow mono-label">
                  {String(index + 1).padStart(2, '0')} / {group.skills.length} {capCopy.skillsWord}
                </p>
                <h3 className="cap-card__title">{group.name}</h3>
              </div>
              <CapGlyph shape={look.shape} tone={look.tone} skills={group.skills.length} />
            </div>
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
        );
      })}
    </div>
  );
}
