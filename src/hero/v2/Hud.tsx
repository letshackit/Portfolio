import { useEffect, useState, type CSSProperties } from 'react';
import { ANCHORS } from '../../config';
import { content } from '../../data/content';
import { onAnchorClick } from '../../lib/scroll';
import { ExternalLink } from '../../ui/ExternalLink';
import { AGENT_COUNT, CAPTION, EYEBROW, firstName, lastName, SERVICE_COUNT, TAGLINE_A, TAGLINE_B } from './copy';
import { store } from './store';

/** The headline name is split into characters in markup, so the entrance can slide them up by CSS with no script. */
function Chars({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span className="hv2__ch" style={{ '--i': i + offset } as CSSProperties} key={i}>
          {ch}
        </span>
      ))}
    </>
  );
}

/** Eyebrow, the name, and the one line that says what he is. The name is the only h1. */
export function Headline({ headingId }: { headingId: string }) {
  const { hero, contact } = content;
  return (
    <div className="hv2__copy">
      <p className="hv2__eyebrow">
        <i className="hv2__dot hv2__dot--amber" aria-hidden="true" />
        {EYEBROW}
      </p>
      <h1 id={headingId} className="hv2__name">
        <span className="visually-hidden">{content.meta.name}</span>
        <span className="hv2__word" aria-hidden="true">
          <Chars text={firstName} />
        </span>
        <span className="hv2__word hv2__word--last" aria-hidden="true">
          <Chars text={lastName} offset={firstName.length} />
        </span>
      </h1>
      <p className="hv2__tag">
        <span>{TAGLINE_A}</span>
        <span>{TAGLINE_B}</span>
      </p>
      <div className="hv2__cta">
        <a className="hv2__btn" href={`#${ANCHORS.deployments}`} onClick={onAnchorClick}>
          {hero.primaryCta} <span aria-hidden="true">↓</span>
        </a>
        <a className="hv2__btn" href={contact.resumePath} download={contact.resumeFileName}>
          {hero.secondaryCta}
        </a>
      </div>
      <p className="visually-hidden">
        {hero.headline} {hero.subline}
      </p>
    </div>
  );
}

/** Hairline frame with corner ticks, edge rulers and registration marks. Pure decoration. */
export function Frame() {
  return (
    <div className="hv2__frame" aria-hidden="true">
      <i className="hv2__tick hv2__tick--tl" />
      <i className="hv2__tick hv2__tick--tr" />
      <i className="hv2__tick hv2__tick--bl" />
      <i className="hv2__tick hv2__tick--br" />
      <i className="hv2__ruler hv2__ruler--l" />
      <i className="hv2__ruler hv2__ruler--r" />
      <i className="hv2__reg hv2__reg--l" />
      <i className="hv2__reg hv2__reg--r" />
    </div>
  );
}

/** Operator ID: the owner's cut-out portrait in the brand duotone, a cyan ring and an amber live dot. */
export function Badge() {
  const { meta, contact } = content;
  return (
    <aside className="hv2__badge" aria-label="Operator ID">
      <i className="hv2__tick hv2__tick--tl" aria-hidden="true" />
      <i className="hv2__tick hv2__tick--br" aria-hidden="true" />
      <div className="hv2__badge-photo">
        <img src="/hero/harshal-badge.webp" alt={`Portrait of ${meta.name}`} width={320} height={320} decoding="async" />
        <i className="hv2__badge-live" aria-hidden="true" />
      </div>
      <div className="hv2__badge-meta">
        <span>OPERATOR ID</span>
        <b>{meta.name.toUpperCase()}</b>
        <span>
          {meta.currentRole.toUpperCase()} <i className="hv2__sep" aria-hidden="true" /> {meta.employer.toUpperCase()}
        </span>
        <span className="hv2__badge-links">
          <a href={contact.resumePath} download={contact.resumeFileName}>
            RÉSUMÉ
          </a>
          <ExternalLink href={contact.linkedin}>LINKEDIN</ExternalLink>
        </span>
      </div>
    </aside>
  );
}

/** Strip that fades in over the scroll beat. Real DOM, visible to assistive tech, hidden visually until the beat. */
export function Caption() {
  return <p className="hv2__caption">{CAPTION}</p>;
}

export function Cue() {
  return (
    <div className="hv2__cue" aria-hidden="true">
      <span>SCROLL</span>
      <i className="hv2__cue-line" />
    </div>
  );
}

/** Mono hint under the avatar's feet; fades for good after the first drag or arrow-key turn. */
export function TiltHint({ show, done }: { show: boolean; done: boolean }) {
  return (
    <div className="hv2__hint" aria-hidden="true">
      <span className="hv2__hint-text" data-show={show && !done ? '' : undefined}>
        MOVE TO TILT <b>◇</b>
      </span>
    </div>
  );
}

function Clock({ paused }: { paused: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [paused]);
  return <>{now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false })} IST</>;
}

const pad = (n: number, width: number) => String(n).padStart(width, '0');

interface StatusBarProps {
  /** The scene is on screen: the block counter follows it. */
  readonly live: boolean;
  /** The scene is moving (drones docking, packets crossing): the DOCKS and PACKETS counters mean something. */
  readonly scene: boolean;
  /** No scene will run (no WebGL, failed, reduced motion with it still): show the finished state. */
  readonly settled: boolean;
  readonly paused: boolean;
}

/**
 * Bottom status bar. A's identity cells merged with B's live counters: while the scene runs the numbers are read from
 * it, otherwise they show the finished city (18 of 18) and the scene-only counters stay hidden. Every cell keeps
 * its width either way, so nothing shifts when the scene arrives.
 */
export function StatusBar({ live, scene, settled, paused }: StatusBarProps) {
  const { meta, hero } = content;
  const [counts, setCounts] = useState({ assembled: 0, docks: 0, packets: 0 });

  useEffect(() => {
    if (!live || paused) return;
    const id = window.setInterval(() => {
      setCounts((prev) =>
        prev.assembled === store.assembled && prev.docks === store.docks && prev.packets === store.packets
          ? prev
          : { assembled: store.assembled, docks: store.docks, packets: store.packets },
      );
    }, 160);
    return () => window.clearInterval(id);
  }, [live, paused]);

  const built = settled ? SERVICE_COUNT : counts.assembled;
  // Cumulative scene counters stay invisible (width kept) until the scene has produced a value, so they never read as broken.
  const idleDocks = !scene || counts.docks === 0;
  const idlePackets = !scene || counts.packets === 0;
  const team = hero.strip.find((s) => s.id === 'team');

  return (
    <div className="hv2__bar" role="group" aria-label="Live status">
      <span className="hv2__cell hv2__cell--live">
        <i className="hv2__dot hv2__dot--amber" aria-hidden="true" />
        LIVE
      </span>
      <span className="hv2__cell">
        <em>DEPLOYED</em>
        <b>{meta.employer}</b>
      </span>
      <span className="hv2__cell">
        <em>BLOCKS</em>
        <b>
          {pad(built, 2)}/{SERVICE_COUNT}
        </b>
      </span>
      <span className="hv2__cell hv2__cell--mid">
        <em>AGENTS</em>
        <b>{pad(AGENT_COUNT, 2)}</b>
      </span>
      <span className="hv2__cell hv2__cell--mid" data-idle={idleDocks || undefined} aria-hidden={idleDocks || undefined}>
        <em>DOCKS</em>
        <b>{pad(counts.docks, 3)}</b>
      </span>
      <span className="hv2__cell hv2__cell--mid" data-idle={idlePackets || undefined} aria-hidden={idlePackets || undefined}>
        <em>PACKETS</em>
        <b>{pad(counts.packets, 4)}</b>
      </span>
      {team ? (
        <span className="hv2__cell hv2__cell--wide">
          <em>TEAM</em>
          <b>{team.value}</b>
        </span>
      ) : null}
      <span className="hv2__cell hv2__cell--end">
        <span className="hv2__cell--wide">{meta.location.toUpperCase()}</span>
        <i className="hv2__sep hv2__cell--wide" aria-hidden="true" />
        <Clock paused={paused} />
      </span>
    </div>
  );
}
