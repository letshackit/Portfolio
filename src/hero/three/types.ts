import type { MutableRefObject } from 'react';
import type { PipelineLayout } from '../../lib/pipelineLayout';

export type ThreeFailReason = 'contextlost' | 'slow' | 'error';

/** The contract between PipelineFrame and the lazy 3D chunk (architecture C.6). Type-only: safe to import eagerly. */
export interface Pipeline3DProps {
  readonly layout: PipelineLayout;
  /** The frame element: receives the projected node positions as CSS custom properties. */
  readonly frameEl: HTMLElement;
  /** Index of the hovered or focused stage, written by the frame, read each frame by the scene. */
  readonly hoveredStage: MutableRefObject<number | null>;
  readonly onArrive?: (stage: number) => void;
  readonly paused: boolean;
  readonly pointerFine: boolean;
  /** Called once, after the first frame has rendered. */
  readonly onReady: () => void;
  readonly onFail: (reason: ThreeFailReason) => void;
}
