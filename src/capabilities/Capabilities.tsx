import { content } from '../data/content';
import { anchorHref } from '../lib/anchors';
import { onAnchorClick } from '../lib/scroll';
import { Icon } from '../ui/Icon';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import './Capabilities.css';

export function Capabilities() {
  const { capabilities, ui } = content;
  return (
    <Section anchor="capabilities">
      <SectionHeading anchor="capabilities" heading={capabilities.heading} lead={capabilities.lead || undefined} />
      <div className="cap-grid">
        {capabilities.groups.map((group, index) => (
          <article className="cap-card" key={group.id}>
            <p className="mono-label">
              {String(index + 1).padStart(2, '0')} / {group.name}
            </p>
            <h3>{group.name}</h3>
            <ul className="cap-card__skills">
              {group.skills.map((skill) => (
                <li key={skill}>{skill}</li>
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
