import { useState } from 'react';
import { content } from '../data/content';
import type { Deployment } from '../data/content.types';
import { anchorHref } from '../lib/anchors';
import { Button } from '../ui/Button';
import { Chip } from '../ui/Chip';
import { badgeVariantFor } from '../ui/badgeVariant';
import { StatusBadge } from '../ui/StatusBadge';

interface DeploymentCardProps {
  readonly deployment: Deployment;
  /** Zero-based position, for the "Deployment 01" label. */
  readonly index: number;
  readonly primary?: boolean;
}

/** Details open and close per card; cards start closed and do not affect each other (FR-75). */
export function DeploymentCard({ deployment, index, primary = false }: DeploymentCardProps) {
  const [open, setOpen] = useState(false);
  const { ui, deployments } = content;
  const regionId = `deploy-${deployment.id}-details`;
  const buttonId = `deploy-${deployment.id}-toggle`;

  return (
    <article className={primary ? 'deploy-card deploy-card--primary corner-ticks' : 'deploy-card'}>
      <div className="deploy-card__head">
        <div>
          <p className="mono-label">
            {ui.deploymentPrefix} {String(index + 1).padStart(2, '0')}
          </p>
          <h3>{deployment.name}</h3>
        </div>
        <StatusBadge variant={badgeVariantFor(deployment.status)}>{deployment.status}</StatusBadge>
      </div>
      <p className="deploy-card__desc">{deployment.description}</p>
      <ul className="deploy-card__chips" aria-label={ui.stackLabel}>
        {deployment.stack.map((s) => (
          <li key={s}>
            <Chip>{s}</Chip>
          </li>
        ))}
      </ul>
      {deployment.metrics.length > 0 ? (
        <ul className="deploy-card__metrics" aria-label={ui.metricsLabel}>
          {deployment.metrics.map((m) => (
            <li className="mono-value" key={m}>
              {m}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="deploy-card__actions">
        <Button
          id={buttonId}
          variant="secondary"
          onClick={() => setOpen((v) => !v)}
          expanded={open}
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
      <div id={regionId} role="region" aria-labelledby={buttonId} hidden={!open} className="deploy-card__details">
        <ul className="bullets">
          {deployment.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
