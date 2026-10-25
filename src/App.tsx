import { useCallback, useEffect, useRef, useState } from 'react';
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

/** How long after mount a hash landing may be redone while the page is still settling (pins, fonts, images). */
const RELAND_WINDOW_MS = 15000;

/** Starts the hero entrance (architecture B.5): CSS keyframes keyed on [data-entered], motion allowed only. */
function enterHero(): void {
  document.getElementById(ANCHORS.top)?.setAttribute('data-entered', '');
}

/** A little before the boot lifts: the hero may start mounting its 3D stage, so the avatar is there when it fades. */
function warmHero(): void {
  document.getElementById(ANCHORS.top)?.setAttribute('data-warm', '');
}

/** Boot gate: decided once on first render (architecture E.1). Shell renders beneath the boot. */
function Root() {
  const { reducedMotion } = usePrefs();
  const [booting, setBooting] = useState<boolean>(() => !reducedMotion && !hasBooted());

  // A hash landing made before the pins and fonts settled ends up in the wrong place once they do. Until the visitor
  // scrolls on their own (or the window closes), each ScrollTrigger refresh lands on the hash again, silently.
  const relandUntil = useRef(0);
  const visitorScrolled = useRef(false);
  useEffect(() => {
    // Only input after the boot counts: the click or key that skips the boot is not a scroll.
    if (booting) return;
    const mark = () => {
      visitorScrolled.current = true;
    };
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    for (const name of events) window.addEventListener(name, mark, { passive: true });
    return () => {
      for (const name of events) window.removeEventListener(name, mark);
    };
  }, [booting]);
  const reland = useCallback(() => {
    if (visitorScrolled.current || Date.now() > relandUntil.current) return;
    const id = window.location.hash.slice(1);
    if (isAnchorId(id)) void scrollToAnchor(id, { instant: true });
  }, []);

  // The smoother and reveals wait for the boot: the boot owns scroll locking and the first paint (ADR-008).
  useMotion(!booting, reland);

  const onBootDone = useCallback(() => {
    setBooting(false);
    document.getElementById(PAGE_START_ID)?.focus({ preventScroll: true });
    relandUntil.current = Date.now() + RELAND_WINDOW_MS;
    landOnHash();
  }, []);

  // Without a boot (reduced motion, or already booted this session) the hash landing runs at mount.
  useEffect(() => {
    if (!booting) {
      relandUntil.current = Date.now() + RELAND_WINDOW_MS;
      landOnHash();
    }
    // Runs once: `booting` is read at mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Shell />
      {booting ? <BootScreen onDone={onBootDone} onStage={warmHero} onEnding={enterHero} /> : null}
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
