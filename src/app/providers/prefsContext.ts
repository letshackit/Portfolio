import { createContext, useContext } from 'react';

export interface Prefs {
  readonly reducedMotion: boolean;
  readonly pointerFine: boolean;
  /** Viewport at or above the "wide" breakpoint (768 px). */
  readonly isWide: boolean;
  /** Viewport at or above the "desktop" breakpoint (1024 px). */
  readonly isDesktop: boolean;
  readonly tabHidden: boolean;
}

export const defaultPrefs: Prefs = {
  reducedMotion: false,
  pointerFine: false,
  isWide: false,
  isDesktop: false,
  tabHidden: false,
};

export const PrefsContext = createContext<Prefs>(defaultPrefs);

export function usePrefs(): Prefs {
  return useContext(PrefsContext);
}
