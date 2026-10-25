import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ANCHORS, type AnchorId } from '../../config';
import { UiContext, type UiContextValue } from './uiContext';

/** Section order as on the page; the last one inside the observer band wins. */
const SECTION_IDS: readonly AnchorId[] = [
  ANCHORS.top,
  ANCHORS.howIWork,
  ANCHORS.deployments,
  ANCHORS.architecture,
  ANCHORS.capabilities,
  ANCHORS.history,
  ANCHORS.recognition,
  ANCHORS.contact,
];

/** A thin band across the upper middle of the viewport (architecture E.2). */
const ACTIVE_BAND = '-40% 0px -55% 0px';

/** Shared interface state: palette, toast, stage selection and the section in view (FR-27). */
export function UiProvider({ children }: { readonly children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<AnchorId | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [stageFocusRequest, setStageFocusRequest] = useState(0);
  const requestStageFocus = useCallback(() => setStageFocusRequest((n) => n + 1), []);
  const [hoveredStage, setHoveredStage] = useState<string | null>(null);
  const [toast, showToast] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const inBand = new Set<AnchorId>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id as AnchorId;
          if (entry.isIntersecting) inBand.add(id);
          else inBand.delete(id);
        }
        const current = [...SECTION_IDS].reverse().find((id) => inBand.has(id)) ?? null;
        // The hero is the page start: no link is current there.
        setActiveSection(current === ANCHORS.top ? null : current);
      },
      { rootMargin: ACTIVE_BAND, threshold: 0 },
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const value = useMemo<UiContextValue>(
    () => ({
      paletteOpen,
      activeSection,
      selectedStage,
      stageFocusRequest,
      hoveredStage,
      toast,
      setPaletteOpen,
      setActiveSection,
      setSelectedStage,
      requestStageFocus,
      setHoveredStage,
      showToast,
    }),
    [paletteOpen, activeSection, selectedStage, stageFocusRequest, requestStageFocus, hoveredStage, toast],
  );
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}
