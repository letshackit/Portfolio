import { useRef } from 'react';
import { content } from '../data/content';
import { Section } from '../ui/Section';
import { SectionHeading } from '../ui/SectionHeading';
import { Credentials } from '../credentials/Credentials';
import { TimelineEntry } from './TimelineEntry';
import { useTimelineDraw } from './useTimelineDraw';
import './History.css';

export function History() {
  const { history } = content;
  const timeline = useRef<HTMLDivElement>(null);
  useTimelineDraw(timeline);
  return (
    <Section anchor="history" className="hist-section">
      <SectionHeading anchor="history" heading={history.heading} lead={history.lead || undefined} />
      <div className="tl" ref={timeline}>
        <svg className="tl__rail" aria-hidden="true" focusable="false">
          <line className="tl__rail-glow" x1="1" y1="0" x2="1" y2="100%" pathLength="1" />
          <line className="tl__rail-line" x1="1" y1="0" x2="1" y2="100%" pathLength="1" />
        </svg>
        <ol className="tl__list">
          {history.entries.map((entry, i) => (
            <TimelineEntry key={entry.id} entry={entry} index={i} />
          ))}
        </ol>
      </div>
      <Credentials />
    </Section>
  );
}
