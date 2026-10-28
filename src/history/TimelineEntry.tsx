import type { HistoryEntry } from '../data/content.types';
import { Icon } from '../ui/Icon';
import type { Station } from './timelineModel';

export type StationState = 'active' | 'passed' | 'ahead';

/** The role dates that mean "still here" get the amber live dot; the text itself is untouched. */
const isCurrent = (dates: string) => /present/i.test(dates);

interface TimelineEntryProps {
  readonly entry: HistoryEntry;
  readonly station: Station;
  readonly index: number;
  readonly total: number;
  readonly state: StationState;
}

/**
 * One employer as a glass station card. Everything the copy says is in the markup at all times; on desktop the
 * description folds open when the visitor arrives at the station (CSS, keyed on data-state), and every state is a
 * complete, readable card.
 */
export function TimelineEntry({ entry, station, index, total, state }: TimelineEntryProps) {
  const group = entry.company.slice(station.short.length).trim();
  return (
    <li className="tl3__item" data-tl-item data-state={state} data-promoted={entry.marker ? '' : undefined}>
      <span className="tl3__dot" aria-hidden="true" />
      <article className="tl3__card">
        <p className="tl3__index mono-label" aria-hidden="true">
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </p>
        <h3 className="tl3__company">
          {station.short}
          {group ? <span className="tl3__group"> {group}</span> : null}
        </h3>
        <p className="tl3__where mono-label">{entry.location}</p>
        {entry.marker ? (
          <p className="tl3__promo mono-label">
            <Icon name="arrow-up" />
            {entry.marker}
          </p>
        ) : null}
        <ul className="tl3__roles">
          {entry.roles.map((role) => (
            <li className="tl3__role" key={role.id}>
              <p className="tl3__dates mono-caption">
                {isCurrent(role.dates) ? <span className="tl3__now" aria-hidden="true" /> : null}
                {role.dates}
              </p>
              <p className="tl3__role-title">{role.title}</p>
            </li>
          ))}
        </ul>
        <div className="tl3__more">
          <div className="tl3__more-inner">
            <ul className="bullets tl3__bullets">
              {entry.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        </div>
      </article>
    </li>
  );
}
