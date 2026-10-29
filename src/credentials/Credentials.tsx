import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { TIMING } from '../config';
import { content } from '../data/content';
import type { Credential } from '../data/content.types';
import { revealProps } from '../lib/reveal';
import { ThreeBoundary } from '../lib/ThreeBoundary';
import { useOffscreenPause } from '../lib/useOffscreenPause';
import { supportsWebGL } from '../lib/webgl';
import { ExternalLink } from '../ui/ExternalLink';
import { Section } from '../ui/Section';
import { SectionIntro } from '../ui/SectionIntro';
import { specFor, type BadgeSpec } from './slots';
import { LAST_TIER, type Tier } from './stage/quality';
import type { CredentialsStageProps } from './stage/CredentialsStage';
import { createVaultStore, type VaultStore } from './vaultStore';
import './Credentials.css';

type StageComponent = ComponentType<CredentialsStageProps>;

/** How early before the vault scrolls into view its 3D layer starts loading. */
const NEAR_MARGIN = '900px 0px';
/** Share of the vault that must be on screen before the badges make their entrance. */
const ENTRANCE_RATIO = 0.14;

function loadStage(): Promise<StageComponent> {
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('3D chunk timed out')), TIMING.threeLoadTimeout);
  });
  const load = import('./stage/CredentialsStage').then((m) => m.default);
  return Promise.race([load, timeout]).finally(() => window.clearTimeout(timer));
}

/** `?quality=high|mid|low` pins the tier (QA, and screenshots), like the hero. */
function pinnedQuality(search: string): Tier | null {
  const value = new URLSearchParams(search).get('quality');
  return value === 'high' ? 0 : value === 'mid' ? 1 : value === 'low' ? LAST_TIER : null;
}

interface NavigatorWithConnection {
  readonly connection?: { readonly saveData?: boolean };
}

interface CardProps {
  readonly credential: Credential;
  readonly spec: BadgeSpec;
  readonly store: VaultStore;
  readonly className: string;
  readonly tag?: string;
  readonly pinned: boolean;
  readonly onPin: (id: string) => void;
  readonly children?: ReactNode;
}

/** One credential: an empty slot the 3D layer fills (with a CSS stand-in under it until it does), and its words. */
function Card({ credential, spec, store, className, tag, pinned, onPin, children }: CardProps) {
  const { id, title, issuer, dates } = credential;
  const { ui } = content;
  const slot = useCallback((el: HTMLDivElement | null) => store.register(id, el), [store, id]);
  const enter = () => {
    store.hover = id;
  };
  const leave = () => {
    if (store.hover === id) store.hover = null;
  };
  return (
    <li className={`cred ${className}`} data-kind={spec.kind} data-metal={spec.metal} data-pinned={pinned || undefined} onPointerEnter={enter} onPointerLeave={leave}>
      <div className="cred__stage">
        <div className="cred__slot" ref={slot} aria-hidden="true">
          <span className="cred__poster">
            <span className="cred__poster-top">{spec.top}</span>
            <span className="cred__poster-main">{spec.word}</span>
            {spec.sub ? <span className="cred__poster-sub">{spec.sub}</span> : null}
          </span>
        </div>
        <button
          type="button"
          className="cred__spot"
          aria-pressed={pinned}
          aria-label={`${ui.spotlightLabel}: ${title}`}
          onClick={() => onPin(id)}
          onFocus={enter}
          onBlur={leave}
        />
      </div>
      <div className="cred__text">
        {tag ? <p className="cred__tag mono-label">{tag}</p> : null}
        <h4 className="cred__title">{title}</h4>
        <p className="cred__issuer">{issuer}</p>
        {dates ? <p className="cred__dates">{dates}</p> : null}
        {children}
      </div>
    </li>
  );
}

/**
 * Education and certifications as a gallery. The words are DOM (readable with no script and no WebGL); the objects (a
 * holographic glass slab per credential, the institution's wordmark lit on its face) are drawn in one lazy canvas
 * behind them, each placed in its card's slot. The 390 px layout is its own grid with the same objects in it. Reduced
 * motion draws the same objects, still.
 */
export function Credentials() {
  const { education } = content.history;
  const { ui } = content;
  const { reducedMotion } = usePrefs();
  const rootRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const store = useMemo(createVaultStore, []);
  const paused = useOffscreenPause(rootRef);
  const quality = useMemo(() => pinnedQuality(window.location.search), []);
  const saveData = (navigator as Navigator & NavigatorWithConnection).connection?.saveData === true;

  const [near, setNear] = useState(false);
  const [Stage, setStage] = useState<StageComponent | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const [pinned, setPinned] = useState<string | null>(null);
  const pin = useCallback((id: string) => setPinned((current) => (current === id ? null : id)), []);
  useEffect(() => {
    store.pinned = pinned;
  }, [store, pinned]);

  const specs = useMemo(() => {
    const all = [...education.degrees, ...education.certifications].map((c) => specFor(c.id, c.issuer, c.title));
    all.push(specFor(education.publication.id, education.publication.venue, education.publication.title));
    return all;
  }, [education]);
  const spec = useCallback((id: string) => specs.find((s) => s.id === id) ?? specFor(id, ''), [specs]);

  useEffect(() => {
    // Slots are measured against the canvas's own box, which is wider than the vault (full bleed).
    store.container = fxRef.current;
    return () => {
      store.container = null;
    };
  }, [store]);

  // Near the viewport: start loading the 3D layer. On screen: let the badges make their entrance.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      store.inView = true;
      return;
    }
    const nearIo = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setNear(true);
    }, { rootMargin: NEAR_MARGIN });
    const viewIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) store.inView = e.isIntersecting;
      },
      { threshold: [0, ENTRANCE_RATIO] },
    );
    nearIo.observe(el);
    viewIo.observe(el);
    return () => {
      nearIo.disconnect();
      viewIo.disconnect();
    };
  }, [store]);

  useEffect(() => {
    if (!near || saveData || Stage || failed) return;
    if (!supportsWebGL(quality !== null)) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    loadStage()
      .then((component) => {
        if (!cancelled) setStage(() => component);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [near, saveData, Stage, failed, quality]);

  // The cursor leans the badges toward it, and the camera drifts a little.
  useEffect(() => {
    if (reducedMotion) return;
    const move = (e: PointerEvent) => {
      const c = store.container;
      if (!c) return;
      const r = c.getBoundingClientRect();
      store.pointer.x = e.clientX - r.left;
      store.pointer.y = e.clientY - r.top;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [store, reducedMotion]);

  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => setFailed(true), []);
  const mount = Stage !== null && !failed && !saveData;
  const state = !mount ? 'off' : ready ? 'ready' : 'loading';

  return (
    <Section anchor="credentials" className="cred-section">
      <SectionIntro anchor="credentials" heading={education.heading} size="md" />
      <div ref={rootRef} className="vault" data-stage={state} {...revealProps('block')}>
        <div className="vault__fx" ref={fxRef} aria-hidden="true">
          {mount && Stage ? (
            <ThreeBoundary onError={onFail}>
              <Stage
                key={reducedMotion ? 'still' : 'live'}
                specs={specs}
                store={store}
                paused={paused}
                reduced={reducedMotion}
                pin={quality}
                onReady={onReady}
                onLost={onFail}
              />
            </ThreeBoundary>
          ) : null}
        </div>

        <div className="vault__body">
          <div className="vault__monuments">
            <section className="vault__group vault__group--degrees" aria-labelledby="vault-degrees">
              <h3 id="vault-degrees" className="visually-hidden">
                {ui.degreesHeading}
              </h3>
              <ul className="vault__degrees">
                {education.degrees.map((d, i) => (
                  <Card
                    key={d.id}
                    credential={d}
                    spec={spec(d.id)}
                    store={store}
                    className={i === 0 ? 'cred--hero' : 'cred--stone'}
                    tag={i === 0 ? ui.flagshipTag : ui.degreeTag}
                    pinned={pinned === d.id}
                    onPin={pin}
                  />
                ))}
              </ul>
            </section>

            <section className="vault__group vault__group--pub" aria-labelledby="vault-pub">
              <h3 id="vault-pub" className="visually-hidden">
                {education.publicationHeading}
              </h3>
              <ul className="vault__pubs">
                <Card
                  credential={{ id: education.publication.id, title: education.publication.title, issuer: education.publication.venue }}
                  spec={spec(education.publication.id)}
                  store={store}
                  className="cred--paper"
                  tag={education.publicationHeading}
                  pinned={pinned === education.publication.id}
                  onPin={pin}
                >
                  <ExternalLink href={education.publication.url} className="cred__link" icon>
                    {ui.journalLabel}
                  </ExternalLink>
                </Card>
              </ul>
            </section>
          </div>

          <section className="vault__group vault__group--certs" aria-labelledby="vault-certs">
            <h3 id="vault-certs" className="vault__label mono-label">
              {education.certificationsHeading}
            </h3>
            <ul className="vault__certs">
              {education.certifications.map((c) => (
                <Card key={c.id} credential={c} spec={spec(c.id)} store={store} className="cred--cert" pinned={pinned === c.id} onPin={pin} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </Section>
  );
}
