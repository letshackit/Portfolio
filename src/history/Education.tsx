import { content } from '../data/content';
import type { Credential } from '../data/content.types';
import { ExternalLink } from '../ui/ExternalLink';

function CredentialList({ items }: { readonly items: readonly Credential[] }) {
  return (
    <ul className="edu-card__list">
      {items.map((c) => (
        <li key={c.id}>
          <p className="edu-card__title">{c.title}</p>
          <p className="mono-caption">
            {c.issuer}
            {c.dates ? ` · ${c.dates}` : ''}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function Education() {
  const { education } = content.history;
  const { ui } = content;
  return (
    <div className="education">
      <h3>{education.heading}</h3>
      <div className="education__grid">
        <section className="edu-card" aria-labelledby="edu-degrees">
          <h4 id="edu-degrees" className="mono-label">
            {ui.degreesHeading}
          </h4>
          <CredentialList items={education.degrees} />
        </section>
        <section className="edu-card" aria-labelledby="edu-certs">
          <h4 id="edu-certs" className="mono-label">
            {education.certificationsHeading}
          </h4>
          <CredentialList items={education.certifications} />
        </section>
        <section className="edu-card" aria-labelledby="edu-pub">
          <h4 id="edu-pub" className="mono-label">
            {education.publicationHeading}
          </h4>
          <p className="edu-card__title">{education.publication.title}</p>
          <p className="mono-caption">{education.publication.venue}</p>
          <ExternalLink href={education.publication.url} className="edu-card__link" icon>
            {ui.journalLabel}
          </ExternalLink>
        </section>
      </div>
    </div>
  );
}
