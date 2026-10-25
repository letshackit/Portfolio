import { content } from '../data/content';
import { Section } from '../ui/Section';
import { Stepper } from './Stepper';
import { SectionIntro } from './SplitTitle';
import './HowIWork.css';

export function HowIWork() {
  const { howIWork } = content;
  return (
    <Section anchor="howIWork" className="stage-world how">
      <SectionIntro anchor="howIWork" heading={howIWork.heading} lead={howIWork.lead || undefined} />
      <p className="how-tools mono-caption">
        <span className="how-tools__mark" aria-hidden="true" />
        {howIWork.toolsLine}
      </p>
      <Stepper />
    </Section>
  );
}
