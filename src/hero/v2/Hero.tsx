import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import { usePrefs } from '../../app/providers/prefsContext';
import { ANCHORS, TIMING } from '../../config';
import { hasBooted } from '../../lib/session';
import { useOffscreenPause } from '../../lib/useOffscreenPause';
import { afterFirstPaint } from '../../lib/visibility';
import { supportsWebGL } from '../../lib/webgl';
import { Badge, Caption, Cue, Frame, Headline, RotateHint, StatusBar } from './Hud';
import { rampIntro } from './intro';
import { store } from './store';
import { AgentConsole, DeployPane } from './Terminals';
import { ThreeBoundary } from '../../lib/ThreeBoundary';
import { LAST_TIER, type Tier } from './stage/quality';
import type { HeroStageProps } from './stage/HeroStage';
import './hero.css';

type StageComponent = ComponentType<HeroStageProps>;

const HEADING_ID = `${ANCHORS.top}-heading`;

interface NavigatorWithConnection {
  readonly connection?: { readonly saveData?: boolean };
}

/** The 3D chunk, or a rejection after the load timeout (architecture C.6 step 4). */
function loadStage(): Promise<StageComponent> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('3D chunk timed out')), TIMING.threeLoadTimeout);
  });
  const load = import('./stage/HeroStage').then((m) => m.default);
  return Promise.race([load, timeout]).finally(() => window.clearTimeout(timer));
}

/** `?quality=high|mid|low` pins the stage at one of its three tiers (QA, and screenshots on software GL). */
function pinnedQuality(search: string): Tier | null {
  const value = new URLSearchParams(search).get('quality');
  return value === 'high' ? 0 : value === 'mid' ? 1 : value === 'low' ? LAST_TIER : null;
}

/**
 * The hero: one 100vh stage and one scroll beat. Everything a visitor can read is DOM that renders at once; the 3D
 * stage (avatar, service city, drones, satellites) is a lazy chunk that fades in over a static poster in the same
 * box, so nothing moves when it arrives. Without WebGL, with save-data, or if the chunk fails, the poster and HUD stay.
 *
 * `?quality=high|mid|low` is a QA switch: it pins the tier, never adapts, and accepts a software GL renderer, so
 * screenshots on a machine without a GPU show the intended look.
 */
export function Hero() {
  const { reducedMotion, isWide } = usePrefs();
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const paused = useOffscreenPause(stageRef);
  const quality = useMemo(() => pinnedQuality(window.location.search), []);

  // Boot gate, decided like App's: with no boot the page has "entered" at once, otherwise when App marks the section.
  const [entered, setEntered] = useState<boolean>(() => reducedMotion || hasBooted());
  const [Stage, setStage] = useState<StageComponent | null>(null);
  const [failed, setFailed] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const [ready, setReady] = useState(false);

  const saveData = (navigator as Navigator & NavigatorWithConnection).connection?.saveData === true;
  const settled = failed || noGl || saveData;

  useEffect(() => {
    store.reduced = reducedMotion;
  }, [reducedMotion]);

  // Whether the boot is about to lift: App stamps data-warm on this section a little before the fade, so the canvas can
  // mount behind it, and data-entered when the fade begins (it owns the boot screen).
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (entered || !el) return;
    const read = () => {
      if (el.hasAttribute('data-warm')) setWarm(true);
      if (el.hasAttribute('data-entered')) setEntered(true);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(el, { attributes: true, attributeFilter: ['data-warm', 'data-entered'] });
    return () => observer.disconnect();
  }, [entered]);

  // Fetch the 3D chunk behind the boot, after first paint; the glb and hdr are preloaded from index.html.
  useEffect(() => {
    if (saveData) return;
    let cancelled = false;
    const cancelPaint = afterFirstPaint(() => {
      if (!supportsWebGL(quality !== null)) {
        setNoGl(true);
        return;
      }
      loadStage()
        .then((component) => {
          if (!cancelled) setStage(() => component);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    });
    return () => {
      cancelled = true;
      cancelPaint();
    };
  }, [saveData, quality]);

  // The first drag or arrow-key turn fades the "drag to rotate" hint for good.
  const [turned, setTurned] = useState<boolean>(() => store.interacted);
  useEffect(() => {
    store.onInteract = () => setTurned(true);
    return () => {
      store.onInteract = null;
    };
  }, []);

  // Left / Right turn the avatar while the stage region itself has focus (links inside it keep their own keys).
  const onStageKey = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    store.keyTurn += e.key === 'ArrowRight' ? 1 : -1;
    store.wake?.();
  }, []);

  // Cursor drives the camera parallax and the head tracking.
  useEffect(() => {
    if (reducedMotion) return;
    const move = (e: PointerEvent) => {
      store.px = (e.clientX / window.innerWidth) * 2 - 1;
      store.py = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const leave = () => {
      store.px = 0;
      store.py = 0;
    };
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
      store.px = 0;
      store.py = 0;
    };
  }, [reducedMotion]);

  // Lights on once he is standing there and the boot has lifted; reduced motion gets the lit scene straight away.
  useEffect(() => {
    if (!ready || !entered) return;
    if (reducedMotion) {
      store.intro = 1;
      return;
    }
    return rampIntro(1400);
  }, [ready, entered, reducedMotion]);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);

  const mount = Stage !== null && (entered || warm) && !settled;
  const stageState = !mount ? 'off' : ready ? 'ready' : 'loading';
  const live = mount && ready && !reducedMotion;
  const terminal = { instant: reducedMotion, active: entered, paused };

  return (
    <section
      ref={rootRef}
      id={ANCHORS.top}
      className="hv2"
      aria-labelledby={HEADING_ID}
      data-stage={stageState}
      data-live={live ? '' : undefined}
      data-entered={entered ? '' : undefined}
    >
      <div
        className="hv2__stage"
        ref={stageRef}
        {...(mount && ready
          ? { tabIndex: 0, role: 'group', 'aria-label': 'Interactive 3D avatar. Use the left and right arrow keys to rotate.', onKeyDown: onStageKey }
          : {})}
      >
        <div className="hv2__poster" aria-hidden="true" />
        <div className="hv2__canvas" aria-hidden="true">
          {mount && Stage ? (
            <ThreeBoundary onError={onFail}>
              <Stage
                key={reducedMotion ? 'still' : 'live'}
                paused={paused}
                reduced={reducedMotion}
                pin={quality}
                onReady={onReady}
                onLost={onFail}
              />
            </ThreeBoundary>
          ) : null}
        </div>
        <div className="hv2__scrim" aria-hidden="true" />
        <div className="hv2__veil" aria-hidden="true" />
        <div className="hv2__hud">
          <Frame />
          <Headline headingId={HEADING_ID} />
          <Badge />
          <AgentConsole {...terminal} rows={isWide ? 6 : 4} />
          <DeployPane {...terminal} />
          <Caption />
          <Cue />
          <RotateHint show={live || (mount && ready)} done={turned} />
          <StatusBar live={mount && ready} scene={live} settled={settled} paused={paused} />
        </div>
      </div>
    </section>
  );
}
