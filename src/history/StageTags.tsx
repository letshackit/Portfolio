import type { Ref } from 'react';
import type { TimelineModel } from './timelineModel';

interface StageTagsProps {
  readonly model: TimelineModel;
  readonly layer: Ref<HTMLDivElement>;
}

/**
 * The words that sit in the scene, as DOM. The stage moves them to their 3D anchors every frame (TagProjector); until
 * then, and whenever there is no live stage, they are invisible. Decoration only: the cards carry the real content and
 * the pips are the one control, so this layer is hidden from assistive tech and never takes the pointer.
 */
export function StageTags({ model, layer }: StageTagsProps) {
  return (
    <div className="tl3__tags" ref={layer} aria-hidden="true">
      {model.stations.map((s, i) => (
        <p className="tl3__tag" data-tag={`s${i}`} key={s.id}>
          <span className="tl3__tag-name">{s.short}</span>
          <span className="tl3__tag-dates">{s.dates}</span>
        </p>
      ))}
      {model.years.map((y) => (
        <p className="tl3__tag tl3__tag--year" data-tag={`y${y.year}`} key={y.year}>
          {y.year}
        </p>
      ))}
    </div>
  );
}
