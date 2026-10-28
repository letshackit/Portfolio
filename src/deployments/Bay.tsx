import { type CSSProperties } from 'react';
import { content } from '../data/content';
import type { Bay as BayModel } from '../data/deployment-bays';
import { CountUp } from '../how/CountUp';
import { splitMetric } from '../how/splitMetric';
import { useReveal } from '../how/useReveal';
import { Chip } from '../ui/Chip';
import { StatusBadge } from '../ui/StatusBadge';
import { badgeVariantFor } from '../ui/badgeVariant';
import { BayStage } from './BayStage';

interface BayProps {
  readonly bay: BayModel;
  /** Zero-based position. */
  readonly index: number;
  readonly total: number;
}

/** One flagship bay: title block, the live 3D architecture, then the figures and what was done. */
export function Bay({ bay, index, total }: BayProps) {
  const { ui } = content;
  const [ref, revealed] = useReveal<HTMLElement>({ threshold: 0.1, rootMargin: '0px 0px -4% 0px' });
  const no = String(index + 1).padStart(2, '0');
  const titleId = `deployments-${bay.id}-title`;
  return (
    <article
      ref={ref}
      id={`deployments-${bay.id}`}
      className="dpl-bay"
      data-bay={bay.id}
      data-index={index}
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="dpl-bay__head" style={{ '--n': 0 } as CSSProperties}>
        <p className="mono-label dpl-bay__kicker dpl-reveal">
          <span className="dpl-bay__rule" aria-hidden="true" />
          {ui.deploymentPrefix} {no} / {String(total).padStart(2, '0')}
        </p>
        <h3 id={titleId} className="dpl-bay__title dpl-reveal" style={{ '--n': 1 } as CSSProperties}>
          {bay.name}
          <span className="dpl-bay__ghost" aria-hidden="true">
            {no}
          </span>
        </h3>
        <p className="lead dpl-bay__desc dpl-reveal" style={{ '--n': 2 } as CSSProperties}>
          {bay.description}
        </p>
        <div className="dpl-bay__meta dpl-reveal" style={{ '--n': 3 } as CSSProperties}>
          <StatusBadge variant={badgeVariantFor(bay.status)} size="lg">
            {bay.status}
          </StatusBadge>
          <ul className="dpl-bay__chips" aria-label={ui.stackLabel}>
            {bay.stack.map((s) => (
              <li key={s}>
                <Chip>{s}</Chip>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <BayStage bay={bay} index={index} />

      <div className="dpl-bay__facts dpl-reveal" style={{ '--n': 4 } as CSSProperties}>
        {bay.metrics.length > 0 ? (
          <ul className="dpl-metrics" aria-label={ui.metricsLabel} data-count={bay.metrics.length}>
            {bay.metrics.map((m) => {
              const parts = splitMetric(m);
              return (
                <li key={m}>
                  <span className="visually-hidden">{m}</span>
                  {parts ? (
                    <span className="dpl-metric" aria-hidden="true">
                      <CountUp className="mono-metric dpl-metric__fig" value={parts.figure} play={revealed} />
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
        <ul className="bullets dpl-bay__details">
          {bay.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
