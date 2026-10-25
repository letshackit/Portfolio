import { content } from '../data/content';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Stepper } from './Stepper';
import './HowIWork.css';

export function HowIWork() {
  const { howIWork } = content;
  return (
    <Section anchor="howIWork">
      <SectionHeading anchor="howIWork" heading={howIWork.heading} lead={howIWork.lead || undefined} />
      <p className="how-tools mono-caption">
        <span className="how-tools__mark" aria-hidden="true" />
        {howIWork.toolsLine}
      </p>
      <Stepper />
    </Section>
  );
}
