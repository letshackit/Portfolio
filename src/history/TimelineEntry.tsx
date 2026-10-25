import type { HistoryEntry } from '../data/content.types';
import { Icon } from '../ui/Icon';

/** One employer: spine, then each role with its own dates, company line, promotion marker and highlights. */
export function TimelineEntry({ entry }: { readonly entry: HistoryEntry }) {
  return (
    <li className="timeline-entry">
      <div className="timeline-entry__spine" aria-hidden="true">
        <span className="timeline-entry__line" />
      </div>
      <article className="timeline-entry__body">
        {entry.roles.map((role) => (
          <div className="timeline-entry__role" key={role.id}>
            <h3>{role.title}</h3>
            <p className="timeline-entry__dates mono-caption">{role.dates}</p>
          </div>
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
