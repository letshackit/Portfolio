import type { ReactNode } from 'react';
import { content } from '../data/content';
import type { PipelineStage } from '../data/content.types';
import { flightCopy } from './flightCopy';
import { CountUp } from './CountUp';

interface StagePanelProps {
  readonly stage: PipelineStage;
  /** True while this stage is the active one: its figures count up. */
  readonly play: boolean;
  /** What the work at this stage is called (COLLECT, DESIGN, SHIP...), shown above the artifact. */
  readonly verb?: string;
  /** Shown at the foot of the card: what comes next, ghosted. */
  readonly footer?: ReactNode;
  /** Percent of the product built once this stage is done (14 ... 100): shown top right. */
  readonly built?: number;
}

/** One stage card body: name, what it is, and the artifact it produced with its numbers. */
export function StagePanel({ stage, play, verb, footer, built }: StagePanelProps) {
  const num = String(stage.index).padStart(2, '0');
  return (
    <div className="stage-panel">
      <span className="stage-panel__ghost" aria-hidden="true">
        {num}
      </span>
      <div className="stage-panel__top">
        <p className="mono-label stage-panel__label">
          {num} · {stage.shortLabel}
        </p>
        <span className="stage-panel__led" data-play={play || undefined} aria-hidden="true" />
        {built !== undefined ? (
          <span className="mono-caption stage-panel__built">
            {flightCopy.meter} <b>{built}%</b>
          </span>
        ) : null}
      </div>
      <h3>{stage.name}</h3>
      <p className="stage-panel__summary">{stage.summary}</p>
      {verb ? (
        <p className="mono-label stage-panel__verb">
          <span className="stage-panel__verb-rule" aria-hidden="true" />
          {verb}
        </p>
      ) : null}
      <div className="stage-panel__artifact">
        <p className="mono-label">{content.ui.artifactLabel}</p>
        <p className="stage-panel__text">{stage.artifact}</p>
        {stage.numbers.length > 0 ? (
          <ul className="stage-panel__numbers">
            {stage.numbers.map((n) => (
              <li className="stage-panel__number" key={n.label}>
                <CountUp className="mono-metric" value={n.value} play={play} />
                <span className="mono-caption">{n.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {footer}
    </div>
  );
}
