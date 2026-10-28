import { useMemo } from 'react';
import { content } from '../data/content';
import { buildModel, monthLabel } from './timelineModel';

/**
 * The opening frame's supporting panel: the whole career as one time axis before the stage starts. One bar per employer,
 * newest first, drawn on a shared scale (so the lengths are the real tenures), the promotion as an amber tick. It is
 * derived from the same model as the stage and the cards, and decorative: the cards carry the words.
 */
export function CareerIndex() {
  const { entries } = content.history;
  const model = useMemo(() => buildModel(entries, new Date()), [entries]);
  const pct = (m: number) => `${(((m - model.min) / model.span) * 100).toFixed(2)}%`;
  return (
    <aside className="hist-index" aria-hidden="true">
      <p className="hist-index__head mono-label">
        <span>Time axis</span>
        <span className="hist-index__range">
          {monthLabel(model.min)} → Now
        </span>
      </p>
      <ol className="hist-index__rows">
        {model.stations.map((s, i) => (
          <li className="hist-index__row" key={s.id} data-now={s.current ? '' : undefined}>
            <span className="hist-index__n mono-caption">{String(i + 1).padStart(2, '0')}</span>
            <span className="hist-index__name">{s.short}</span>
            <span className="hist-index__track">
              <i className="hist-index__bar" style={{ left: pct(s.start), width: `${(((s.end - s.start) / model.span) * 100).toFixed(2)}%` }} />
              {s.promotion ? <i className="hist-index__promo" style={{ left: pct(s.promotion.at) }} /> : null}
            </span>
            <span className="hist-index__len mono-caption">{Math.round(s.end - s.start)} mo</span>
          </li>
        ))}
      </ol>
      <p className="hist-index__legend mono-caption">
        <span className="hist-index__item">
          <span className="hist-index__key hist-index__key--cyan" />
          Employer
        </span>
        <span className="hist-index__item">
          <span className="hist-index__key hist-index__key--amber" />
          Promotion · present
        </span>
      </p>
    </aside>
  );
}
