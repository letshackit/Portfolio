import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BREAKPOINTS } from '../../config';
import { PrefsContext, type Prefs } from './prefsContext';

/** Tracks one media query; false where matchMedia does not exist (tests, very old browsers). */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

function useTabHidden(): boolean {
  const [hidden, setHidden] = useState<boolean>(() => document.hidden);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return hidden;
}

export function PrefsProvider({ children }: { readonly children: ReactNode }) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const pointerFine = useMediaQuery('(pointer: fine)');
  const isWide = useMediaQuery(`(min-width: ${BREAKPOINTS.wide}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.desktop}px)`);
  const tabHidden = useTabHidden();

  const value = useMemo<Prefs>(
    () => ({ reducedMotion, pointerFine, isWide, isDesktop, tabHidden }),
    [reducedMotion, pointerFine, isWide, isDesktop, tabHidden],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}
