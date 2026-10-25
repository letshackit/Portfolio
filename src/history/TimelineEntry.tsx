import type { HistoryEntry } from '../data/content.types';
import { revealProps } from '../lib/reveal';
import { Icon } from '../ui/Icon';

/** The role dates that mean "still here" get the amber live dot; the text itself is untouched. */
const isCurrent = (dates: string) => /present/i.test(dates);

/** One employer as a glass node on the rail: company in display type, one row per role, promotion tag, highlights. */
export function TimelineEntry({ entry, index }: { readonly entry: HistoryEntry; readonly index: number }) {
  return (
    <li className="tl__entry" data-tl-node data-lit="">
      <span className="tl__dot" data-tl-dot aria-hidden="true" />
      <article className="tl__card" {...revealProps('block')}>
        <p className="tl__index mono-label" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </p>
        <h3 className="tl__company">{entry.company}</h3>
        <p className="tl__where mono-label">{entry.location}</p>
        {entry.marker ? (
          <p className="tl__promo mono-label">
            <Icon name="arrow-up" />
            {entry.marker}
          </p>
        ) : null}
        <ul className="tl__roles">
          {entry.roles.map((role) => (
            <li className="tl__role" key={role.id}>
              <p className="tl__role-title">{role.title}</p>
              <p className="tl__dates mono-caption">
                {isCurrent(role.dates) ? <span className="tl__now" aria-hidden="true" /> : null}
                {role.dates}
              </p>
            </li>
          ))}
        </ul>
        <ul className="bullets tl__bullets">
          {entry.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </article>
    </li>
  );
}
