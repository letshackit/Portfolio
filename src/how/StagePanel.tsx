import { content } from '../data/content';
import type { PipelineStage } from '../data/content.types';

/** One stage: name, what it is, and the artifact it produced with its numbers. */
export function StagePanel({ stage }: { readonly stage: PipelineStage }) {
  return (
    <div className="stage-panel">
      <p className="mono-label">
        {String(stage.index).padStart(2, '0')} · {stage.shortLabel}
      </p>
      <h3>{stage.name}</h3>
      <p>{stage.summary}</p>
      <div className="stage-panel__artifact">
        <p className="mono-label">{content.ui.artifactLabel}</p>
        <p className="stage-panel__text">{stage.artifact}</p>
        {stage.numbers.length > 0 ? (
          <ul className="stage-panel__numbers">
            {stage.numbers.map((n) => (
              <li className="stage-panel__number" key={n.label}>
                <span className="mono-metric">{n.value}</span>
                <span className="mono-caption">{n.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
