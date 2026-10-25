import type { HistoryEntry } from '../data/content.types';
import { Icon } from '../ui/Icon';

/** One employer: dates column, spine, then roles, company line, promotion marker and highlights. */
export function TimelineEntry({ entry }: { readonly entry: HistoryEntry }) {
  return (
    <li className="timeline-entry">
      <div className="timeline-entry__dates mono-caption">
        {entry.roles.map((role) => (
          <p key={role.id}>{role.dates}</p>
        ))}
      </div>
      <div className="timeline-entry__spine" aria-hidden="true" />
      <article className="timeline-entry__body">
        {entry.roles.map((role) => (
          <h3 key={role.id}>{role.title}</h3>
        ))}
        <p className="timeline-entry__company mono-caption">
          {entry.company} · {entry.location}
        </p>
        {entry.marker ? (
          <p className="timeline-entry__marker mono-label">
            <Icon name="arrow-up" />
            {entry.marker}
          </p>
        ) : null}
        <ul className="bullets">
          {entry.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </article>
    </li>
  );
}
