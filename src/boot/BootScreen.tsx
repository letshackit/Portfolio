import { useCallback, useEffect, useRef, useState } from 'react';
import { content } from '../data/content';
import { markBooted } from '../lib/session';
import { bootSchedule, FADE_MS, isModifierOnly, TAG_TEXT } from './bootTimeline';
import './BootScreen.css';

type Phase = 'running' | 'ending';

interface BootScreenProps {
  /** Called once the screen has faded out and may unmount. */
  readonly onDone: () => void;
}

/** First-visit boot log (FR-15..FR-23, ADR-008). Ends by timeout, Skip, any key, click or tap. */
export function BootScreen({ onDone }: BootScreenProps) {
  const lines = content.boot;
  const [phase, setPhase] = useState<Phase>('running');
  const [shown, setShown] = useState(1);
  const [resolved, setResolved] = useState(0);
  const [headline, setHeadline] = useState(false);
  const phaseRef = useRef<Phase>('running');
  const timers = useRef<number[]>([]);
  const skipRef = useRef<HTMLButtonElement>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const end = useCallback(() => {
    if (phaseRef.current === 'ending') return;
    phaseRef.current = 'ending';
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [window.setTimeout(() => onDoneRef.current(), FADE_MS)];
    markBooted();
    setPhase('ending');
  }, []);

  useEffect(() => {
    const schedule = bootSchedule(lines.length);
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    schedule.appear.forEach((ms, i) => {
      if (i > 0) at(ms, () => setShown(i + 1));
    });
    schedule.resolve.forEach((ms, i) => at(ms, () => setResolved(i + 1)));
    at(schedule.headline, () => setHeadline(true));
    at(schedule.ending, end);

    document.body.classList.add('is-booting');
    skipRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (isModifierOnly(event.key)) return;
      // Consumed so Space or Enter on the Skip button does not also click or scroll.
      event.preventDefault();
      end();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', end);
    window.addEventListener('touchstart', end, { passive: true });
    return () => {
      for (const id of timers.current) window.clearTimeout(id);
      timers.current = [];
      document.body.classList.remove('is-booting');
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', end);
      window.removeEventListener('touchstart', end);
    };
  }, [lines.length, end]);

  return (
    <div
      className="boot"
      role="dialog"
      aria-modal="true"
      aria-label={content.palette.bootLabel}
      data-phase={phase}
    >
      <div className="container boot__inner">
        <p className="visually-hidden">{content.palette.bootAnnounce}</p>
        <div className="boot__bar">
          <span className="boot__hint mono-caption" aria-hidden="true">
            {content.palette.skipHint}
          </span>
          <button ref={skipRef} type="button" className="btn btn--secondary boot__skip" onClick={end}>
            {content.palette.skip}
          </button>
        </div>
        <ol className="boot__log mono-code" aria-hidden="true">
          {lines.slice(0, shown).map((line, i) => {
            const isResolved = line.tag === 'boot' || i < resolved;
            const tag = isResolved ? line.tag : 'pending';
            const newest = i === shown - 1;
            return (
              <li key={line.id} className="boot__line">
                <span className="boot__tag" data-tag={tag}>
                  {TAG_TEXT[tag]}
                </span>
                <span className="boot__key">{line.key}</span>
                <span className="boot__value">{isResolved ? line.text : null}</span>
                {newest && phase === 'running' ? <span className="boot__cursor" /> : null}
              </li>
            );
          })}
        </ol>
        <div className="boot__echo" data-on={headline || undefined} aria-hidden="true">
          <p className="mono-label">{content.hero.eyebrow}</p>
          <p className="boot__display">{content.hero.headline}</p>
        </div>
      </div>
    </div>
  );
}
