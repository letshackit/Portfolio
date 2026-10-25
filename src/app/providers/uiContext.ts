import { createContext, useContext } from 'react';
import type { AnchorId } from '../../config';

export interface UiState {
  readonly paletteOpen: boolean;
  readonly activeSection: AnchorId | null;
  readonly selectedStage: string | null;
  /** Bumped by an explicit stage pick; the stepper focuses only when this changes after it mounted (FR-60). */
  readonly stageFocusRequest: number;
  readonly hoveredStage: string | null;
  readonly toast: string | null;
}

export interface UiActions {
  readonly setPaletteOpen: (open: boolean) => void;
  readonly setActiveSection: (id: AnchorId | null) => void;
  readonly setSelectedStage: (id: string | null) => void;
  readonly requestStageFocus: () => void;
  readonly setHoveredStage: (id: string | null) => void;
  readonly showToast: (message: string | null) => void;
}

export type UiContextValue = UiState & UiActions;

export const UiContext = createContext<UiContextValue | null>(null);

export function useUi(): UiContextValue {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUi must be used inside UiProvider');
  return value;
}
