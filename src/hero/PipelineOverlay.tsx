import { useEffect, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { useUi } from '../app/providers/uiContext';
import { ANCHORS, TIMING } from '../config';
import type { PipelineStage } from '../data/content.types';
import { toPercent, type PipelineLayout } from '../lib/pipelineLayout';
import { scrollToAnchor } from '../lib/scroll';

interface PipelineOverlayProps {
  readonly layout: PipelineLayout;
  readonly stages: readonly PipelineStage[];
  readonly label: string;
}

/**
 * One button per stage, positioned over the graphic from the same coordinates the renderer uses (ADR-006).
 * Tab order is DOM order is pipeline order (FR-61); the list is the screen-reader text equivalent (FR-62).
 */
export function PipelineOverlay({ layout, stages, label }: PipelineOverlayProps) {
  const { pointerFine } = usePrefs();
  const { hoveredStage, selectedStage, setHoveredStage, setSelectedStage } = useUi();
  const [tipId, setTipId] = useState<string | null>(null);

  // The tooltip follows hover/focus after a short delay; it is derived, so leaving hides it at once.
  useEffect(() => {
    if (hoveredStage === null) return;
    const timer = window.setTimeout(() => setTipId(hoveredStage), TIMING.tooltipDelay);
    return () => window.clearTimeout(timer);
  }, [hoveredStage]);

  const select = (stage: PipelineStage) => {
    setSelectedStage(stage.id);
    void scrollToAnchor(ANCHORS.howIWork, { focus: false });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLOListElement>) => {
    if (e.key === 'Escape') {
      setHoveredStage(null);
      setTipId(null);
    }
  };

  return (
    <ol className="pipeline-overlay" data-label={layout.label} aria-label={label} onKeyDown={onKeyDown}>
      {stages.map((stage, i) => {
        const pos = toPercent(layout.nodes[i], layout);
        // The 3D projector writes --px-i / --py-i on the frame; the static percentages are the fallback (C.3).
        const style = { '--px': `var(--px-${i}, ${pos.left})`, '--py': `var(--py-${i}, ${pos.top})` } as CSSProperties;
        const tipDomId = `stage-tip-${stage.id}`;
        const showTip = hoveredStage === stage.id && tipId === stage.id;
        return (
          <li key={stage.id} className="pipeline-overlay__item" style={style}>
            <button
              type="button"
              className="stage"
              data-stage={i}
              data-active={selectedStage === stage.id || undefined}
              aria-label={`${stage.name} (${stage.index}/${stages.length})`}
              aria-describedby={tipDomId}
              onClick={() => select(stage)}
              onFocus={() => setHoveredStage(stage.id)}
              onBlur={() => setHoveredStage(null)}
              onPointerEnter={() => {
                if (pointerFine) setHoveredStage(stage.id);
              }}
              onPointerLeave={() => {
                if (pointerFine) setHoveredStage(null);
              }}
            >
              <span className="stage__num" aria-hidden="true">
                {String(stage.index).padStart(2, '0')}
              </span>
              <span className="stage__label mono-label" aria-hidden="true">
                {stage.shortLabel}
              </span>
            </button>
            <div role="tooltip" id={tipDomId} className="stage-tip" hidden={!showTip}>
              <span className="stage-tip__name mono-label">{stage.name}</span>
              <span className="stage-tip__text">{stage.artifact}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
