import { content } from '../data/content';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Education } from './Education';
import { TimelineEntry } from './TimelineEntry';
import './History.css';

export function History() {
  const { history } = content;
  return (
    <Section anchor="history">
      <SectionHeading anchor="history" heading={history.heading} lead={history.lead || undefined} />
      <ol className="timeline">
        {history.entries.map((entry) => (
          <TimelineEntry key={entry.id} entry={entry} />
        ))}
      </ol>
      <Education />
    </Section>
  );
}
