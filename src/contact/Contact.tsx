import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { usePrefs } from '../app/providers/prefsContext';
import { content } from '../data/content';
import { CopyEmailButton } from '../palette/CopyEmailButton';
import { Button } from '../ui/Button';
import { ExternalLink } from '../ui/ExternalLink';
import { Section } from '../ui/Section';
import { StatusBadge } from '../ui/StatusBadge';
import { contactCopy } from './contactCopy';
import './Contact.css';

/** "https://github.com/letshackit" shown as "github.com/letshackit". */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

/**
 * The headline as words of characters. Each character carries its own slice of the cyan-to-white gradient (--i of --n)
 * so the animation can move characters without breaking background-clip, which Safari drops on transformed children.
 */
function Characters({ text }: { readonly text: string }) {
  const words = text.split(' ');
  const total = text.replace(/ /g, '').length;
  let index = 0;
  return (
    <span className="ct-title__chars" aria-hidden="true">
      {words.map((word, w) => (
        <span className="ct-title__word" key={`${word}-${w}`}>
          {Array.from(word).map((ch, c) => {
            const i = index;
            index += 1;
            return (
              <span className="ct-title__ch" key={`${ch}-${c}`} style={{ '--i': i, '--n': total } as CSSProperties}>
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}

/** Arms a one-shot reveal once the headline scrolls into view. Stays unarmed (fully visible) under reduced motion. */
function useHeadlineReveal() {
  const { reducedMotion } = usePrefs();
  const ref = useRef<HTMLHeadingElement>(null);
  const [state, setState] = useState<'idle' | 'armed' | 'in'>('idle');
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion || typeof IntersectionObserver === 'undefined') return;
    const rect = el.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.85;
    if (alreadyVisible) return;
    setState('armed');
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setState('in');
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);
  return { ref, state };
}

export function Contact() {
  const { contact, ui } = content;
  const nav = content.nav.find((n) => n.anchor === 'contact');
  const { ref, state } = useHeadlineReveal();
  return (
    <Section anchor="contact" className="ct-section">
      <div className="ct-head">
        <p className="ct-eyebrow mono-label">
          <span className="section-heading__rule" aria-hidden="true" />
          {String(content.nav.length + 1).padStart(2, '0')} / {nav?.label ?? contact.heading}
        </p>
        <h2 id="contact-heading" tabIndex={-1} className="ct-title" ref={ref} data-state={state}>
          <span className="visually-hidden">{`${contact.heading}: ${contactCopy.headline}`}</span>
          <Characters text={contactCopy.headline} />
        </h2>
        <p className="ct-lead lead">{contact.lead}</p>
      </div>

      <div className="ct-grid">
        <div className="contact-portrait-slot">{/* PortraitCard mounts here */}</div>

        <div className="ct-panel corner-ticks">
          <StatusBadge variant="live" size="lg">
            {contact.badge}
          </StatusBadge>

          <div className="ct-email-row">
            <p className="mono-label">{ui.contactEmail}</p>
            <div className="ct-email-line">
              <a className="ct-email" href={`mailto:${contact.email}`}>
                {contact.email}
              </a>
              <CopyEmailButton />
            </div>
          </div>

          <div className="ct-actions">
            <ExternalLink href={contact.linkedin} className="btn ct-btn" icon>
              {ui.openLinkedin}
            </ExternalLink>
            <Button variant="primary" className="ct-btn ct-btn--resume" href={contact.resumePath} download={contact.resumeFileName} icon="download">
              {contact.resumeLabel}
            </Button>
            <p className="mono-caption ct-meta">{contact.resumeMeta}</p>
          </div>

          <dl className="ct-readouts">
            <div>
              <dt className="mono-label">{ui.contactPhone}</dt>
              <dd>
                <a href={contact.phoneHref}>{contact.phone}</a>
              </dd>
            </div>
            <div>
              <dt className="mono-label">{ui.contactLocation}</dt>
              <dd>{contact.location}</dd>
            </div>
            <div>
              <dt className="mono-label">{ui.contactLinkedin}</dt>
              <dd>
                <ExternalLink href={contact.linkedin} icon>
                  {displayUrl(contact.linkedin)}
                </ExternalLink>
              </dd>
            </div>
            <div>
              <dt className="mono-label">{ui.contactGithub}</dt>
              <dd>
                <ExternalLink href={contact.github} icon>
                  {displayUrl(contact.github)}
                </ExternalLink>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </Section>
  );
}
