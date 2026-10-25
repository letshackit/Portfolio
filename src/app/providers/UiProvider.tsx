import { useMemo, useState, type ReactNode } from 'react';
import type { AnchorId } from '../../config';
import { UiContext, type UiContextValue } from './uiContext';

/** Shared interface state. Step 1 only reads selectedStage; the rest is wired by later steps. */
export function UiProvider({ children }: { readonly children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<AnchorId | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [toast, showToast] = useState<string | null>(null);

  const value = useMemo<UiContextValue>(
    () => ({
      paletteOpen,
      activeSection,
      selectedStage,
      hoveredStage,
      toast,
      setPaletteOpen,
      setActiveSection,
      setSelectedStage,
      setHoveredStage,
      showToast,
    }),
    [paletteOpen, activeSection, selectedStage, hoveredStage, toast],
  );
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
