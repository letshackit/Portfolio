import { useCallback, useEffect, useState } from 'react';
import { PrefsProvider } from './app/providers/PrefsProvider';
import { usePrefs } from './app/providers/prefsContext';
import { UiProvider } from './app/providers/UiProvider';
import { Shell } from './app/Shell';
import { BootScreen } from './boot/BootScreen';
import { ANCHORS } from './config';
import { useMotion } from './lib/reveal';
import { hasBooted } from './lib/session';
import { isAnchorId, PAGE_START_ID, scrollToAnchor } from './lib/scroll';

/** Land on the section named by the address, if any (FR-2). */
function landOnHash(): void {
  const id = window.location.hash.slice(1);
  if (isAnchorId(id)) void scrollToAnchor(id, { instant: true, focus: true });
}

/** Starts the hero entrance (architecture B.5): CSS keyframes keyed on [data-entered], motion allowed only. */
function enterHero(): void {
  document.getElementById(ANCHORS.top)?.setAttribute('data-entered', '');
}

/** Boot gate: decided once on first render (architecture E.1). Shell renders beneath the boot. */
function Root() {
  const { reducedMotion } = usePrefs();
  const [booting, setBooting] = useState<boolean>(() => !reducedMotion && !hasBooted());

  // The smoother and reveals wait for the boot: the boot owns scroll locking and the first paint (ADR-008).
  useMotion(!booting);

  const onBootDone = useCallback(() => {
    setBooting(false);
    enterHero();
    document.getElementById(PAGE_START_ID)?.focus({ preventScroll: true });
    landOnHash();
  }, []);

  // Without a boot (reduced motion, or already booted this session) the hash landing runs at mount.
  useEffect(() => {
    if (!booting) landOnHash();
    // Runs once: `booting` is read at mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Shell />
      {booting ? <BootScreen onDone={onBootDone} /> : null}
    </>
  );
}

export function App() {
  return (
    <PrefsProvider>
      <UiProvider>
        <Root />
      </UiProvider>
    </PrefsProvider>
  );
}
