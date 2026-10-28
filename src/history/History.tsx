import { content } from '../data/content';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Education } from './Education';
import { Journey } from './Journey';
import './History.css';

export function History() {
  const { history } = content;
  return (
    <Section anchor="history" className="hist-section">
      <SectionHeading anchor="history" heading={history.heading} lead={history.lead || undefined} />
      <Journey />
      <Education />
    </Section>
  );
}
