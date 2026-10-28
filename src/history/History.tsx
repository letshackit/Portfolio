import { content } from '../data/content';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { CareerIndex } from './CareerIndex';
import { Journey } from './Journey';
import './History.css';

export function History() {
  const { history } = content;
  return (
    <Section anchor="history" className="hist-section">
      <div className="hist-head">
        <SectionHeading anchor="history" heading={history.heading} lead={history.lead || undefined} />
        <CareerIndex />
      </div>
      <Journey />
    </Section>
  );
}
