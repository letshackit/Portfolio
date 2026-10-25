import { useState } from 'react';
import { content } from '../data/content';
import type { Quote } from '../data/content.types';
import { revealProps } from '../lib/reveal';
import { Button } from '../ui/Button';
import { QUOTE_COMPANY } from './companies';

function Caption({ quote }: { readonly quote: Quote }) {
  return (
    <figcaption className="quote-card__caption">
      <strong>{quote.author}</strong>
      <span>{quote.attribution}</span>
      <span className="mono-caption">{quote.context}</span>
    </figcaption>
  );
}

function Body({ quote }: { readonly quote: Quote }) {
  return (
    <>
      {quote.bullets ? (
        <ul className="bullets">
          {quote.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      {quote.text.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </>
  );
}

/** Featured card: the pull quote at display size, the full note behind the button (keyboard and aria unchanged). */
export function FeaturedQuote({ quote }: { readonly quote: Quote }) {
  const [open, setOpen] = useState(false);
  const fullId = `quote-${quote.id}-full`;
  return (
    <figure className="quote-card quote-card--featured corner-ticks" {...revealProps('block')}>
      <div className="quote-card__main">
        <span className="quote-card__glyph" aria-hidden="true">
          &ldquo;
        </span>
        <blockquote className="quote-card__text">
          {quote.pull ? <p className="quote-card__pull">{quote.pull}</p> : null}
          <div id={fullId} hidden={quote.pull ? !open : false} className="quote-card__full">
            <Body quote={quote} />
          </div>
        </blockquote>
        {quote.pull ? (
          <Button variant="secondary" onClick={() => setOpen((v) => !v)} expanded={open} controls={fullId}>
            {content.recognition.readFullLabel}
          </Button>
        ) : null}
      </div>
      <div className="quote-card__aside">
        <p className="quote-card__giant" aria-hidden="true">
          {QUOTE_COMPANY[quote.id] ?? quote.attribution}
        </p>
        <Caption quote={quote} />
      </div>
    </figure>
  );
}

/** Marquee card: the whole note, as written. Decorative duplicates are aria-hidden by the row, never here. */
export function MarqueeQuote({ quote }: { readonly quote: Quote }) {
  return (
    <figure className="quote-card quote-card--marquee">
      <p className="quote-card__company mono-label" aria-hidden="true">
        {QUOTE_COMPANY[quote.id] ?? quote.attribution}
      </p>
      <blockquote className="quote-card__text">
        <Body quote={quote} />
      </blockquote>
      <Caption quote={quote} />
    </figure>
  );
}
