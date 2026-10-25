import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { content } from '../data/content';
import type { Deployment } from '../data/content.types';
import { anchorHref } from '../lib/anchors';
import { refresh } from '../lib/scroll';
import { CountUp } from '../how/CountUp';
import { splitMetric } from '../how/splitMetric';
import { useReveal } from '../how/useReveal';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { badgeVariantFor } from '../ui/badgeVariant';
import { LiveDot } from '../ui/LiveDot';
import { TravelGlyph } from './TravelGlyph';
import { useTilt } from './useTilt';

interface DeploymentCardProps {
  readonly deployment: Deployment;
  /** Zero-based position, for the "Deployment 01" label. */
  readonly index: number;
  readonly primary?: boolean;
}

/** Matches the CSS height transition on the details region. */
const COLLAPSE_MS = 520;

/** Details open and close per card; cards start closed and do not affect each other (FR-75). */
export function DeploymentCard({ deployment, index, primary = false }: DeploymentCardProps) {
  const { reducedMotion, pointerFine } = usePrefs();
  const { ui, deployments } = content;
  const [expanded, setExpanded] = useState(false);
  // `visible` keeps the region rendered while it collapses; `grown` drives the height transition one frame after it mounts.
  const [visible, setVisible] = useState(false);
  const [grown, setGrown] = useState(false);
  const [cardRef, revealed] = useReveal<HTMLElement>({ threshold: 0.12 });
  const tiltRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLSpanElement>(null);
  useTilt(cardRef, tiltRef, orbRef, pointerFine && !reducedMotion);

  const regionId = `deploy-${deployment.id}-details`;
  const buttonId = `deploy-${deployment.id}-toggle`;
  const live = badgeVariantFor(deployment.status) === 'live';

  useEffect(() => {
    if (expanded) {
      setVisible(true);
      let second = 0;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => setGrown(true));
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }
    setGrown(false);
    const timer = window.setTimeout(() => setVisible(false), COLLAPSE_MS);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  // The page grows or shrinks when details toggle; tell the smoother and scroll triggers once the expand has settled.
  useEffect(() => {
    const timer = window.setTimeout(refresh, COLLAPSE_MS + 40);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  return (
    <article
      ref={cardRef}
      className={primary ? 'deploy-card deploy-card--primary' : 'deploy-card'}
      style={{ '--col': index % 2 } as CSSProperties}
    >
      <div ref={tiltRef} className="deploy-card__tilt corner-ticks">
        <span className="deploy-card__edge" aria-hidden="true" />
        <span className="deploy-card__glare" aria-hidden="true">
          <span ref={orbRef} className="deploy-card__orb" />
        </span>
        <div className="deploy-card__top">
          <p className="deploy-card__status mono-label" data-live={live || undefined}>
            <LiveDot tone={live ? 'amber' : 'cyan'} live={live} />
            {deployment.status}
          </p>
          <p className="mono-label deploy-card__no">
            {ui.deploymentPrefix} {String(index + 1).padStart(2, '0')}
          </p>
        </div>
        <div className="deploy-card__main">
          <div className="deploy-card__copy">
            <h3 className="deploy-card__title">{deployment.name}</h3>
            <p className="deploy-card__desc">{deployment.description}</p>
            <ul className="deploy-card__chips" aria-label={ui.stackLabel}>
              {deployment.stack.map((s) => (
                <li key={s}>
                  <Chip>{s}</Chip>
                </li>
              ))}
            </ul>
          </div>
          {primary ? <TravelGlyph lit={revealed} /> : null}
        </div>
        {deployment.metrics.length > 0 ? (
          <ul className="deploy-card__metrics" aria-label={ui.metricsLabel}>
            {deployment.metrics.map((m) => {
              const parts = splitMetric(m);
              return (
                <li key={m}>
                  <span className="visually-hidden">{m}</span>
                  {parts ? (
                    <span className="deploy-card__metric" aria-hidden="true">
                      <CountUp className="mono-metric" value={parts.figure} play={revealed} />
                      <span className="mono-caption">{parts.caption}</span>
                    </span>
                  ) : (
                    <span className="mono-value" aria-hidden="true">
                      {m}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="deploy-card__actions">
          <Button
            id={buttonId}
            variant="secondary"
            className="deploy-card__toggle"
            onClick={() => setExpanded((v) => !v)}
            expanded={expanded}
            controls={regionId}
            icon="chevron-down"
          >
            {deployments.detailsLabel}
          </Button>
          {deployment.link ? (
            <Button variant="link" href={anchorHref(deployment.link.anchor)} icon="arrow-right">
              {deployment.link.label}
            </Button>
          ) : null}
        </div>
        <div
          id={regionId}
          role="region"
          aria-labelledby={buttonId}
          hidden={!visible}
          data-open={grown || undefined}
          className="deploy-card__details"
        >
          <div className="deploy-card__details-clip">
            <ul className="bullets">
              {deployment.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}
