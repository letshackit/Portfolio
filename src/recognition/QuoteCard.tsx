import { useState } from 'react';
import { content } from '../data/content';
import type { Quote } from '../data/content.types';
import { Button } from '../ui/Button';

/** Text-only quote (FR-108): figure, blockquote, figcaption. Pull-quote notes expand to the full text. */
export function QuoteCard({ quote }: { readonly quote: Quote }) {
  const [open, setOpen] = useState(false);
  const fullId = `quote-${quote.id}-full`;
  const collapsible = quote.pull !== undefined;

  return (
    <figure className="quote-card" data-wide={collapsible || undefined}>
      <span className="quote-card__glyph" aria-hidden="true">
        &ldquo;
      </span>
      <blockquote className="quote-card__text">
        {collapsible ? (
          <>
            <p>{quote.pull}</p>
            <div id={fullId} hidden={!open} className="quote-card__full">
              {quote.text.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </>
        ) : (
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
        )}
      </blockquote>
      {collapsible ? (
        <Button variant="secondary" onClick={() => setOpen((v) => !v)} expanded={open} controls={fullId}>
          {content.recognition.readFullLabel}
        </Button>
      ) : null}
      <figcaption className="quote-card__caption">
        <strong>{quote.author}</strong>
        <span>{quote.attribution}</span>
        <span className="mono-caption">{quote.context}</span>
      </figcaption>
    </figure>
  );
}
