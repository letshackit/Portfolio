import { content } from '../data/content';

/**
 * The slot both pipeline renderers will share (FR-54). Step 1 reserves the exact box so nothing shifts
 * when the SVG (step 2) and 3D (step 6) arrive; it holds only its caption and is hidden from assistive tech.
 */
export function PipelineFrame() {
  return (
    <div className="pipeline-frame corner-ticks" aria-hidden="true">
      <p className="pipeline-frame__caption mono-caption">{content.ui.pipelineCaption}</p>
    </div>
  );
}
