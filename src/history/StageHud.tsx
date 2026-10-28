import { monthLabel, type TimelineModel } from './timelineModel';

interface StageHudProps {
  readonly model: TimelineModel;
  readonly active: number;
  readonly onJump: (index: number) => void;
  readonly live: boolean;
}

/** Hairline frame with corner ticks, same grammar as the hero's. Decoration only. */
function Frame() {
  return (
    <div className="tl3__frame" aria-hidden="true">
      <i className="tl3__tick tl3__tick--tl" />
      <i className="tl3__tick tl3__tick--tr" />
      <i className="tl3__tick tl3__tick--bl" />
      <i className="tl3__tick tl3__tick--br" />
    </div>
  );
}

/**
 * The labels laid over the stage: the time axis, the station counter, and one button per employer. The buttons are the
 * keyboard route through the timeline (they scroll the matching card to the focus line); the rest is decoration, and the
 * cards carry all the real content.
 */
export function StageHud({ model, active, onJump, live }: StageHudProps) {
  const total = model.stations.length;
  const station = model.stations[active];
  return (
    <div className="tl3__hud">
      <Frame />
      <p className="tl3__axis mono-label" aria-hidden="true">
        <i className="tl3__axis-dot" />
        Time axis
        <span className="tl3__axis-range">
          {monthLabel(model.min)} <span aria-hidden="true">→</span> Now
        </span>
      </p>
      <div className="tl3__readout" aria-hidden="true">
        <p className="tl3__count">
          <span className="tl3__count-n">{String(active + 1).padStart(2, '0')}</span>
          <span className="tl3__count-of"> / {String(total).padStart(2, '0')}</span>
        </p>
        <p className="tl3__here mono-label">{station?.short}</p>
        <p className="tl3__when mono-caption">{station?.dates}</p>
        {station ? (
          <p className="tl3__len mono-caption">
            {Math.round(station.end - station.start)} mo · {station.roles.length} {station.roles.length === 1 ? 'role' : 'roles'}
          </p>
        ) : null}
      </div>
      <div className="tl3__pips" role="group" aria-label="Jump to a role">
        {model.stations.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="tl3__pip"
            data-active={i === active ? '' : undefined}
            aria-label={`${s.short}, ${s.dates}`}
            aria-current={i === active ? 'step' : undefined}
            onClick={() => onJump(i)}
          >
            <span className="tl3__pip-dot" aria-hidden="true" />
            <span className="tl3__pip-name mono-label" aria-hidden="true">
              {s.short}
            </span>
          </button>
        ))}
      </div>
      <p className="tl3__hint mono-label" aria-hidden="true">
        {live ? 'Scroll to travel back in time' : 'Career, most recent first'}
      </p>
    </div>
  );
}
