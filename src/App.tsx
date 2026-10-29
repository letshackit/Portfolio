import { useCallback, useEffect, useRef, useState } from 'react';
import { PrefsProvider } from './app/providers/PrefsProvider';
import { usePrefs } from './app/providers/prefsContext';
import { UiProvider } from './app/providers/UiProvider';
import { Shell } from './app/Shell';
import { BootScreen } from './boot/BootScreen';
import { ANCHORS, type AnchorId } from './config';
import { useMotion } from './lib/reveal';
import { hasBooted } from './lib/session';
import { isAnchorId, PAGE_START_ID, scrollToAnchor } from './lib/scroll';

/**
 * The section named by the address the visitor arrived with, if any (FR-2). Read once, at load: an address the page
 * wrote itself after a header click is never a landing request, so it can never pull the viewport later.
 */
const ARRIVAL_ID: AnchorId | null = (() => {
  const id = window.location.hash.slice(1);
  return isAnchorId(id) ? id : null;
})();

/** Pins make the browser's own scroll restoration unreliable (it restores before they exist): a reload starts at the top. */
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

/** Scroll distance from where a landing ended past which the visitor is taken to have moved the page themselves. */
const MOVED_TOLERANCE_PX = 48;

/** Land on the section named by the arrival address, if any. Resolves with the scroll position it ended at. */
async function landOnHash(): Promise<number | null> {
  if (!ARRIVAL_ID) return null;
  await scrollToAnchor(ARRIVAL_ID, { instant: true, focus: true });
  return window.scrollY;
}

/** How long after mount a hash landing may be redone while the page is still settling (pins, fonts, images). */
const RELAND_WINDOW_MS = 15000;

/** Starts the hero entrance (architecture B.5): CSS keyframes keyed on [data-entered], motion allowed only. */
function enterHero(): void {
  document.getElementById(ANCHORS.top)?.setAttribute('data-entered', '');
}

/** A little before the boot lifts: the hero may start mounting its 3D stage, so the portrait is there when it fades. */
function warmHero(): void {
  document.getElementById(ANCHORS.top)?.setAttribute('data-warm', '');
}

/** Boot gate: decided once on first render (architecture E.1). Shell renders beneath the boot. */
function Root() {
  const { reducedMotion } = usePrefs();
  const [booting, setBooting] = useState<boolean>(() => !reducedMotion && !hasBooted());

  // A landing on the arrival address, made before the pins and fonts settled, ends up in the wrong place once they do.
  // Until the visitor moves the page themselves (any input, or any scroll away from where the landing ended) or the
  // window closes, each ScrollTrigger refresh lands on that address again, silently. Only that address: header, menu
  // and palette jumps run their own correction inside scrollToAnchor, and free scrolling is never touched.
  const relandUntil = useRef(0);
  const landedAt = useRef<number | null>(null);
  const visitorScrolled = useRef(false);
  useEffect(() => {
    // Only input after the boot counts: the click or key that skips the boot is not a scroll.
    if (booting) return;
    const mark = () => {
      visitorScrolled.current = true;
    };
    // Scrolling on from a landing also retires the address: left in place it would send a reload back to the old spot.
    const markScroll = () => {
      mark();
      if (window.location.hash) {
        try {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch {
          // Sandboxed contexts may refuse; the address is cosmetic.
        }
      }
    };
    const scrolling = ['wheel', 'touchstart', 'keydown'] as const;
    for (const name of scrolling) window.addEventListener(name, markScroll, { passive: true });
    window.addEventListener('pointerdown', mark, { passive: true });
    return () => {
      for (const name of scrolling) window.removeEventListener(name, markScroll);
      window.removeEventListener('pointerdown', mark);
    };
  }, [booting]);
  const land = useCallback(() => {
    relandUntil.current = Date.now() + RELAND_WINDOW_MS;
    landedAt.current = null;
    void landOnHash().then((y) => {
      landedAt.current = y;
    });
  }, []);
  const reland = useCallback(() => {
    if (!ARRIVAL_ID || visitorScrolled.current || Date.now() > relandUntil.current) return;
    const at = landedAt.current;
    // Still landing, or the page has been moved by something other than us: leave it alone.
    if (at === null) return;
    if (Math.abs(window.scrollY - at) > MOVED_TOLERANCE_PX) {
      visitorScrolled.current = true;
      return;
    }
    landedAt.current = null;
    void scrollToAnchor(ARRIVAL_ID, { instant: true }).then(() => {
      landedAt.current = window.scrollY;
    });
  }, []);

  // The smoother and reveals wait for the boot: the boot owns scroll locking and the first paint (ADR-008).
  useMotion(!booting, reland);

  const onBootDone = useCallback(() => {
    setBooting(false);
    document.getElementById(PAGE_START_ID)?.focus({ preventScroll: true });
    land();
  }, [land]);

  // Without a boot (reduced motion, or already booted this session) the hash landing runs at mount.
  useEffect(() => {
    if (!booting) land();
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
