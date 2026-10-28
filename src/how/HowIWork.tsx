import { ANCHORS } from '../config';
import { content } from '../data/content';
import { Pipeline } from './Pipeline';
import { SectionIntro } from './SplitTitle';
import './HowIWork.css';

/**
 * How I work. The intro sits in the page container; the pipeline below it breaks out to the full width, because the
 * flight is a framed stage, not a column of text. Same id and heading id as ever, so anchors, the skip links and the
 * palette keep landing here.
 */
export function HowIWork() {
  const { howIWork } = content;
  const id = ANCHORS.howIWork;
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="section stage-world how">
      <div className="container">
        <SectionIntro anchor="howIWork" heading={howIWork.heading} lead={howIWork.lead || undefined} />
        <p className="how-tools mono-caption">
          <span className="how-tools__mark" aria-hidden="true" />
          {howIWork.toolsLine}
        </p>
      </div>
      <Pipeline />
    </section>
  );
}
