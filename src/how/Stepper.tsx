import { useEffect, useRef, type KeyboardEvent } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { useUi } from '../app/providers/uiContext';
import { content } from '../data/content';
import { StagePanel } from './StagePanel';

const stages = content.howIWork.stages;

/** Tabs on wide screens (FR-65, FR-66), the plain list on narrow ones (FR-67). */
export function Stepper() {
  const { isWide } = usePrefs();
  return isWide ? <StepperTabs /> : <StepperList />;
}

/** List mode: all seven stages visible, in order (FR-67). The stage chosen in the hero is focused on arrival. */
function StepperList() {
  const { selectedStage, stageFocusRequest } = useUi();
  const seenRequest = useRef(stageFocusRequest);
  const selectedRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    if (stageFocusRequest === seenRequest.current) return;
    seenRequest.current = stageFocusRequest;
    if (selectedStage) selectedRef.current?.focus({ preventScroll: true });
  }, [selectedStage, stageFocusRequest]);

  return (
    <ol className="stepper-list" aria-label={content.ui.stageListLabel}>
      {stages.map((stage) => {
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

/** Tabs mode: roving tabindex, Left/Right/Home/End move the selection and focus with it (FR-66). */
function StepperTabs() {
  const { selectedStage, setSelectedStage, stageFocusRequest, requestStageFocus } = useUi();
  const seenRequest = useRef(stageFocusRequest);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = Math.max(
    0,
    stages.findIndex((s) => s.id === selectedStage),
  );
  const active = stages[activeIndex];

  // Focus follows an explicit pick (hero click, tab click, arrows), never a remount or a resize (FR-60).
  useEffect(() => {
    if (stageFocusRequest === seenRequest.current) return;
    seenRequest.current = stageFocusRequest;
    tabRefs.current[activeIndex]?.focus({ preventScroll: true });
  }, [stageFocusRequest, activeIndex]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: number;
    switch (e.key) {
      case 'ArrowRight':
        next = (activeIndex + 1) % stages.length;
        break;
      case 'ArrowLeft':
        next = (activeIndex - 1 + stages.length) % stages.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = stages.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setSelectedStage(stages[next].id);
    requestStageFocus();
  };

  return (
    <div className="stepper-tabs">
      <div
        className="stepper-tabs__rail"
        role="tablist"
        aria-label={content.ui.stageListLabel}
        aria-orientation="horizontal"
        onKeyDown={onKeyDown}
      >
        {stages.map((stage, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              id={`stage-tab-${stage.id}`}
              className="stepper-tabs__tab"
              aria-selected={selected}
              aria-controls={`stage-panel-${stage.id}`}
              tabIndex={selected ? 0 : -1}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              onClick={() => {
                setSelectedStage(stage.id);
                requestStageFocus();
              }}
            >
              <span className="stepper-tabs__dot" aria-hidden="true" />
              <span className="mono-label stepper-tabs__num">{String(stage.index).padStart(2, '0')}</span>
              <span className="mono-label stepper-tabs__name">{stage.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <div
        key={active.id}
        className="stepper-tabs__panel"
        role="tabpanel"
        id={`stage-panel-${active.id}`}
        aria-labelledby={`stage-tab-${active.id}`}
        tabIndex={0}
      >
        <StagePanel stage={active} />
      </div>
    </div>
  );
}
