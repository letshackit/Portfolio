import { content } from '../data/content';
import { Section } from '../ui/Section';
import { SectionIntro } from '../ui/SectionIntro';
import { CareerIndex } from './CareerIndex';
import { Journey } from './Journey';
import './History.css';

export function History() {
  const { history } = content;
  return (
    <Section anchor="history" className="hist-section">
      <div className="hist-head">
        <SectionIntro anchor="history" heading={history.heading} lead={history.lead || undefined} />
        <CareerIndex />
      </div>
      <Journey />
    </Section>
  );
}
