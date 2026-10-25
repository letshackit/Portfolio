import { ANCHORS } from '../config';
import { content } from '../data/content';
import { anchorHref } from '../lib/anchors';
import { Button } from '../ui/Button';
import { LiveDot } from '../ui/LiveDot';
import { PipelineFrame } from './PipelineFrame';
import { StatusStrip } from './StatusStrip';
import './Hero.css';

export function Hero() {
  const { hero, contact } = content;
  return (
    <section id={ANCHORS.top} aria-labelledby={`${ANCHORS.top}-heading`} className="hero">
      <div className="container">
        <div className="hero__text">
          <p className="hero__eyebrow mono-label">
            <LiveDot tone="amber" live />
            {hero.eyebrow}
          </p>
          <h1 id={`${ANCHORS.top}-heading`}>{hero.headline}</h1>
          <p className="lead hero__subline">{hero.subline}</p>
          <StatusStrip items={hero.strip} />
          <div className="hero__actions">
            <Button variant="primary" href={anchorHref('deployments')} icon="arrow-right">
              {hero.primaryCta}
            </Button>
            <Button variant="secondary" href={contact.resumePath} download={contact.resumeFileName}>
              {hero.secondaryCta}
            </Button>
          </div>
        </div>
        <PipelineFrame />
      </div>
    </section>
  );
}
