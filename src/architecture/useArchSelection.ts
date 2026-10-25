import { useCallback, useMemo, useState } from 'react';

export interface ArchSelection {
  /** Node currently lit: a pinned node wins over hover and focus. */
  readonly active: string | null;
  readonly pinned: string | null;
  readonly enter: (id: string) => void;
  readonly leave: () => void;
  readonly focus: (id: string) => void;
  readonly blur: () => void;
  readonly toggle: (id: string) => void;
  readonly clear: () => void;
}

/** Highlight state of the diagram (architecture §D.3). Lives in Architecture so the caption can read it. */
export function useArchSelection(): ArchSelection {
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  const enter = useCallback((id: string) => setHover(id), []);
  const leave = useCallback(() => setHover(null), []);
  const focus = useCallback((id: string) => {
    setHover(id);
    setPinned(null);
  }, []);
  const blur = useCallback(() => setHover(null), []);
  const toggle = useCallback((id: string) => setPinned((p) => (p === id ? null : id)), []);
  const clear = useCallback(() => {
    setHover(null);
    setPinned(null);
  }, []);

  return useMemo(
    () => ({ active: pinned ?? hover, pinned, enter, leave, focus, blur, toggle, clear }),
    [pinned, hover, enter, leave, focus, blur, toggle, clear],
  );
}
