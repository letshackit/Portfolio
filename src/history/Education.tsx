import { content } from '../data/content';
import type { Credential } from '../data/content.types';
import { revealProps } from '../lib/reveal';
import { ExternalLink } from '../ui/ExternalLink';

function Chips({ items }: { readonly items: readonly Credential[] }) {
  return (
    <ul className="edu__chips">
      {items.map((c) => (
        <li className="edu__chip" key={c.id}>
          <span className="edu__chip-title">{c.title}</span>
          <span className="edu__chip-meta">
            {c.issuer}
            {c.dates ? ` · ${c.dates}` : ''}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Education() {
  const { education } = content.history;
  const { ui } = content;
  return (
    <div className="edu" {...revealProps('block')}>
      <h3 className="edu__heading">{education.heading}</h3>
      <section className="edu__group" aria-labelledby="edu-degrees">
        <h4 id="edu-degrees" className="mono-label">
          {ui.degreesHeading}
        </h4>
        <Chips items={education.degrees} />
      </section>
      <section className="edu__group" aria-labelledby="edu-certs">
        <h4 id="edu-certs" className="mono-label">
          {education.certificationsHeading}
        </h4>
        <Chips items={education.certifications} />
      </section>
      <section className="edu__group" aria-labelledby="edu-pub">
        <h4 id="edu-pub" className="mono-label">
          {education.publicationHeading}
        </h4>
        <ul className="edu__chips">
          <li className="edu__chip">
            <span className="edu__chip-title">{education.publication.title}</span>
            <span className="edu__chip-meta">{education.publication.venue}</span>
            <ExternalLink href={education.publication.url} className="edu__link" icon>
              {ui.journalLabel}
            </ExternalLink>
          </li>
        </ul>
      </section>
    </div>
  );
}
