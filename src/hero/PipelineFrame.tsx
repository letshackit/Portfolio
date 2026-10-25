import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { useUi } from '../app/providers/uiContext';
import { TIMING } from '../config';
import { content } from '../data/content';
import { layoutFor } from '../lib/pipelineLayout';
import { supportsWebGL } from '../lib/webgl';
import { LiveDot } from '../ui/LiveDot';
import { PipelineOverlay } from './PipelineOverlay';
import { PipelineSvg } from './PipelineSvg';
import { ThreeBoundary } from './three/ThreeBoundary';
import type { Pipeline3DProps } from './three/types';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import './PipelineFrame.css';

type Pipeline3DComponent = ComponentType<Pipeline3DProps>;

interface NavigatorWithConnection {
  readonly connection?: { readonly saveData?: boolean };
}

/** Resolves true once the hero text is painted in its final font and the browser is idle (FR-53, NFR-7). */
async function waitForQuiet(): Promise<void> {
  if (document.fonts) await document.fonts.ready;
  await new Promise<void>((resolve) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => resolve());
    else window.setTimeout(resolve, 300);
  });
}

/** Imports the 3D chunk, or rejects after the load timeout (architecture C.6 step 4). */
function loadPipeline3D(): Promise<Pipeline3DComponent> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('3D chunk timed out')), TIMING.threeLoadTimeout);
  });
  const load = import('./three/Pipeline3D').then((m) => m.Pipeline3D);
  return Promise.race([load, timeout]).finally(() => window.clearTimeout(timer));
}

/**
 * The slot both pipeline renderers share (FR-54). CSS fixes its size by aspect-ratio, so the SVG here and the 3D
 * canvas fill the same box with no layout shift. The SVG and the overlay render at once; the 3D chunk is requested
 * only on wide screens with WebGL, motion allowed and no save-data, after fonts and an idle moment. Any failure
 * leaves the SVG in place with no message (FR-57).
 */
export function PipelineFrame() {
  const { isWide, reducedMotion, pointerFine } = usePrefs();
  const { hoveredStage } = useUi();
  const ref = useRef<HTMLDivElement | null>(null);
  const [frameEl, setFrameEl] = useState<HTMLDivElement | null>(null);
  const paused = useOffscreenPause(ref);
  const layout = layoutFor(isWide);
  const stages = content.howIWork.stages;

  const [Scene3D, setScene3D] = useState<Pipeline3DComponent | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const hovered = useRef<number | null>(null);

  const saveData = (navigator as Navigator & NavigatorWithConnection).connection?.saveData === true;
  const eligible = isWide && !reducedMotion && !saveData;
  const show = eligible && !failed && Scene3D !== null && frameEl !== null;

  // Loading gate. Nothing past the eligibility check runs on phones, with reduced motion or with save-data.
  useEffect(() => {
    if (!eligible || failed || Scene3D) return;
    let cancelled = false;
    void (async () => {
      try {
        await waitForQuiet();
        if (cancelled || !supportsWebGL()) return;
        const component = await loadPipeline3D();
        if (!cancelled) setScene3D(() => component);
      } catch (error) {
        if (import.meta.env.DEV) console.warn('3D hero unavailable, keeping the SVG', error);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eligible, failed, Scene3D]);

  useEffect(() => {
    if (!show) setReady(false);
  }, [show]);

  useEffect(() => {
    hovered.current = hoveredStage === null ? null : stages.findIndex((s) => s.id === hoveredStage);
  }, [hoveredStage, stages]);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);
  const attach = useCallback((el: HTMLDivElement | null) => {
    ref.current = el;
    setFrameEl(el);
  }, []);

  const mode = show ? (ready ? '3d' : 'loading') : 'svg';

  return (
    <div
      ref={attach}
      className="pipeline-frame corner-ticks"
      data-orientation={layout.orientation}
      data-mode={mode}
      data-paused={paused ? '' : undefined}
    >
      <p className="pipeline-frame__caption mono-caption" aria-hidden="true">
        {content.ui.pipelineCaption}
        <LiveDot tone="amber" live />
      </p>
      <PipelineSvg layout={layout} stageIds={stages.map((s) => s.id)} hoveredId={hoveredStage} />
      {show && Scene3D && frameEl && (
        <div className="pipeline-frame__canvas" aria-hidden="true">
          <ThreeBoundary onError={onFail}>
            <Scene3D
              layout={layout}
              frameEl={frameEl}
              hoveredStage={hovered}
              paused={paused}
              pointerFine={pointerFine}
              onReady={onReady}
              onFail={onFail}
            />
          </ThreeBoundary>
        </div>
      )}
      <PipelineOverlay layout={layout} stages={stages} label={content.ui.heroStagesLabel} />
    </div>
  );
}
