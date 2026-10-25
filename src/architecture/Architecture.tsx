import { content } from '../data/content';
import { travelDeskArchitecture } from '../data/traveldesk-architecture';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { ArchNodeList } from './ArchNodeList';
import './Architecture.css';

/** "Front end: Next.js." becomes label "Front end", value "Next.js." (facts are authored as one string each). */
function splitFact(fact: string): { readonly label: string; readonly value: string } {
  const at = fact.indexOf(': ');
  if (at < 0) return { label: '', value: fact };
  return { label: fact.slice(0, at), value: fact.slice(at + 2) };
}

export function Architecture() {
  const { architecture, ui } = content;
  const proposed = travelDeskArchitecture.status === 'proposed';
  return (
    <Section anchor="architecture">
      <SectionHeading anchor="architecture" heading={architecture.heading} />
      <dl className="arch-facts" aria-label={ui.factsLabel}>
        {architecture.facts.map((fact) => {
          const { label, value } = splitFact(fact);
          return (
            <div className="arch-facts__row" key={label || value}>
              <dt className="mono-label">{label}</dt>
              <dd className="mono-value">{value}</dd>
            </div>
          );
        })}
      </dl>
      {proposed ? (
        <p className="arch-banner mono-label" role="note">
          {architecture.proposedBanner}
        </p>
      ) : null}
      <ArchNodeList model={travelDeskArchitecture} />
    </Section>
  );
}
