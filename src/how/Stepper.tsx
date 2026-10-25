import { useEffect, useRef } from 'react';
import { useUi } from '../app/providers/uiContext';
import { content } from '../data/content';
import { StagePanel } from './StagePanel';

/** List mode: all seven stages visible, in order (FR-67). Tabs mode arrives in step 2. */
export function Stepper() {
  const { selectedStage } = useUi();
  const selectedRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (selectedStage) selectedRef.current?.focus({ preventScroll: true });
  }, [selectedStage]);

  return (
    <ol className="stepper-list" aria-label={content.ui.stageListLabel}>
      {content.howIWork.stages.map((stage) => {
        const selected = stage.id === selectedStage;
        return (
          <li
            key={stage.id}
            className="stepper-list__item"
            data-selected={selected || undefined}
            tabIndex={selected ? -1 : undefined}
            ref={selected ? selectedRef : undefined}
          >
            <span className="stepper-list__dot" aria-hidden="true" />
            <StagePanel stage={stage} />
          </li>
        );
      })}
    </ol>
  );
}
